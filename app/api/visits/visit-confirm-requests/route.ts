import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

const adminSupabase = createSupabaseAdminClient();

const VISIT_REWARD_AMOUNT = 10000;

type ManualRequestRow = {
  id: string;
  status: "pending" | "approved" | "rejected";
  reason: string | null;
  token_id: string;
  customer_id: string;
  agent_id: string;
  property_id: number | null;
  consultation_id: string | null;
};

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
      },
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
    }

    const { data: me } = await adminSupabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    const { searchParams } = new URL(req.url);
    const requestId = searchParams.get("requestId");

    if (requestId) {
      const { data: requestRow } = await adminSupabase
        .from("visit_confirm_requests")
        .select("id, status, customer_id, agent_id, resolved_at, resolved_by")
        .eq("id", requestId)
        .single();

      if (!requestRow) {
        return NextResponse.json({ error: "요청을 찾을 수 없습니다" }, { status: 404 });
      }

      const isAdmin = me?.role === "admin";
      const isOwner =
        requestRow.customer_id === user.id || requestRow.agent_id === user.id;
      if (!isAdmin && !isOwner) {
        return NextResponse.json({ error: "접근 권한이 없습니다" }, { status: 403 });
      }

      return NextResponse.json({ request: requestRow });
    }

    const isAdmin = me?.role === "admin";
    const isAgent = me?.role === "agent";
    if (!isAdmin && !isAgent) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 });
    }

    let query = adminSupabase
      .from("visit_confirm_requests")
      .select(
        `
        id, status, reason, created_at,
        token:visit_tokens(id, property_id, consultation_id, created_at),
        property:properties(id, name),
        consultation:consultations(
          id, scheduled_at,
          customer:profiles!consultations_customer_id_fkey(id, name)
        )
      `,
      )
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (!isAdmin) {
      query = query.eq("agent_id", user.id);
    }

    const { data, error } = await query;
    if (error) {
      console.error("수동 확인 목록 조회 오류:", error);
      return NextResponse.json({ error: "목록 조회 실패" }, { status: 500 });
    }

    return NextResponse.json({ requests: data || [] });
  } catch (error: unknown) {
    console.error("수동 확인 목록 API 오류:", error);
    return NextResponse.json({ error: "목록 조회 실패" }, { status: 500 });
  }
}

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
      },
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
    }

    const { data: me } = await adminSupabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    const isAdmin = me?.role === "admin";
    const isAgent = me?.role === "agent";
    if (!isAdmin && !isAgent) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 });
    }

    const body = await req.json();
    const requestId = body?.requestId as string | undefined;
    const action = body?.action as "approve" | "reject" | undefined;

    if (!requestId || !action) {
      return NextResponse.json({ error: "requestId/action이 필요합니다" }, { status: 400 });
    }

    const { data: requestRow } = await adminSupabase
      .from("visit_confirm_requests")
      .select(
        "id, status, reason, token_id, customer_id, agent_id, property_id, consultation_id",
      )
      .eq("id", requestId)
      .single();

    if (!requestRow) {
      return NextResponse.json({ error: "요청을 찾을 수 없습니다" }, { status: 404 });
    }

    const requestData = requestRow as ManualRequestRow;
    if (requestData.status !== "pending") {
      return NextResponse.json({ error: "이미 처리된 요청입니다" }, { status: 400 });
    }

    if (!isAdmin && requestData.agent_id !== user.id) {
      return NextResponse.json({ error: "처리 권한이 없습니다" }, { status: 403 });
    }

    const nowIso = new Date().toISOString();
    const nextStatus = action === "approve" ? "approved" : "rejected";

    const { error: updateError } = await adminSupabase
      .from("visit_confirm_requests")
      .update({
        status: nextStatus,
        resolved_at: nowIso,
        resolved_by: user.id,
      })
      .eq("id", requestId)
      .eq("status", "pending");

    if (updateError) {
      console.error("수동 요청 상태 업데이트 오류:", updateError);
      return NextResponse.json({ error: "처리 실패" }, { status: 500 });
    }

    if (action === "reject") {
      return NextResponse.json({ success: true });
    }

    if (!requestData.consultation_id || !requestData.property_id) {
      return NextResponse.json({ success: true });
    }

    const { data: consultation } = await adminSupabase
      .from("consultations")
      .select("id, status, visited_at, agent_id, customer_id")
      .eq("id", requestData.consultation_id)
      .single();

    if (!consultation) {
      return NextResponse.json({ success: true });
    }

    if (!(consultation.status === "visited" || consultation.visited_at)) {
      await adminSupabase
        .from("consultations")
        .update({ status: "visited", visited_at: nowIso })
        .eq("id", consultation.id);
    }

    await adminSupabase.from("visit_logs").insert({
      token_id: requestData.token_id,
      property_id: requestData.property_id,
      agent_id: requestData.agent_id,
      consultation_id: requestData.consultation_id,
      customer_id: requestData.customer_id,
      verified_at: nowIso,
      lat: null,
      lng: null,
      accuracy: null,
      method: "manual",
      metadata: {
        reason: requestData.reason,
        source: "manual_approve",
      },
    });

    const { data: existingRewardLedger } = await adminSupabase
      .from("consultation_money_ledger")
      .select("id")
      .eq("consultation_id", consultation.id)
      .eq("event_type", "reward_due")
      .limit(1)
      .maybeSingle();

    if (!existingRewardLedger) {
      await adminSupabase.from("consultation_money_ledger").insert({
        consultation_id: consultation.id,
        event_type: "reward_due",
        bucket: "reward",
        amount: VISIT_REWARD_AMOUNT,
        actor_id: user.id,
        admin_id: isAdmin ? user.id : null,
        note: "manual_visit_verified_reward_due",
      });
    }

    const { data: existingPayout } = await adminSupabase
      .from("payout_requests")
      .select("id")
      .eq("consultation_id", consultation.id)
      .eq("type", "reward_payout")
      .limit(1)
      .maybeSingle();

    if (!existingPayout) {
      await adminSupabase.from("payout_requests").insert({
        consultation_id: consultation.id,
        type: "reward_payout",
        amount: VISIT_REWARD_AMOUNT,
        target_profile_id: consultation.agent_id,
        status: "pending",
      });
    }

    await adminSupabase
      .from("visit_tokens")
      .update({ used_at: nowIso })
      .eq("id", requestData.token_id);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("수동 확인 처리 API 오류:", error);
    return NextResponse.json({ error: "처리 실패" }, { status: 500 });
  }
}
