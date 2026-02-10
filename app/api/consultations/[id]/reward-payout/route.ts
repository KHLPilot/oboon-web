import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

type ConsultationRow = {
  id: string;
  status: "pending" | "confirmed" | "visited" | "cancelled" | "no_show" | "contracted";
  agent_id: string;
};

type LedgerRow = {
  event_type: "reward_due" | "reward_paid";
  amount: number;
};

type PayoutRow = {
  id: string;
  status: "pending" | "processing" | "done" | "rejected";
};

function sumAmounts(rows: LedgerRow[], eventType: LedgerRow["event_type"]) {
  return rows
    .filter((r) => r.event_type === eventType)
    .reduce((acc, r) => acc + Math.abs(r.amount ?? 0), 0);
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

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

    if (me?.role !== "admin") {
      return NextResponse.json({ error: "관리자 권한이 필요합니다" }, { status: 403 });
    }

    const [{ data: consultation }, { data: ledgers }, { data: payoutRow }] =
      await Promise.all([
        adminSupabase
          .from("consultations")
          .select("id, status, agent_id")
          .eq("id", id)
          .single(),
        adminSupabase
          .from("consultation_money_ledger")
          .select("event_type, amount")
          .eq("consultation_id", id)
          .in("event_type", ["reward_due", "reward_paid"]),
        adminSupabase
          .from("payout_requests")
          .select("id, status")
          .eq("consultation_id", id)
          .eq("type", "reward_payout")
          .maybeSingle(),
      ]);

    if (!consultation) {
      return NextResponse.json({ error: "예약을 찾을 수 없습니다" }, { status: 404 });
    }

    const c = consultation as ConsultationRow;
    if (c.status !== "visited" && c.status !== "contracted") {
      return NextResponse.json({ error: "방문 완료 예약만 지급 처리할 수 있습니다" }, { status: 400 });
    }

    const ledgerRows = (ledgers || []) as LedgerRow[];
    const rewardDueAmount = sumAmounts(ledgerRows, "reward_due");
    const rewardPaidAmount = sumAmounts(ledgerRows, "reward_paid");

    if (rewardDueAmount <= 0) {
      return NextResponse.json({ error: "지급 대상 보상금이 없습니다" }, { status: 400 });
    }

    const remainingAmount = rewardDueAmount - rewardPaidAmount;
    if (remainingAmount <= 0) {
      return NextResponse.json({ success: true, already_processed: true });
    }

    const nowIso = new Date().toISOString();
    const existingPayout = (payoutRow || null) as PayoutRow | null;

    if (!existingPayout) {
      const { error: payoutInsertError } = await adminSupabase
        .from("payout_requests")
        .insert({
          consultation_id: c.id,
          type: "reward_payout",
          amount: remainingAmount,
          target_profile_id: c.agent_id,
          status: "done",
          processed_by: user.id,
          processed_at: nowIso,
        });

      if (payoutInsertError) {
        console.error("지급 요청 생성 오류:", payoutInsertError);
        return NextResponse.json({ error: "지급 처리에 실패했습니다" }, { status: 500 });
      }
    } else if (existingPayout.status !== "done") {
      const { error: payoutUpdateError } = await adminSupabase
        .from("payout_requests")
        .update({
          status: "done",
          processed_by: user.id,
          processed_at: nowIso,
        })
        .eq("id", existingPayout.id);

      if (payoutUpdateError) {
        console.error("지급 요청 업데이트 오류:", payoutUpdateError);
        return NextResponse.json({ error: "지급 처리에 실패했습니다" }, { status: 500 });
      }
    }

    const { error: ledgerInsertError } = await adminSupabase
      .from("consultation_money_ledger")
      .insert({
        consultation_id: c.id,
        event_type: "reward_paid",
        bucket: "reward",
        amount: remainingAmount,
        actor_id: user.id,
        admin_id: user.id,
        note: "admin_reward_payout_complete",
      });

    if (ledgerInsertError) {
      console.error("보상 지급 원장 기록 오류:", ledgerInsertError);
      return NextResponse.json({ error: "지급 처리에 실패했습니다" }, { status: 500 });
    }

    return NextResponse.json({ success: true, already_processed: false });
  } catch (error: unknown) {
    console.error("보상 지급 처리 API 오류:", error);
    return NextResponse.json({ error: "지급 처리에 실패했습니다" }, { status: 500 });
  }
}

