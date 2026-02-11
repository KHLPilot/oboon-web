"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Modal from "@/components/ui/Modal";
import Card from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Textarea from "@/components/ui/Textarea";
import { getAvatarUrlOrDefault } from "@/shared/imageUrl";

type ReservationRow = {
  id: string;
  status: string;
  scheduled_at: string;
  property?: { id: number; name: string; image_url?: string | null } | null;
  customer?: { id: string; name: string | null; avatar_url?: string | null } | null;
  agent?: { id: string; name: string | null; avatar_url?: string | null } | null;
  customer_avatar_url?: string | null;
  agent_avatar_url?: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  row: ReservationRow | null;
  statusLabelMap: Record<string, string>;
  onApprove: (reservationId: string) => Promise<void>;
  onReject: (reservationId: string, rejectionReason: string) => Promise<void>;
  approving: boolean;
  rejecting: boolean;
};

type SettlementSummary = {
  consultation_id: string;
  deposit_amount: number;
  is_deposit_paid: boolean;
  deposit_paid_at: string | null;
};

function Avatar({
  name,
  url,
}: {
  name?: string | null;
  url?: string | null;
}) {
  return (
    <Image
      src={getAvatarUrlOrDefault(url)}
      alt={`${name ?? "사용자"} 프로필`}
      width={32}
      height={32}
      className="h-8 w-8 rounded-full border border-(--oboon-border-default) object-cover"
    />
  );
}

export default function ReservationDetailModal({
  open,
  onClose,
  row,
  statusLabelMap,
  onApprove,
  onReject,
  approving,
  rejecting,
}: Props) {
  const [summary, setSummary] = useState<SettlementSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);

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
    void loadSummary();
  }, [open, row?.id, loadSummary]);

  useEffect(() => {
    if (!open || row?.status !== "requested") return;
    setRejectionReason("");
    setReasonError(null);
    setRejectModalOpen(false);
  }, [open, row?.id, row?.status]);

  if (!row) {
    return (
      <Modal open={open} onClose={onClose} size="lg">
        <div />
      </Modal>
    );
  }

  const scheduledAtLabel = new Date(row.scheduled_at).toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  const depositStatusLabel = !summary
    ? "-"
    : summary.is_deposit_paid
      ? "결제 완료"
      : "미결제";

  const depositPaidAtLabel = summary?.deposit_paid_at
    ? new Date(summary.deposit_paid_at).toLocaleString("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const handleReject = async () => {
    if (!row?.id) return;
    const normalizedReason = rejectionReason.trim();
    if (!normalizedReason) {
      setReasonError("거절 사유를 입력해주세요.");
      return;
    }
    setReasonError(null);
    try {
      await onReject(row.id, normalizedReason);
      setRejectModalOpen(false);
      setRejectionReason("");
    } catch {
      // 오류 메시지는 상위에서 토스트로 표시됨
    }
  };

  return (
    <Modal open={open} onClose={onClose} size="lg">
      <div className="ob-typo-h2 text-(--oboon-text-title)">예약 상세 정보</div>

      <Card className="mt-4 p-4 shadow-none">
        <div className="flex items-start gap-3">
          {row.property?.image_url ? (
            <Image
              src={row.property.image_url}
              alt={row.property?.name ?? "현장"}
              width={80}
              height={80}
              className="h-20 w-20 rounded-xl border border-(--oboon-border-default) object-cover"
            />
          ) : (
            <div className="h-20 w-20 rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle)" />
          )}
          <div className="min-w-0">
            <div className="ob-typo-h3 text-(--oboon-text-title)">
              {row.property?.name ?? "-"}
            </div>
            <div className="mt-1 ob-typo-body text-(--oboon-text-muted)">
              {scheduledAtLabel}
            </div>
            <div className="mt-1 ob-typo-body text-(--oboon-text-muted)">
              예약번호 {row.id.slice(0, 8)}
            </div>
          </div>
        </div>

        <div className="mt-3 border-t border-(--oboon-border-default) pt-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <Avatar
                name={row.customer?.name}
                url={row.customer_avatar_url ?? row.customer?.avatar_url ?? null}
              />
              <div>
                <div className="ob-typo-caption text-(--oboon-text-muted)">고객</div>
                <div className="ob-typo-body text-(--oboon-text-title)">
                  {row.customer?.name ?? "-"}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <div className="text-right">
                <div className="ob-typo-caption text-(--oboon-text-muted)">상담사</div>
                <div className="ob-typo-body text-(--oboon-text-title)">
                  {row.agent?.name ?? "-"}
                </div>
              </div>
              <Avatar
                name={row.agent?.name}
                url={row.agent_avatar_url ?? row.agent?.avatar_url ?? null}
              />
            </div>
          </div>
        </div>
      </Card>

      <div className="mt-4 flex items-center gap-2">
        <div className="ob-typo-h3 text-(--oboon-text-title)">예약 상태</div>
        <Badge variant="status">
          {statusLabelMap[row.status] || row.status}
        </Badge>
      </div>

      <Card className="mt-3 p-4 shadow-none">
        <div className="ob-typo-body text-(--oboon-text-title)">고객 예약금</div>
        <div className="mt-2 ob-typo-h2 text-(--oboon-text-title)">
          {loading
            ? "-"
            : `${(summary?.deposit_amount ?? 0).toLocaleString("ko-KR")}원`}
        </div>
        <div className="mt-3 border-t border-(--oboon-border-default) pt-3">
          <div
            className={
              summary?.is_deposit_paid
                ? "ob-typo-body text-(--oboon-success)"
                : "ob-typo-body text-(--oboon-text-muted)"
            }
          >
            {loading ? "확인 중..." : depositStatusLabel}
          </div>
          {!loading && depositPaidAtLabel ? (
            <div className="mt-1 ob-typo-caption text-(--oboon-text-muted)">
              {depositPaidAtLabel}
            </div>
          ) : null}
        </div>
      </Card>

      {row.status === "requested" ? (
        <div className="mt-3 ob-typo-body text-(--oboon-text-muted)">
          승인하면 상담사 예약 목록에 노출되고 상담 진행이 시작됩니다.
        </div>
      ) : null}

      {row.status === "requested" ? (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button
            className="h-10 w-full"
            variant="danger"
            size="sm"
            shape="pill"
            onClick={() => {
              setReasonError(null);
              setRejectModalOpen(true);
            }}
            disabled={approving}
          >
            요청 거절
          </Button>
          <Button
            className="h-10 w-full"
            variant="primary"
            size="sm"
            shape="pill"
            onClick={() => onApprove(row.id)}
            loading={approving}
            disabled={rejecting}
          >
            요청 승인
          </Button>
        </div>
      ) : null}

      {rejectModalOpen && row.status === "requested" ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4"
          onMouseDown={(event) => {
            if (event.target !== event.currentTarget || rejecting) return;
            setRejectModalOpen(false);
          }}
        >
          <div
            className="w-full max-w-[480px] rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-4 shadow-(--oboon-shadow-card)"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="ob-typo-h3 text-(--oboon-text-title)">예약 요청 거절</div>
            <div className="mt-2 ob-typo-body text-(--oboon-text-muted)">
              거절 사유를 입력한 뒤 요청 거절을 눌러주세요.
            </div>
            <div className="mt-3">
              <div className="ob-typo-caption text-(--oboon-text-muted)">거절 사유</div>
              <Textarea
                className={[
                  "mt-1 min-h-[96px] w-full rounded-xl bg-(--oboon-bg-surface)",
                  "border border-(--oboon-border-default)",
                  "px-3 py-2 text-sm text-(--oboon-text-title)",
                  "placeholder:text-(--oboon-text-muted)",
                  "focus:outline-none focus:ring-2 focus:ring-(--oboon-primary)",
                ].join(" ")}
                placeholder="예: 예약금 미입금으로 요청을 거절합니다."
                value={rejectionReason}
                onChange={(event) => setRejectionReason(event.target.value)}
                disabled={rejecting}
              />
              {reasonError ? (
                <div className="mt-1 ob-typo-caption text-(--oboon-danger)">
                  {reasonError}
                </div>
              ) : null}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button
                className="h-10 w-full"
                variant="secondary"
                size="sm"
                shape="pill"
                onClick={() => setRejectModalOpen(false)}
                disabled={rejecting}
              >
                취소
              </Button>
              <Button
                className="h-10 w-full"
                variant="danger"
                size="sm"
                shape="pill"
                onClick={handleReject}
                loading={rejecting}
              >
                요청 거절
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
