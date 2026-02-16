import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export const dynamic = "force-dynamic";

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

type ConsultationRow = {
  id: string;
  status: string;
  created_at: string;
  scheduled_at: string;
  cancelled_at: string | null;
  cancelled_by: "customer" | "agent" | "admin" | null;
  no_show_by: "customer" | "agent" | null;
  customer_id: string;
  agent_id: string;
  property_id: number;
  customer_profile?: Array<{
    id: string;
    name: string | null;
    nickname: string | null;
    avatar_url: string | null;
  }> | null;
  agent_profile?: Array<{
    id: string;
    name: string | null;
    nickname: string | null;
    avatar_url: string | null;
  }> | null;
};

type LedgerRow = {
  consultation_id: string;
  event_type: string;
  bucket: string;
  amount: number;
  created_at: string;
  note: string | null;
};

type PayoutRow = {
  consultation_id: string;
  type: "reward_payout" | "deposit_refund";
  status: "pending" | "processing" | "done" | "rejected";
  amount: number;
  created_at: string;
};

type PropertyRow = {
  id: number;
  name: string;
  image_url: string | null;
};

type PublicProfileRow = {
  id: string;
  nickname: string | null;
  avatar_url: string | null;
};

type ProfileRow = {
  id: string;
  name: string | null;
  nickname: string | null;
  avatar_url: string | null;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_account_holder: string | null;
};

function toLocalDateTime(iso: string) {
  return new Date(iso).toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export async function GET() {
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
      return NextResponse.json(
        { error: "로그인이 필요합니다" },
        { status: 401 },
      );
    }

    const { data: profile } = await adminSupabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json(
        { error: "관리자 권한이 필요합니다" },
        { status: 403 },
      );
    }

    const [{ data: consultations }, { data: ledgers }, { data: payouts }] =
      await Promise.all([
        adminSupabase
          .from("consultations")
          .select(
            `
            id,
            status,
            created_at,
            scheduled_at,
            cancelled_at,
            cancelled_by,
            no_show_by,
            customer_id,
            agent_id,
            property_id,
            customer_profile:profiles!consultations_customer_id_fkey(id, name, nickname, avatar_url),
            agent_profile:profiles!consultations_agent_id_fkey(id, name, nickname, avatar_url)
            `,
          )
          .order("scheduled_at", { ascending: false })
          .limit(120),
        adminSupabase
          .from("consultation_money_ledger")
          .select("consultation_id, event_type, bucket, amount, created_at, note")
          .order("created_at", { ascending: false })
          .limit(500),
        adminSupabase
          .from("payout_requests")
          .select("consultation_id, type, status, amount, created_at")
          .order("created_at", { ascending: false })
          .limit(300),
      ]);

    const consultationRows = (consultations || []) as ConsultationRow[];
    const ledgerRows = (ledgers || []) as LedgerRow[];
    const payoutRows = (payouts || []) as PayoutRow[];
    const propertyIds = Array.from(
      new Set(consultationRows.map((c) => c.property_id).filter(Boolean)),
    );
    const profileIds = Array.from(
      new Set(
        consultationRows.flatMap((c) => [c.customer_id, c.agent_id]).filter(Boolean),
      ),
    );

    const [{ data: properties }, { data: publicProfiles }, { data: profiles }] =
      await Promise.all([
      propertyIds.length
        ? adminSupabase
            .from("properties")
            .select("id, name, image_url")
            .in("id", propertyIds)
        : Promise.resolve({ data: [] as PropertyRow[] }),
      profileIds.length
        ? adminSupabase
            .from("public_profiles")
            .select("id, nickname, avatar_url")
            .in("id", profileIds)
        : Promise.resolve({ data: [] as PublicProfileRow[] }),
      profileIds.length
        ? adminSupabase
            .from("profiles")
            .select("id, name, nickname, avatar_url, bank_name, bank_account_number, bank_account_holder")
            .in("id", profileIds)
        : Promise.resolve({ data: [] as ProfileRow[] }),
    ]);

    const propertiesMap = new Map(
      ((properties || []) as PropertyRow[]).map((p) => [p.id, p]),
    );
    const publicProfilesMap = new Map(
      ((publicProfiles || []) as PublicProfileRow[]).map((p) => [p.id, p]),
    );
    const profilesMap = new Map(
      ((profiles || []) as ProfileRow[]).map((p) => [p.id, p]),
    );

    const latestDepositEventByConsultation = new Map<string, LedgerRow>();
    const latestDepositDecisionByConsultation = new Map<string, LedgerRow>();
    for (const row of ledgerRows) {
      if (
        row.event_type === "deposit_paid" &&
        !latestDepositEventByConsultation.has(row.consultation_id)
      ) {
        latestDepositEventByConsultation.set(row.consultation_id, row);
      }
      if (
        (row.event_type === "deposit_point_granted" ||
          row.event_type === "deposit_forfeited") &&
        !latestDepositDecisionByConsultation.has(row.consultation_id)
      ) {
        latestDepositDecisionByConsultation.set(row.consultation_id, row);
      }
    }

    const latestRewardPayoutByConsultation = new Map<string, PayoutRow>();
    const latestRefundPayoutByConsultation = new Map<string, PayoutRow>();
    for (const row of payoutRows) {
      if (
        row.type === "reward_payout" &&
        !latestRewardPayoutByConsultation.has(row.consultation_id)
      ) {
        latestRewardPayoutByConsultation.set(row.consultation_id, row);
      }
      if (
        row.type === "deposit_refund" &&
        !latestRefundPayoutByConsultation.has(row.consultation_id)
      ) {
        latestRefundPayoutByConsultation.set(row.consultation_id, row);
      }
    }

    const rewardPendingCount = payoutRows.filter(
      (r) =>
        r.type === "reward_payout" &&
        (r.status === "pending" || r.status === "processing"),
    ).length;

    const refundPendingCount = consultationRows.filter((c) => {
      if (c.status !== "cancelled") return false;
      const decisionEvent = latestDepositDecisionByConsultation.get(c.id);
      const refundPayout = latestRefundPayoutByConsultation.get(c.id);
      if (c.cancelled_by === "agent" || c.cancelled_by === "admin") {
        return !refundPayout || refundPayout.status !== "done";
      }
      return !decisionEvent;
    }).length;

    const noShowPendingCount = consultationRows.filter(
      (c) => c.status === "no_show" && !c.no_show_by,
    ).length;

    const settlementRows = consultationRows
      .map((c) => {
        const depositEvent = latestDepositEventByConsultation.get(c.id);
        const decisionEvent = latestDepositDecisionByConsultation.get(c.id);
        const rewardPayout = latestRewardPayoutByConsultation.get(c.id);
        const refundPayout = latestRefundPayoutByConsultation.get(c.id);

        let depositLabel = "-";
        let depositTone: "primary" | "success" | "warning" | "danger" | "muted" = "muted";
        if (decisionEvent?.event_type === "deposit_point_granted") {
          depositLabel = "포인트 전환";
          depositTone = "primary";
        } else if (decisionEvent?.event_type === "deposit_forfeited") {
          depositLabel = "환급 불가";
          depositTone = "danger";
        } else if (refundPayout?.status === "done") {
          depositLabel = "환급 완료";
          depositTone = "primary";
        } else if (
          refundPayout?.status === "pending" ||
          refundPayout?.status === "processing"
        ) {
          depositLabel = "환급 대기";
          depositTone = "warning";
        } else if (c.status === "cancelled") {
          depositLabel = "환급 대기";
          depositTone = "warning";
        } else if (depositEvent?.event_type === "deposit_paid") {
          depositLabel = "결제 완료";
          depositTone = "primary";
        }

        let rewardLabel = "-";
        let rewardTone: "primary" | "success" | "warning" | "danger" | "muted" = "muted";
        if (rewardPayout?.status === "done") {
          rewardLabel = "보상 지급 완료";
          rewardTone = "primary";
        } else if (
          rewardPayout?.status === "pending" ||
          rewardPayout?.status === "processing"
        ) {
          rewardLabel = "보상 지급 대기";
          rewardTone = "primary";
        } else if (rewardPayout?.status === "rejected") {
          rewardLabel = "지급 반려";
          rewardTone = "warning";
        }

        let reason = "정상";
        if (c.status === "cancelled") {
          if (
            c.cancelled_by === "customer" &&
            decisionEvent?.note === "customer_cancel_within_48h"
          ) {
            reason = "고객 취소 (예약일 48시간 이내)";
          } else if (
            c.cancelled_by === "customer" &&
            (decisionEvent?.note === "customer_cancel_after_48h" ||
              decisionEvent?.note === "cancelled_48h_refund")
          ) {
            reason = "고객 취소 (예약일 48시간 이후)";
          } else if (c.cancelled_by === "agent" || decisionEvent?.note === "agent_cancel") {
            reason = "상담사 취소";
          } else if (c.cancelled_by === "admin") {
            reason = "관리자 취소";
          } else {
            reason = "취소됨";
          }
        } else if (c.status === "no_show") {
          if (!c.no_show_by) reason = "노쇼 판정 필요";
          else reason = c.no_show_by === "customer" ? "고객 노쇼" : "상담사 노쇼";
        }

        const property = propertiesMap.get(c.property_id);
        const customerPublic = publicProfilesMap.get(c.customer_id);
        const agentPublic = publicProfilesMap.get(c.agent_id);
        const customerProfile = profilesMap.get(c.customer_id);
        const agentProfile = profilesMap.get(c.agent_id);
        const customerFromJoin = c.customer_profile?.[0];
        const agentFromJoin = c.agent_profile?.[0];
        const customerName =
          customerPublic?.nickname ??
          customerFromJoin?.name ??
          customerFromJoin?.nickname ??
          customerProfile?.name ??
          customerProfile?.nickname ??
          "고객";
        const agentName =
          agentPublic?.nickname ??
          agentFromJoin?.name ??
          agentFromJoin?.nickname ??
          agentProfile?.name ??
          agentProfile?.nickname ??
          "상담사";
        const customerAvatar =
          customerPublic?.avatar_url ??
          customerFromJoin?.avatar_url ??
          customerProfile?.avatar_url ??
          null;
        const customerBankName = customerProfile?.bank_name ?? null;
        const customerBankAccountNumber =
          customerProfile?.bank_account_number ?? null;
        const customerBankAccountHolder =
          customerProfile?.bank_account_holder ?? null;
        const agentAvatar =
          agentPublic?.avatar_url ??
          agentFromJoin?.avatar_url ??
          agentProfile?.avatar_url ??
          null;
        const depositAmount = Math.abs(
          depositEvent?.amount ?? refundPayout?.amount ?? rewardPayout?.amount ?? 0,
        );
        const refundAmount =
          refundPayout?.amount != null
            ? Math.abs(refundPayout.amount)
            : depositAmount;

        return {
          id: c.id,
          status: c.status,
          created_at: c.created_at,
          scheduled_at: c.scheduled_at,
          scheduled_at_label: toLocalDateTime(c.scheduled_at),
          deposit_label: depositLabel,
          deposit_tone: depositTone,
          reward_label: rewardLabel,
          reward_tone: rewardTone,
          reason,
          property_name: property?.name ?? "-",
          property_image_url: property?.image_url ?? null,
          customer_name: customerName,
          customer_avatar_url: customerAvatar,
          customer_bank_name: customerBankName,
          customer_bank_account_number: customerBankAccountNumber,
          customer_bank_account_holder: customerBankAccountHolder,
          agent_name: agentName,
          agent_avatar_url: agentAvatar,
          deposit_amount: depositAmount,
          refund_amount: refundAmount,
        };
      })
      .filter((row) => {
        return (
          row.deposit_label !== "-" ||
          row.reward_label !== "-" ||
          row.status === "cancelled" ||
          row.status === "no_show"
        );
      })
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )
      .slice(0, 30);

    return NextResponse.json({
      summary: {
        rewardPendingCount,
        refundPendingCount,
        noShowPendingCount,
      },
      rows: settlementRows,
    });
  } catch (error: unknown) {
    console.error("관리자 정산 데이터 조회 오류:", error);
    return NextResponse.json(
      { error: "정산 데이터를 불러오지 못했습니다" },
      { status: 500 },
    );
  }
}
