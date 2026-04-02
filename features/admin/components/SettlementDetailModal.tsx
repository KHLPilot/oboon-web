"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Modal from "@/components/ui/Modal";
import Card from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { DEFAULT_AVATAR_URL, getAvatarUrlOrDefault } from "@/shared/imageUrl";

type SettlementRow = {
  id: string;
  status: string;
  scheduled_at_label: string;
  deposit_label: string;
  deposit_tone: "primary" | "success" | "warning" | "danger" | "muted";
  property_name: string;
  property_image_url: string | null;
  customer_name: string | null;
  customer_avatar_url: string | null;
  customer_bank_name: string | null;
  customer_bank_account_number: string | null;
  customer_bank_account_holder: string | null;
  agent_name: string | null;
  agent_avatar_url: string | null;
  deposit_amount: number;
  refund_amount: number;
};

type Props = {
  open: boolean;
  onClose: () => void;
  row: SettlementRow | null;
  statusLabelMap: Record<string, string>;
};

type SettlementSummary = {
  consultation_id: string;
  deposit_amount: number;
  is_deposit_paid: boolean;
  deposit_paid_at: string | null;
  refund_method?: "point" | "cash" | null;
  point_converted_amount?: number;
  point_converted_at?: string | null;
  refundable_point_amount: number;
  is_refund_eligible: boolean;
  is_refund_pending: boolean;
  is_refund_completed: boolean;
  refund_completed_at: string | null;
  is_refund_blocked: boolean;
  reward_due_amount: number;
  reward_paid_amount: number;
  is_reward_payout_pending: boolean;
  reward_payout_done_at: string | null;
};

function formatMoney(value: number) {
  return `${value.toLocaleString("ko-KR")}원`;
}

function Avatar({
  name,
  url,
}: {
  name?: string | null;
  url?: string | null;
}) {
  const [error, setError] = useState(false);
  const safeUrl = error ? DEFAULT_AVATAR_URL : getAvatarUrlOrDefault(url);

  return (
    <Image
      src={safeUrl}
      alt={`${name ?? "사용자"} 프로필`}
      width={28}
      height={28}
      className="h-7 w-7 rounded-full border border-(--oboon-border-default) object-cover"
      onError={() => setError(true)}
    />
  );
}

export default function SettlementDetailModal({
  open,
  onClose,
  row,
  statusLabelMap,
}: Props) {
  const toast = useToast();
  const [summary, setSummary] = useState<SettlementSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);

  const loadSummary = useCallback(async () => {
    if (!row?.id) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/consultations/${row.id}/settlement-summary`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "정산 요약 조회 실패");
      }
      setSummary(data as SettlementSummary);
    } catch {
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [row?.id]);

  useEffect(() => {
    if (!open || !row?.id) return;
    let cancelled = false;
    void (async () => {
      if (cancelled) return;
      await loadSummary();
    })();
    return () => {
      cancelled = true;
    };
  }, [open, row?.id, loadSummary]);

  const handleRefundComplete = useCallback(async () => {
    if (!row?.id || !summary?.is_refund_pending) return;
    setProcessing(true);
    try {
      const response = await fetch(`/api/consultations/${row.id}/refund`, {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "환급 처리 실패");
      }
      toast.success(
        data.already_processed ? "이미 처리된 환급입니다." : "환급 처리가 완료되었습니다.",
        "완료",
      );
      await loadSummary();
    } catch (error: unknown) {
      toast.error((error instanceof Error ? error.message : "알 수 없는 오류") || "환급 처리 실패", "오류");
    } finally {
      setProcessing(false);
    }
  }, [row?.id, summary?.is_refund_pending, loadSummary, toast]);

  const handleRewardPayoutComplete = useCallback(async () => {
    if (!row?.id) return;
    setProcessing(true);
    try {
      const response = await fetch(`/api/consultations/${row.id}/reward-payout`, {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "지급 처리 실패");
      }
      toast.success(
        data.already_processed ? "이미 처리된 지급입니다." : "방문 보상금 지급이 완료되었습니다.",
        "완료",
      );
      await loadSummary();
    } catch (error: unknown) {
      toast.error((error instanceof Error ? error.message : "알 수 없는 오류") || "지급 처리 실패", "오류");
    } finally {
      setProcessing(false);
    }
  }, [row?.id, loadSummary, toast]);

  const depositStatusLabel = useMemo(() => {
    if (!summary) return "-";
    return summary.is_deposit_paid ? "결제 완료" : "미결제";
  }, [summary]);

  const isRewardMode = row?.status === "visited" || row?.status === "contracted";
  const isPointConvertedCase =
    !isRewardMode &&
    summary?.refund_method === "point" &&
    Boolean(summary?.is_refund_completed);

  const cardTitle = isRewardMode
    ? "총 방문 보상금"
    : isPointConvertedCase
      ? "포인트"
      : "총 환급금";

  const cardAmount = isRewardMode
    ? summary?.reward_due_amount ?? 0
    : summary?.refundable_point_amount ?? row?.refund_amount ?? 0;
  const cardAmountLabel = isPointConvertedCase
    ? `${(summary?.point_converted_amount ?? 0).toLocaleString("ko-KR")}P`
    : formatMoney(cardAmount);

  const settlementStatusLabel = useMemo(() => {
    if (!summary) return "-";
    if (isRewardMode) {
      if (summary.reward_payout_done_at) return "지급 완료";
      if (summary.is_reward_payout_pending || summary.reward_due_amount > 0) {
        return "지급 대기";
      }
      return "-";
    }
    if (isPointConvertedCase) return "포인트 전환 완료";
    if (summary.is_refund_blocked) return "환급 불가";
    if (summary.is_refund_completed) return "환급 완료";
    return "환급 대기";
  }, [isPointConvertedCase, isRewardMode, summary]);

  const settlementStatusToneClass = useMemo(() => {
    if (!summary) return "ob-typo-body text-(--oboon-text-muted)";
    if (isRewardMode) {
      return summary.reward_payout_done_at
        ? "ob-typo-body text-(--oboon-success)"
        : "ob-typo-body text-(--oboon-primary)";
    }
    if (isPointConvertedCase) {
      return "ob-typo-body text-(--oboon-primary)";
    }
    if (summary.is_refund_blocked) {
      return "ob-typo-body text-(--oboon-danger)";
    }
    return summary.is_refund_completed
      ? "ob-typo-body text-(--oboon-success)"
      : "ob-typo-body text-(--oboon-primary)";
  }, [isPointConvertedCase, isRewardMode, summary]);

  const completedAtLabel = useMemo(() => {
    const source = isRewardMode ? summary?.reward_payout_done_at : summary?.refund_completed_at;
    if (!source) return null;
    return new Date(source).toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [isRewardMode, summary?.refund_completed_at, summary?.reward_payout_done_at]);

  const depositPaidAtLabel = useMemo(() => {
    if (!summary?.deposit_paid_at) return null;
    return new Date(summary.deposit_paid_at).toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [summary?.deposit_paid_at]);

  const canProcessRefund =
    Boolean(summary?.is_refund_pending) && !loading && !processing;
  const canProcessReward =
    isRewardMode &&
    ((summary?.reward_due_amount ?? 0) > (summary?.reward_paid_amount ?? 0) ||
      Boolean(summary?.is_reward_payout_pending)) &&
    !loading &&
    !processing;
  const showRefundActionButton =
    !isRewardMode &&
    !(summary?.is_refund_completed ?? false) &&
    !isPointConvertedCase &&
    !(summary?.is_refund_blocked ?? false);
  const showRewardActionButton =
    isRewardMode && !(summary?.reward_payout_done_at ?? null);
  const showSettlementAmountCard =
    row?.status !== "requested" && row?.status !== "confirmed";

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
    >
      {row ? (
        <div>
          <div className="ob-typo-h2 text-(--oboon-text-title)">정산 상세 정보</div>

          <Card className="mt-4 p-3 shadow-none">
            <div className="flex items-start gap-3">
              {row.property_image_url ? (
                <Image
                  src={row.property_image_url}
                  alt={row.property_name}
                  width={80}
                  height={80}
                  className="h-20 w-20 rounded-xl border border-(--oboon-border-default) object-cover"
                />
              ) : (
                <div className="h-20 w-20 rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle)" />
              )}
              <div className="min-w-0">
                <div className="mt-1 ob-typo-h3 text-(--oboon-text-title)">
                  {row.property_name}
                </div>
                <div className="mt-1 ob-typo-body text-(--oboon-text-muted)">
                  {row.scheduled_at_label}
                </div>
                <div className="mt-1 ob-typo-body text-(--oboon-text-muted)">
                  {row.id.slice(0, 8)}
                </div>
              </div>
            </div>

            <div className="mt-3 border-t border-(--oboon-border-default) pt-3">
              <div className="grid grid-cols-1 xs:grid-cols-2 items-center gap-3">
                <div className="flex items-center gap-2">
                  <Avatar name={row.customer_name} url={row.customer_avatar_url} />
                  <div>
                    <div className="ob-typo-caption text-(--oboon-text-muted)">
                      고객
                    </div>
                    <div className="ob-typo-body text-(--oboon-text-title)">
                      {row.customer_name ?? "-"}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <div className="text-right">
                    <div className="ob-typo-caption text-(--oboon-text-muted)">
                      분양상담사
                    </div>
                    <div className="ob-typo-body text-(--oboon-text-title)">
                      {row.agent_name ?? "-"}
                    </div>
                  </div>
                  <Avatar name={row.agent_name} url={row.agent_avatar_url} />
                </div>
              </div>
            </div>
          </Card>

          <div className="mt-4 flex items-center gap-2">
            <div className="ob-typo-h3 text-(--oboon-text-title)">
              정산 및 예약금 상세
            </div>
            <Badge variant="status">
              {statusLabelMap[row.status] || row.status}
            </Badge>
          </div>

          <Card className="mt-3 p-4 shadow-none">
            <div className="ob-typo-body text-(--oboon-text-title)">
              고객 정산 계좌 정보
            </div>
            <div className="mt-3 grid grid-cols-1 xs:grid-cols-3 gap-3">
              <div className="min-w-0">
                <div className="ob-typo-body text-(--oboon-text-muted)">
                  은행
                </div>
                <div className="mt-1 ob-typo-subtitle text-(--oboon-text-title)">
                  {row.customer_bank_name?.trim() || "미등록"}
                </div>
              </div>
              <div className="min-w-0">
                <div className="ob-typo-body text-(--oboon-text-muted)">
                  계좌번호
                </div>
                <div className="mt-1 ob-typo-subtitle text-(--oboon-text-title)">
                  {row.customer_bank_account_number?.trim() || "미등록"}
                </div>
              </div>
              <div className="min-w-0">
                <div className="ob-typo-body text-(--oboon-text-muted)">
                  입금자명
                </div>
                <div className="mt-1 ob-typo-subtitle text-(--oboon-text-title)">
                  {row.customer_bank_account_holder?.trim() || "미등록"}
                </div>
              </div>
            </div>
          </Card>

          <div
            className={[
              "mt-3 grid grid-cols-1 gap-3",
              showSettlementAmountCard ? "sm:grid-cols-2" : "",
            ].join(" ")}
          >
            <Card className="p-4 shadow-none">
              <div className="ob-typo-body text-(--oboon-text-title)">
                고객 예약금
              </div>
              <div className="mt-2 ob-typo-h2 text-(--oboon-text-title)">
                {formatMoney(summary?.deposit_amount ?? row.deposit_amount)}
              </div>
              <div className="mt-3 border-t border-(--oboon-border-default) pt-3">
                <div
                  className={
                    summary?.is_deposit_paid
                      ? "ob-typo-body text-(--oboon-success)"
                      : "ob-typo-body text-(--oboon-text-muted)"
                  }
                >
                  {depositStatusLabel}
                </div>
                {!loading && depositPaidAtLabel ? (
                  <div className="mt-1 ob-typo-caption text-(--oboon-text-muted)">
                    {depositPaidAtLabel}
                  </div>
                ) : null}
              </div>
            </Card>

            {showSettlementAmountCard ? (
              <Card className="p-4 shadow-none">
                <div className="ob-typo-body text-(--oboon-text-title)">
                  {cardTitle}
                </div>
                <div className="mt-2 ob-typo-h2 text-(--oboon-text-title)">
                  {cardAmountLabel}
                </div>
                <div className="mt-3 border-t border-(--oboon-border-default) pt-3">
                  <div className={settlementStatusToneClass}>
                    {settlementStatusLabel}
                  </div>
                  {!loading && completedAtLabel ? (
                    <div className="mt-1 ob-typo-caption text-(--oboon-text-muted)">
                      {completedAtLabel}
                    </div>
                  ) : null}
                  {showRefundActionButton ? (
                    <Button
                      className="mt-2 h-9 w-full"
                      size="sm"
                      shape="pill"
                      variant="primary"
                      disabled={!canProcessRefund}
                      onClick={handleRefundComplete}
                    >
                      환급 처리
                    </Button>
                  ) : showRewardActionButton ? (
                    <Button
                      className="mt-2 h-9 w-full"
                      size="sm"
                      shape="pill"
                      variant="primary"
                      disabled={!canProcessReward}
                      onClick={handleRewardPayoutComplete}
                    >
                      지급 완료
                    </Button>
                  ) : null}
                </div>
              </Card>
            ) : null}
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
