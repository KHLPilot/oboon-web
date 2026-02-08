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
  customer_id: string;
  agent_id: string;
  status: "pending" | "confirmed" | "visited" | "cancelled" | "no_show" | "contracted";
  scheduled_at: string | null;
  cancelled_at: string | null;
  cancelled_by: "customer" | "agent" | "admin" | null;
  no_show_by: "customer" | "agent" | null;
};

type LedgerRow = {
  event_type:
    | "deposit_paid"
    | "deposit_point_granted"
    | "deposit_forfeited"
    | "deposit_refund_paid"
    | "reward_due"
    | "reward_paid";
  amount: number;
  created_at: string;
};

type PayoutRow = {
  type: "reward_payout" | "deposit_refund";
  status: "pending" | "processing" | "done" | "rejected";
  processed_at: string | null;
  amount: number;
  created_at: string;
};

function sumAmounts(rows: LedgerRow[], eventType: LedgerRow["event_type"]) {
  return rows
    .filter((r) => r.event_type === eventType)
    .reduce((acc, r) => acc + Math.abs(r.amount ?? 0), 0);
}

function latestAt(rows: LedgerRow[], eventType: LedgerRow["event_type"]) {
  return rows
    .filter((r) => r.event_type === eventType)
    .sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )[0]?.created_at ?? null;
}

export async function GET(
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

    const [{ data: consultation }, { data: me }] = await Promise.all([
      adminSupabase
        .from("consultations")
        .select(
          "id, customer_id, agent_id, status, scheduled_at, cancelled_at, cancelled_by, no_show_by",
        )
        .eq("id", id)
        .single(),
      adminSupabase.from("profiles").select("role").eq("id", user.id).single(),
    ]);

    if (!consultation) {
      return NextResponse.json({ error: "예약을 찾을 수 없습니다" }, { status: 404 });
    }

    const c = consultation as ConsultationRow;
    const isAdmin = me?.role === "admin";
    const isOwner = c.customer_id === user.id || c.agent_id === user.id;
    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: "접근 권한이 없습니다" }, { status: 403 });
    }

    const [{ data: ledgers }, { data: payouts }] = await Promise.all([
      adminSupabase
        .from("consultation_money_ledger")
        .select("event_type, amount, created_at")
        .eq("consultation_id", c.id)
        .order("created_at", { ascending: false }),
      adminSupabase
        .from("payout_requests")
        .select("type, status, processed_at, amount, created_at")
        .eq("consultation_id", c.id)
        .order("created_at", { ascending: false }),
    ]);

    const ledgerRows = (ledgers || []) as LedgerRow[];
    const payoutRows = (payouts || []) as PayoutRow[];
    const rewardPayoutRows = payoutRows.filter((p) => p.type === "reward_payout");
    const depositRefundRows = payoutRows.filter((p) => p.type === "deposit_refund");

    const depositPaidAmount = sumAmounts(ledgerRows, "deposit_paid");
    const depositPaidAt = latestAt(ledgerRows, "deposit_paid");
    const depositPointGrantedAmount = sumAmounts(ledgerRows, "deposit_point_granted");
    const depositPointGrantedAt = latestAt(ledgerRows, "deposit_point_granted");
    const depositForfeitedAmount = sumAmounts(ledgerRows, "deposit_forfeited");
    const depositRefundPaidAt = latestAt(ledgerRows, "deposit_refund_paid");

    const rewardDueAmount = sumAmounts(ledgerRows, "reward_due");
    const rewardPaidAmount = sumAmounts(ledgerRows, "reward_paid");
    const latestRewardPayout = rewardPayoutRows[0] ?? null;
    const latestDepositRefund = depositRefundRows[0] ?? null;

    const isDepositPaid = depositPaidAmount > 0;

    const cancelledByCustomer =
      c.status === "cancelled" && c.cancelled_by === "customer";
    const cancelledByAgentOrAdmin =
      c.status === "cancelled" &&
      (c.cancelled_by === "agent" || c.cancelled_by === "admin");
    const agentNoShowRefundable = c.status === "no_show" && c.no_show_by === "agent";
    const cancelledRefundableByActor =
      cancelledByAgentOrAdmin || cancelledByCustomer;
    const cancelledRefundableFallback =
      c.status === "cancelled" &&
      c.cancelled_by === null &&
      depositForfeitedAmount <= 0;
    const isRefundEligible =
      cancelledRefundableByActor ||
      cancelledRefundableFallback ||
      agentNoShowRefundable;

    const isCashRefundCase =
      c.status === "cancelled" &&
      (c.cancelled_by === "agent" || c.cancelled_by === "admin");

    const refundablePointAmount = isCashRefundCase
      ? Math.abs(latestDepositRefund?.amount ?? depositPaidAmount)
      : depositPointGrantedAmount > 0
        ? depositPointGrantedAmount
        : isRefundEligible
          ? depositPaidAmount
          : 0;
    const refundCompletedAt = isCashRefundCase
      ? (latestDepositRefund?.status === "done"
          ? latestDepositRefund.processed_at
          : depositRefundPaidAt)
      : depositPointGrantedAt;
    const isRefundCompleted = isCashRefundCase
      ? Boolean(
          (latestDepositRefund && latestDepositRefund.status === "done") ||
            depositRefundPaidAt,
        )
      : Boolean(refundCompletedAt);
    const isRefundPending =
      isRefundEligible &&
      !isRefundCompleted &&
      depositForfeitedAmount <= 0 &&
      depositPaidAmount > 0;
    const isRefundBlocked = depositForfeitedAmount > 0;

    const rewardPayoutPending =
      latestRewardPayout?.status === "pending" || latestRewardPayout?.status === "processing";
    const rewardPayoutDoneAt =
      latestRewardPayout?.status === "done" ? latestRewardPayout.processed_at : null;

    return NextResponse.json({
      consultation_id: c.id,
      deposit_amount: depositPaidAmount,
      is_deposit_paid: isDepositPaid,
      deposit_paid_at: depositPaidAt,
      refund_method: isCashRefundCase ? "cash" : "point",
      point_converted_amount: depositPointGrantedAmount,
      point_converted_at: depositPointGrantedAt,
      refundable_point_amount: refundablePointAmount,
      is_refund_eligible: isRefundEligible,
      is_refund_pending: isRefundPending,
      is_refund_completed: isRefundCompleted,
      refund_completed_at: refundCompletedAt,
      is_refund_blocked: isRefundBlocked,
      reward_due_amount: rewardDueAmount,
      reward_paid_amount: rewardPaidAmount,
      is_reward_payout_pending: rewardPayoutPending,
      reward_payout_done_at: rewardPayoutDoneAt,
    });
  } catch (error: any) {
    console.error("예약 정산 요약 조회 오류:", error);
    return NextResponse.json(
      { error: "정산 요약을 불러오지 못했습니다" },
      { status: 500 },
    );
  }
}
