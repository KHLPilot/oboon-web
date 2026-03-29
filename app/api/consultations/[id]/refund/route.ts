import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

const adminSupabase = createSupabaseAdminClient();

type ConsultationRow = {
  id: string;
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

type DepositRefundPayoutRow = {
  id: string;
  status: "pending" | "processing" | "done" | "rejected";
  amount: number;
  processed_at: string | null;
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

    const [{ data: consultation }, { data: ledgers }, { data: refundPayout }] =
      await Promise.all([
      adminSupabase
        .from("consultations")
        .select("id, status, scheduled_at, cancelled_at, cancelled_by, no_show_by")
        .eq("id", id)
        .single(),
      adminSupabase
        .from("consultation_money_ledger")
        .select("event_type, amount, created_at")
        .eq("consultation_id", id)
        .order("created_at", { ascending: false }),
      adminSupabase
        .from("payout_requests")
        .select("id, status, amount, processed_at")
        .eq("consultation_id", id)
        .eq("type", "deposit_refund")
        .maybeSingle(),
    ]);

    if (!consultation) {
      return NextResponse.json({ error: "예약을 찾을 수 없습니다" }, { status: 404 });
    }

    const c = consultation as ConsultationRow;
    const ledgerRows = (ledgers || []) as LedgerRow[];

    const depositPaidAmount = sumAmounts(ledgerRows, "deposit_paid");
    const depositPointGrantedAmount = sumAmounts(ledgerRows, "deposit_point_granted");
    const depositForfeitedAmount = sumAmounts(ledgerRows, "deposit_forfeited");
    const depositRefundPaidAmount = sumAmounts(ledgerRows, "deposit_refund_paid");
    const latestRefundPayout = (refundPayout || null) as DepositRefundPayoutRow | null;

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

    if (!isRefundEligible) {
      return NextResponse.json({ error: "환급 대상 예약이 아닙니다" }, { status: 400 });
    }
    if (depositForfeitedAmount > 0) {
      return NextResponse.json({ error: "이미 환급 불가 처리된 예약입니다" }, { status: 400 });
    }
    if (depositPaidAmount <= 0) {
      return NextResponse.json({ error: "결제된 예약금이 없습니다" }, { status: 400 });
    }
    const isCashRefundCase =
      c.status === "cancelled" &&
      (c.cancelled_by === "agent" || c.cancelled_by === "admin");

    if (isCashRefundCase) {
      if (
        (latestRefundPayout && latestRefundPayout.status === "done") ||
        depositRefundPaidAmount > 0
      ) {
        return NextResponse.json({
          success: true,
          already_processed: true,
        });
      }

      if (!latestRefundPayout) {
        return NextResponse.json({ error: "환급 요청이 생성되지 않았습니다" }, { status: 400 });
      }

      const nowIso = new Date().toISOString();
      const payoutAmount = Math.abs(latestRefundPayout.amount || depositPaidAmount);

      const { error: payoutUpdateError } = await adminSupabase
        .from("payout_requests")
        .update({
          status: "done",
          processed_by: user.id,
          processed_at: nowIso,
        })
        .eq("id", latestRefundPayout.id);

      if (payoutUpdateError) {
        console.error("현금 환급 지급 처리 오류:", payoutUpdateError);
        return NextResponse.json({ error: "환급 처리에 실패했습니다" }, { status: 500 });
      }

      const { error: refundLedgerError } = await adminSupabase
        .from("consultation_money_ledger")
        .insert({
          consultation_id: c.id,
          event_type: "deposit_refund_paid",
          bucket: "deposit",
          amount: payoutAmount,
          actor_id: user.id,
          admin_id: user.id,
          note: "admin_cash_refund_complete",
        });

      if (refundLedgerError) {
        console.error("현금 환급 원장 기록 오류:", refundLedgerError);
        return NextResponse.json({ error: "환급 처리에 실패했습니다" }, { status: 500 });
      }

      const { data: admins } = await adminSupabase
        .from("profiles")
        .select("id")
        .eq("role", "admin");
      if (admins && admins.length > 0) {
        await adminSupabase.from("notifications").insert(
          admins.map((admin) => ({
            recipient_id: admin.id,
            type: "admin_deposit_update",
            title: "예약금 환급 완료",
            message: "상담사/관리자 취소 건의 현금 환급이 완료되었습니다.",
            consultation_id: c.id,
            metadata: { tab: "settlements", reservation_id: c.id },
          })),
        );
      }

      return NextResponse.json({
        success: true,
        already_processed: false,
      });
    }

    if (depositPointGrantedAmount > 0) {
      return NextResponse.json({
        success: true,
        already_processed: true,
      });
    }

    const { error: insertError } = await adminSupabase
      .from("consultation_money_ledger")
      .insert({
        consultation_id: c.id,
        event_type: "deposit_point_granted",
        bucket: "point",
        amount: depositPaidAmount,
        actor_id: user.id,
        admin_id: user.id,
        note: "admin_refund_complete",
      });

    if (insertError) {
      console.error("환급 처리 원장 기록 오류:", insertError);
      return NextResponse.json({ error: "환급 처리에 실패했습니다" }, { status: 500 });
    }

    const { data: admins } = await adminSupabase
      .from("profiles")
      .select("id")
      .eq("role", "admin");
    if (admins && admins.length > 0) {
      await adminSupabase.from("notifications").insert(
        admins.map((admin) => ({
          recipient_id: admin.id,
          type: "admin_deposit_update",
          title: "예약금 포인트 전환 완료",
          message: "고객 환급 대상 예약금이 포인트로 전환되었습니다.",
          consultation_id: c.id,
          metadata: { tab: "settlements", reservation_id: c.id },
        })),
      );
    }

    return NextResponse.json({
      success: true,
      already_processed: false,
    });
  } catch (error: unknown) {
    console.error("환급 처리 API 오류:", error);
    return NextResponse.json({ error: "환급 처리에 실패했습니다" }, { status: 500 });
  }
}
