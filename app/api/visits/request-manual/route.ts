import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 수동 확인 요청 허용 시간 (토큰 생성 후 10분 이내)
const MANUAL_REQUEST_TTL_MINUTES = 10;

/**
 * POST /api/visits/request-manual
 * 수동 확인 요청 (GPS 실패 시 고객이 요청)
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

    // 1. 현재 사용자 확인 (선택적)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // 2. 요청 바디 파싱
    const body = await req.json();
    const { token, reason } = body;

    if (!token) {
      return NextResponse.json(
        { error: "토큰이 필요합니다" },
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
        { error: "유효하지 않은 토큰입니다" },
        { status: 404 }
      );
    }

    // 4. 토큰 사용 여부 확인
    if (visitToken.used_at) {
      return NextResponse.json(
        { error: "이미 사용된 토큰입니다" },
        { status: 400 }
      );
    }

    // 5. 토큰 생성 후 10분 이내인지 확인 (수동 요청은 더 긴 시간 허용)
    const createdAt = new Date(visitToken.created_at);
    const now = new Date();
    const timeDiffMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);

    if (timeDiffMinutes > MANUAL_REQUEST_TTL_MINUTES) {
      return NextResponse.json(
        { error: `토큰 생성 후 ${MANUAL_REQUEST_TTL_MINUTES}분이 지나 수동 확인 요청이 불가합니다. 상담사에게 새 QR 코드를 요청하세요.` },
        { status: 400 }
      );
    }

    // 6. 이미 pending 요청이 있는지 확인
    const { data: existingRequest } = await adminSupabase
      .from("visit_confirm_requests")
      .select("id, status")
      .eq("token_id", visitToken.id)
      .eq("status", "pending")
      .single();

    if (existingRequest) {
      return NextResponse.json(
        { error: "이미 확인 요청이 진행 중입니다. 상담사의 승인을 기다려주세요." },
        { status: 400 }
      );
    }

    // 7. 수동 확인 요청 생성
    const { data: request, error: insertError } = await adminSupabase
      .from("visit_confirm_requests")
      .insert({
        token_id: visitToken.id,
        property_id: visitToken.property_id,
        agent_id: visitToken.agent_id,
        consultation_id: visitToken.consultation_id || null,
        customer_id: user?.id || null,
        status: "pending",
        reason: reason || "GPS 인증 실패",
      })
      .select()
      .single();

    if (insertError) {
      console.error("수동 확인 요청 생성 오류:", insertError);
      return NextResponse.json(
        { error: "요청 생성에 실패했습니다" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "상담사에게 확인 요청을 보냈습니다. 잠시만 기다려주세요.",
      requestId: request.id,
    });
  } catch (err: any) {
    console.error("수동 확인 요청 API 오류:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/visits/request-manual
 * 수동 확인 요청 상태 조회 (폴링용)
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const requestId = searchParams.get("requestId");
    const token = searchParams.get("token");

    if (!requestId && !token) {
      return NextResponse.json(
        { error: "requestId 또는 token이 필요합니다" },
        { status: 400 }
      );
    }

    let query = adminSupabase
      .from("visit_confirm_requests")
      .select("id, status, resolved_at");

    if (requestId) {
      query = query.eq("id", requestId);
    } else if (token) {
      // 토큰으로 token_id를 찾아서 조회
      const { data: visitToken } = await adminSupabase
        .from("visit_tokens")
        .select("id")
        .eq("token", token)
        .single();

      if (!visitToken) {
        return NextResponse.json(
          { error: "유효하지 않은 토큰입니다" },
          { status: 404 }
        );
      }

      query = query.eq("token_id", visitToken.id);
    }

    const { data: request, error } = await query.single();

    if (error || !request) {
      return NextResponse.json(
        { error: "요청을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      request: {
        id: request.id,
        status: request.status,
        resolved_at: request.resolved_at,
      },
    });
  } catch (err: any) {
    console.error("요청 상태 조회 오류:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
