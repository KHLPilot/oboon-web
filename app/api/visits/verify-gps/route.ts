import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { calculateDistance } from "@/lib/utils/geo";
import { randomUUID } from "crypto";

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
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options);
              });
            } catch {
              // 읽기 전용 컨텍스트에서는 무시
            }
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

    // 10. 상담사 확인 요청 생성 (GPS 성공이어도 상담사 확인 필요)
    const nowIso = new Date().toISOString();
    const { data: existingPending } = await adminSupabase
      .from("visit_confirm_requests")
      .select("id")
      .eq("consultation_id", consultation.id)
      .eq("customer_id", user.id)
      .eq("status", "pending")
      .limit(1)
      .maybeSingle();

    let requestId = existingPending?.id ?? null;

    if (!requestId) {
      const tokenValue = `gps_${randomUUID().replace(/-/g, "")}`;
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      const { data: token, error: tokenError } = await adminSupabase
        .from("visit_tokens")
        .insert({
          token: tokenValue,
          property_id: consultation.property_id,
          agent_id: consultation.agent_id,
          consultation_id: consultation.id,
          expires_at: expiresAt,
        })
        .select("id")
        .single();

      if (tokenError || !token) {
        console.error("방문 확인 토큰 생성 오류:", tokenError);
        return NextResponse.json(
          { error: "요청 생성에 실패했습니다", code: ERROR_CODES.SERVER_ERROR },
          { status: 500 },
        );
      }

      const { data: requestRow, error: requestError } = await adminSupabase
        .from("visit_confirm_requests")
        .insert({
          token_id: token.id,
          customer_id: consultation.customer_id,
          agent_id: consultation.agent_id,
          property_id: consultation.property_id,
          consultation_id: consultation.id,
          reason: `GPS 도착 인증 완료 (거리: ${Math.round(distance)}m, 정확도: ${Math.round(accuracy || 0)}m)`,
          status: "pending",
        })
        .select("id")
        .single();

      if (requestError || !requestRow) {
        console.error("방문 확인 요청 생성 오류:", requestError);
        return NextResponse.json(
          { error: "요청 생성에 실패했습니다", code: ERROR_CODES.SERVER_ERROR },
          { status: 500 },
        );
      }

      requestId = requestRow.id;
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
        visit_confirm_request_id: requestId,
      },
    });

    if (notificationError) {
      console.error("알림 생성 오류:", notificationError);
    }

    return NextResponse.json({
      success: true,
      message: "도착 인증 요청이 전송되었습니다. 상담사 확인 후 방문 완료 처리됩니다.",
      requestId,
      pendingApproval: true,
      requested_at: nowIso,
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
