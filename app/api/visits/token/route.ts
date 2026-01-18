import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { randomBytes } from "crypto";

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 토큰 유효 시간 (초)
const TOKEN_TTL_SECONDS = 60;

/**
 * POST /api/visits/token
 * 1회성 QR 토큰 생성 (상담사 전용)
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

    // 1. 인증 확인
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "로그인이 필요합니다" },
        { status: 401 }
      );
    }

    // 2. 상담사 권한 확인
    const { data: profile } = await adminSupabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "agent" && profile?.role !== "admin") {
      return NextResponse.json(
        { error: "상담사 권한이 필요합니다" },
        { status: 403 }
      );
    }

    // 3. 요청 바디 파싱
    const body = await req.json();
    const { propertyId, consultationId } = body;
    console.log("토큰 생성 요청:", { propertyId, consultationId });

    if (!propertyId) {
      return NextResponse.json(
        { error: "propertyId가 필요합니다" },
        { status: 400 }
      );
    }

    // 4. 해당 property에 소속된 상담사인지 확인 (선택적)
    const { data: propertyAgent } = await adminSupabase
      .from("property_agents")
      .select("id")
      .eq("property_id", propertyId)
      .eq("agent_id", user.id)
      .eq("status", "approved")
      .single();

    // admin은 체크 건너뜀
    if (!propertyAgent && profile?.role !== "admin") {
      return NextResponse.json(
        { error: "해당 분양 현장에 소속된 상담사가 아닙니다" },
        { status: 403 }
      );
    }

    // 5. consultation 유효성 확인 (있는 경우)
    if (consultationId) {
      const { data: consultation } = await adminSupabase
        .from("consultations")
        .select("id, agent_id, status, scheduled_at")
        .eq("id", consultationId)
        .single();

      if (!consultation) {
        return NextResponse.json(
          { error: "예약을 찾을 수 없습니다" },
          { status: 404 }
        );
      }

      if (consultation.agent_id !== user.id && profile?.role !== "admin") {
        return NextResponse.json(
          { error: "해당 예약의 담당 상담사가 아닙니다" },
          { status: 403 }
        );
      }

      if (consultation.status !== "confirmed") {
        return NextResponse.json(
          { error: "확정된 예약만 방문 인증이 가능합니다" },
          { status: 400 }
        );
      }

      // 예약시간 ±2시간 이내인지 확인
      const scheduledAt = new Date(consultation.scheduled_at);
      const now = new Date();
      const timeDiff = Math.abs(now.getTime() - scheduledAt.getTime());
      const twoHoursMs = 2 * 60 * 60 * 1000;

      if (timeDiff > twoHoursMs) {
        return NextResponse.json(
          { error: "예약 시간 전후 2시간 이내에만 방문 인증이 가능합니다" },
          { status: 400 }
        );
      }
    }

    // 6. 토큰 생성
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + TOKEN_TTL_SECONDS * 1000);

    const { data: visitToken, error: insertError } = await adminSupabase
      .from("visit_tokens")
      .insert({
        token,
        property_id: propertyId,
        agent_id: user.id,
        consultation_id: consultationId || null,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error("토큰 생성 오류:", insertError);
      return NextResponse.json(
        { error: "토큰 생성에 실패했습니다" },
        { status: 500 }
      );
    }

    // 7. 응답
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const visitUrl = `${baseUrl}/visit/${token}`;

    return NextResponse.json({
      success: true,
      token,
      visitUrl,
      expiresAt: expiresAt.toISOString(),
      ttlSeconds: TOKEN_TTL_SECONDS,
    });
  } catch (err: any) {
    console.error("토큰 생성 API 오류:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
