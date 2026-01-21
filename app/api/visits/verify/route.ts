import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { calculateDistance } from "@/lib/utils/geo";

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 설정값
const ALLOWED_RADIUS_METERS = 150; // 허용 반경 (미터)
const MAX_ACCURACY_METERS = 150; // 최대 허용 정확도 (미터)

// 에러 코드
const ERROR_CODES = {
  TOKEN_NOT_FOUND: "TOKEN_NOT_FOUND",
  TOKEN_EXPIRED: "TOKEN_EXPIRED",
  TOKEN_ALREADY_USED: "TOKEN_ALREADY_USED",
  LOCATION_REQUIRED: "LOCATION_REQUIRED",
  ACCURACY_TOO_LOW: "ACCURACY_TOO_LOW",
  OUT_OF_RANGE: "OUT_OF_RANGE",
  PROPERTY_LOCATION_NOT_FOUND: "PROPERTY_LOCATION_NOT_FOUND",
  RESERVATION_TIME_INVALID: "RESERVATION_TIME_INVALID",
  SERVER_ERROR: "SERVER_ERROR",
} as const;

/**
 * POST /api/visits/verify
 * GPS 기반 방문 인증
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

    // 1. 현재 사용자 확인 (선택적 - 비로그인도 가능하게 할 수 있음)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // 2. 요청 바디 파싱
    const body = await req.json();
    const { token, lat, lng, accuracy } = body;

    if (!token) {
      return NextResponse.json(
        { error: "토큰이 필요합니다", code: ERROR_CODES.TOKEN_NOT_FOUND },
        { status: 400 }
      );
    }

    if (lat === undefined || lng === undefined) {
      return NextResponse.json(
        { error: "위치 정보가 필요합니다", code: ERROR_CODES.LOCATION_REQUIRED },
        { status: 400 }
      );
    }

    // 3. 토큰 조회
    const { data: visitToken, error: tokenError } = await adminSupabase
      .from("visit_tokens")
      .select("*")
      .eq("token", token)
      .single();

    if (tokenError || !visitToken) {
      return NextResponse.json(
        { error: "유효하지 않은 토큰입니다", code: ERROR_CODES.TOKEN_NOT_FOUND },
        { status: 404 }
      );
    }

    // 4. 토큰 만료 확인
    if (new Date(visitToken.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "토큰이 만료되었습니다", code: ERROR_CODES.TOKEN_EXPIRED },
        { status: 400 }
      );
    }

    // 5. 토큰 사용 여부 확인
    if (visitToken.used_at) {
      return NextResponse.json(
        { error: "이미 사용된 토큰입니다", code: ERROR_CODES.TOKEN_ALREADY_USED },
        { status: 400 }
      );
    }

    // 6. GPS 정확도 확인
    if (accuracy && accuracy > MAX_ACCURACY_METERS) {
      return NextResponse.json(
        {
          error: `GPS 정확도가 너무 낮습니다 (${Math.round(accuracy)}m). 다시 시도하거나 상담사 확인을 요청하세요.`,
          code: ERROR_CODES.ACCURACY_TOO_LOW,
          accuracy: Math.round(accuracy),
        },
        { status: 400 }
      );
    }

    // 7. 모델하우스 위치 조회 (property_facilities에서 MODELHOUSE 타입)
    const { data: facilities, error: facilityError } = await adminSupabase
      .from("property_facilities")
      .select("lat, lng")
      .eq("property_id", visitToken.property_id)
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

    // 8. 거리 계산 및 확인
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

    // 9. 예약 시간대 확인 (consultation이 있는 경우)
    if (visitToken.consultation_id) {
      const { data: consultation } = await adminSupabase
        .from("consultations")
        .select("scheduled_at")
        .eq("id", visitToken.consultation_id)
        .single();

      if (consultation) {
        const scheduledAt = new Date(consultation.scheduled_at);
        const now = new Date();
        const timeDiff = Math.abs(now.getTime() - scheduledAt.getTime());
        const twoHoursMs = 2 * 60 * 60 * 1000;

        if (timeDiff > twoHoursMs) {
          return NextResponse.json(
            {
              error: "예약 시간 전후 2시간 이내에만 방문 인증이 가능합니다",
              code: ERROR_CODES.RESERVATION_TIME_INVALID,
            },
            { status: 400 }
          );
        }
      }
    }

    // 10. 트랜잭션: visit_logs 기록 + token used 처리 + consultation 상태 업데이트
    const now = new Date().toISOString();

    // visit_logs 기록
    const { error: logError } = await adminSupabase.from("visit_logs").insert({
      token_id: visitToken.id,
      property_id: visitToken.property_id,
      agent_id: visitToken.agent_id,
      consultation_id: visitToken.consultation_id,
      customer_id: user?.id || null,
      verified_at: now,
      lat,
      lng,
      accuracy: accuracy || null,
      method: "gps",
      metadata: {
        userAgent: req.headers.get("user-agent"),
        distance: Math.round(distance),
      },
    });

    if (logError) {
      console.error("방문 로그 기록 오류:", logError);
      return NextResponse.json(
        { error: "방문 기록 저장에 실패했습니다", code: ERROR_CODES.SERVER_ERROR },
        { status: 500 }
      );
    }

    // token used 처리
    const { error: tokenUpdateError } = await adminSupabase
      .from("visit_tokens")
      .update({ used_at: now })
      .eq("id", visitToken.id);

    if (tokenUpdateError) {
      console.error("토큰 업데이트 오류:", tokenUpdateError);
    }

    // consultation 상태를 visited로 변경 (있는 경우)
    if (visitToken.consultation_id) {
      const { error: consultationError } = await adminSupabase
        .from("consultations")
        .update({ status: "visited", visited_at: now })
        .eq("id", visitToken.consultation_id);

      if (consultationError) {
        console.error("예약 상태 업데이트 오류:", consultationError);
      }
    }

    // 11. 성공 응답
    return NextResponse.json({
      success: true,
      message: "방문 인증이 완료되었습니다",
      verified_at: now,
      distance: Math.round(distance),
    });
  } catch (err: any) {
    console.error("방문 인증 API 오류:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다", code: ERROR_CODES.SERVER_ERROR },
      { status: 500 }
    );
  }
}
