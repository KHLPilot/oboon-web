import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 수동 승인 허용 시간 (토큰 생성 후 30분 이내)
const MANUAL_APPROVE_TTL_MINUTES = 30;

/**
 * POST /api/visits/manual-approve
 * 상담사가 수동으로 방문 확인 승인
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
    const { requestId, action } = body; // action: 'approve' | 'reject'

    if (!requestId) {
      return NextResponse.json(
        { error: "requestId가 필요합니다" },
        { status: 400 }
      );
    }

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "action은 'approve' 또는 'reject'여야 합니다" },
        { status: 400 }
      );
    }

    // 4. 요청 조회
    const { data: request, error: requestError } = await adminSupabase
      .from("visit_confirm_requests")
      .select("*, token:visit_tokens!token_id(*)")
      .eq("id", requestId)
      .single();

    if (requestError || !request) {
      return NextResponse.json(
        { error: "요청을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // 5. 상담사 권한 확인 (자신의 요청만 처리 가능)
    if (request.agent_id !== user.id && profile?.role !== "admin") {
      return NextResponse.json(
        { error: "해당 요청을 처리할 권한이 없습니다" },
        { status: 403 }
      );
    }

    // 6. 이미 처리된 요청인지 확인
    if (request.status !== "pending") {
      return NextResponse.json(
        { error: "이미 처리된 요청입니다" },
        { status: 400 }
      );
    }

    // 7. 토큰 유효성 확인
    const visitToken = request.token;
    if (visitToken.used_at) {
      return NextResponse.json(
        { error: "이미 사용된 토큰입니다" },
        { status: 400 }
      );
    }

    // 토큰 생성 후 30분 이내인지 확인
    const createdAt = new Date(visitToken.created_at);
    const now = new Date();
    const timeDiffMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);

    if (timeDiffMinutes > MANUAL_APPROVE_TTL_MINUTES) {
      // 요청을 rejected로 업데이트
      await adminSupabase
        .from("visit_confirm_requests")
        .update({
          status: "rejected",
          resolved_at: now.toISOString(),
          resolved_by: user.id,
        })
        .eq("id", requestId);

      return NextResponse.json(
        { error: `토큰 생성 후 ${MANUAL_APPROVE_TTL_MINUTES}분이 지나 승인이 불가합니다` },
        { status: 400 }
      );
    }

    const nowIso = now.toISOString();

    if (action === "reject") {
      // 8a. 거절 처리
      await adminSupabase
        .from("visit_confirm_requests")
        .update({
          status: "rejected",
          resolved_at: nowIso,
          resolved_by: user.id,
        })
        .eq("id", requestId);

      return NextResponse.json({
        success: true,
        message: "요청이 거절되었습니다",
      });
    }

    // 8b. 승인 처리

    // visit_logs 기록
    const { error: logError } = await adminSupabase.from("visit_logs").insert({
      token_id: visitToken.id,
      property_id: visitToken.property_id,
      agent_id: visitToken.agent_id,
      consultation_id: visitToken.consultation_id,
      customer_id: request.customer_id,
      verified_at: nowIso,
      method: "manual",
      metadata: {
        approved_by: user.id,
        request_id: requestId,
        reason: request.reason,
      },
    });

    if (logError) {
      console.error("방문 로그 기록 오류:", logError);
      return NextResponse.json(
        { error: "방문 기록 저장에 실패했습니다" },
        { status: 500 }
      );
    }

    // token used 처리
    await adminSupabase
      .from("visit_tokens")
      .update({ used_at: nowIso })
      .eq("id", visitToken.id);

    // 요청 상태 업데이트
    await adminSupabase
      .from("visit_confirm_requests")
      .update({
        status: "approved",
        resolved_at: nowIso,
        resolved_by: user.id,
      })
      .eq("id", requestId);

    // consultation 상태를 visited로 변경 (있는 경우)
    if (visitToken.consultation_id) {
      const { error: consultationError } = await adminSupabase
        .from("consultations")
        .update({ status: "visited", visited_at: nowIso })
        .eq("id", visitToken.consultation_id);

      if (consultationError) {
        console.error("예약 상태 업데이트 오류:", consultationError);
      }
    }

    return NextResponse.json({
      success: true,
      message: "방문 확인이 승인되었습니다",
      verified_at: nowIso,
    });
  } catch (err: any) {
    console.error("수동 승인 API 오류:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/visits/manual-approve
 * 상담사의 대기 중인 수동 확인 요청 목록 조회
 */
export async function GET(req: Request) {
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

    // 3. 대기 중인 요청 조회
    let query = adminSupabase
      .from("visit_confirm_requests")
      .select(`
        id,
        status,
        reason,
        created_at,
        token:visit_tokens(id, property_id, consultation_id, created_at),
        property:properties(id, name),
        consultation:consultations(id, scheduled_at, customer:profiles!customer_id(id, name))
      `)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    // admin이 아니면 자신의 요청만 조회
    if (profile?.role !== "admin") {
      query = query.eq("agent_id", user.id);
    }

    const { data: requests, error } = await query;

    if (error) {
      console.error("요청 목록 조회 오류:", error);
      return NextResponse.json(
        { error: "요청 목록 조회에 실패했습니다" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      requests: requests || [],
    });
  } catch (err: any) {
    console.error("요청 목록 조회 오류:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
