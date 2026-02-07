import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { calculateDistance } from "@/lib/utils/geo";

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ALLOWED_RADIUS_METERS = 150;
const MAX_ACCURACY_METERS = 150;
const RESERVATION_WINDOW_MS = 2 * 60 * 60 * 1000; // ±2시간

const ERROR_CODES = {
  NOT_AUTHENTICATED: "NOT_AUTHENTICATED",
  CONSULTATION_NOT_FOUND: "CONSULTATION_NOT_FOUND",
  INVALID_STATUS: "INVALID_STATUS",
  ALREADY_VISITED: "ALREADY_VISITED",
  RESERVATION_TIME_INVALID: "RESERVATION_TIME_INVALID",
  LOCATION_REQUIRED: "LOCATION_REQUIRED",
  ACCURACY_TOO_LOW: "ACCURACY_TOO_LOW",
  PROPERTY_LOCATION_NOT_FOUND: "PROPERTY_LOCATION_NOT_FOUND",
  OUT_OF_RANGE: "OUT_OF_RANGE",
  SERVER_ERROR: "SERVER_ERROR",
} as const;

/**
 * POST /api/visits/verify-gps
 * QR 토큰 없이 consultationId + GPS 좌표로 직접 방문 인증
 */
export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
        },
      }
    );

    // 1. 사용자 인증 확인
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "로그인이 필요합니다", code: ERROR_CODES.NOT_AUTHENTICATED },
        { status: 401 }
      );
    }

    // 2. 요청 바디 파싱
    const body = await req.json();
    const { consultationId, lat, lng, accuracy } = body;

    if (!consultationId) {
      return NextResponse.json(
        { error: "상담 예약 정보가 필요합니다", code: ERROR_CODES.CONSULTATION_NOT_FOUND },
        { status: 400 }
      );
    }

    if (lat === undefined || lng === undefined) {
      return NextResponse.json(
        { error: "위치 정보가 필요합니다", code: ERROR_CODES.LOCATION_REQUIRED },
        { status: 400 }
      );
    }

    // 3. consultation 조회 (고객 이름, 현장 이름 포함)
    const { data: consultation, error: consultationError } = await adminSupabase
      .from("consultations")
      .select("id, status, scheduled_at, customer_id, agent_id, property_id, visited_at, customer:profiles!consultations_customer_id_fkey(name), property:properties!consultations_property_id_fkey(name)")
      .eq("id", consultationId)
      .single();

    if (consultationError || !consultation) {
      return NextResponse.json(
        { error: "예약 정보를 찾을 수 없습니다", code: ERROR_CODES.CONSULTATION_NOT_FOUND },
        { status: 404 }
      );
    }

    // 4. 본인 예약인지 확인
    if (consultation.customer_id !== user.id) {
      return NextResponse.json(
        { error: "본인의 예약만 인증할 수 있습니다", code: ERROR_CODES.CONSULTATION_NOT_FOUND },
        { status: 403 }
      );
    }

    // 5. 상태 확인
    if (consultation.status === "visited" || consultation.visited_at) {
      return NextResponse.json(
        { error: "이미 방문 인증이 완료된 예약입니다", code: ERROR_CODES.ALREADY_VISITED },
        { status: 400 }
      );
    }

    if (consultation.status !== "confirmed") {
      return NextResponse.json(
        { error: "확정된 예약만 방문 인증이 가능합니다", code: ERROR_CODES.INVALID_STATUS },
        { status: 400 }
      );
    }

    // 6. 예약 시간 ±2시간 확인
    const scheduledAt = new Date(consultation.scheduled_at);
    const now = new Date();
    const timeDiff = Math.abs(now.getTime() - scheduledAt.getTime());

    if (timeDiff > RESERVATION_WINDOW_MS) {
      return NextResponse.json(
        {
          error: "예약 시간 전후 2시간 이내에만 방문 인증이 가능합니다",
          code: ERROR_CODES.RESERVATION_TIME_INVALID,
        },
        { status: 400 }
      );
    }

    // 7. GPS 정확도 확인
    if (accuracy && accuracy > MAX_ACCURACY_METERS) {
      return NextResponse.json(
        {
          error: `GPS 정확도가 너무 낮습니다 (${Math.round(accuracy)}m). 외부로 이동 후 다시 시도해주세요.`,
          code: ERROR_CODES.ACCURACY_TOO_LOW,
          accuracy: Math.round(accuracy),
        },
        { status: 400 }
      );
    }

    // 8. 모델하우스 위치 조회
    const { data: facilities, error: facilityError } = await adminSupabase
      .from("property_facilities")
      .select("lat, lng")
      .eq("property_id", consultation.property_id)
      .eq("type", "MODELHOUSE")
      .eq("is_active", true)
      .limit(1);

    const modelHouse = facilities?.[0];

    if (facilityError || !modelHouse || !modelHouse.lat || !modelHouse.lng) {
      return NextResponse.json(
        {
          error: "모델하우스 위치 정보를 찾을 수 없습니다",
          code: ERROR_CODES.PROPERTY_LOCATION_NOT_FOUND,
        },
        { status: 404 }
      );
    }

    // 9. 거리 계산
    const distance = calculateDistance(
      lat,
      lng,
      Number(modelHouse.lat),
      Number(modelHouse.lng)
    );

    if (distance > ALLOWED_RADIUS_METERS) {
      return NextResponse.json(
        {
          error: `모델하우스로부터 너무 멀리 있습니다 (${Math.round(distance)}m). ${ALLOWED_RADIUS_METERS}m 이내에서 다시 시도하세요.`,
          code: ERROR_CODES.OUT_OF_RANGE,
          distance: Math.round(distance),
          allowedRadius: ALLOWED_RADIUS_METERS,
        },
        { status: 400 }
      );
    }

    // 10. visit_logs 기록 + consultation 상태 업데이트
    const nowIso = new Date().toISOString();

    const { error: logError } = await adminSupabase.from("visit_logs").insert({
      token_id: null,
      property_id: consultation.property_id,
      agent_id: consultation.agent_id,
      consultation_id: consultation.id,
      customer_id: user.id,
      verified_at: nowIso,
      lat,
      lng,
      accuracy: accuracy || null,
      method: "gps",
      metadata: {
        userAgent: req.headers.get("user-agent"),
        distance: Math.round(distance),
        type: "direct_gps",
      },
    });

    if (logError) {
      console.error("방문 로그 기록 오류:", logError);
      return NextResponse.json(
        { error: "방문 기록 저장에 실패했습니다", code: ERROR_CODES.SERVER_ERROR },
        { status: 500 }
      );
    }

    const { error: updateError } = await adminSupabase
      .from("consultations")
      .update({ status: "visited", visited_at: nowIso })
      .eq("id", consultation.id);

    if (updateError) {
      console.error("예약 상태 업데이트 오류:", updateError);
    }

    // 11. 상담사에게 도착 알림 전송
    const customerName = (consultation.customer as unknown as { name: string } | null)?.name || "고객";
    const propertyName = (consultation.property as unknown as { name: string } | null)?.name || "현장";

    const { error: notificationError } = await adminSupabase.from("notifications").insert({
      recipient_id: consultation.agent_id,
      type: "customer_arrival",
      title: "고객 도착",
      message: `${customerName}님이 ${propertyName}에 도착했습니다`,
      consultation_id: consultation.id,
      metadata: {
        customer_id: user.id,
        property_id: consultation.property_id,
        distance: Math.round(distance),
      },
    });

    if (notificationError) {
      console.error("알림 생성 오류:", notificationError);
    }

    return NextResponse.json({
      success: true,
      message: "방문 인증이 완료되었습니다",
      verified_at: nowIso,
      distance: Math.round(distance),
    });
  } catch (err: unknown) {
    console.error("GPS 방문 인증 API 오류:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다", code: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
