"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  MessageCircle,
  Loader2,
  Trash2,
} from "lucide-react";
import Link from "next/link";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import ConsultationCard from "@/features/consultations/components/ConsultationCard.client";
import { createSupabaseClient } from "@/lib/supabaseClient";

import { showAlert } from "@/shared/alert";
interface Consultation {
  id: string;
  scheduled_at: string;
  status: string;
  visited_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  customer: {
    id: string;
    name: string;
    email: string;
    phone_number: string;
  };
  agent: {
    id: string;
    name: string;
    email: string;
    phone_number: string;
  };
  property: {
    id: number;
    name: string;
    image_url: string | null;
  };
}

// 취소된 예약 삭제까지 남은 시간 계산 (3일 후 삭제)
function getTimeUntilDeletion(cancelledAt: string): string {
  const cancelDate = new Date(cancelledAt);
  const deleteDate = new Date(cancelDate);
  deleteDate.setDate(deleteDate.getDate() + 3);
  const now = new Date();
  const diffTime = deleteDate.getTime() - now.getTime();

  if (diffTime <= 0) return "곧 자동 삭제됩니다";

  const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));

  if (diffHours <= 24) {
    return `약 ${diffHours}시간 후 자동 삭제`;
  }

  const diffDays = Math.ceil(diffHours / 24);
  return `약 ${diffDays}일 후 자동 삭제`;
}

const STATUS_LABELS: Record<
  string,
  { label: string; variant: "default" | "status" }
> = {
  pending: { label: "예약 대기", variant: "default" },
  confirmed: { label: "예약 확정", variant: "status" },
  visited: { label: "방문 완료", variant: "status" },
  contracted: { label: "계약 완료", variant: "status" },
  cancelled: { label: "취소됨", variant: "default" },
};

type ConsultationsListPanelProps = {
  embedded?: boolean;
  onNavigate?: () => void;
};

export default function ConsultationsListPanel({
  embedded = false,
  onNavigate,
}: ConsultationsListPanelProps) {
  const router = useRouter();
  const supabase = createSupabaseClient();

  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  const handleNavigate = useCallback(
    (href: string) => {
      onNavigate?.();
      router.push(href);
    },
    [onNavigate, router],
  );

  const fetchConsultations = useCallback(async () => {
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        handleNavigate("/auth/login");
        return;
      }

      const url =
        filter === "all"
          ? "/api/consultations"
          : `/api/consultations?status=${filter}`;

      const response = await fetch(url);
      const data = await response.json();

      if (response.ok) {
        const statusOrder: Record<string, number> = {
          pending: 0,
          confirmed: 1,
          visited: 2,
          contracted: 3,
          cancelled: 4,
        };

        const sorted = (data.consultations || []).sort(
          (a: Consultation, b: Consultation) => {
            const dateA = new Date(a.scheduled_at).getTime();
            const dateB = new Date(b.scheduled_at).getTime();
            if (dateB !== dateA) return dateB - dateA;

            return (
              (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99)
            );
          },
        );

        setConsultations(sorted);
      } else {
        console.error("예약 목록 조회 실패:", data.error);
      }
    } catch (err) {
      console.error("예약 목록 조회 오류:", err);
    } finally {
      setLoading(false);
    }
  }, [filter, supabase, handleNavigate]);

  useEffect(() => {
    fetchConsultations();
  }, [fetchConsultations]);

  async function handleCancel(consultationId: string) {
    if (!confirm("예약을 취소하시겠습니까?")) return;

    try {
      const response = await fetch(`/api/consultations/${consultationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });

      if (response.ok) {
        setConsultations((prev) =>
          prev.map((c) =>
            c.id === consultationId
              ? {
                  ...c,
                  status: "cancelled",
                  cancelled_at: new Date().toISOString(),
                }
              : c,
          ),
        );
        showAlert("예약이 취소되었습니다. 3일 후 자동 삭제됩니다");
      } else {
        const data = await response.json();
        showAlert(data.error || "취소에 실패했습니다");
      }
    } catch (err) {
      console.error("예약 취소 오류:", err);
      showAlert("취소 중 오류가 발생했습니다");
    }
  }

  async function handleDelete(consultationId: string) {
    if (!confirm("해당 예약을 삭제하시겠습니까?")) return;

    try {
      const response = await fetch(`/api/consultations/${consultationId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setConsultations((prev) => prev.filter((c) => c.id !== consultationId));
        showAlert("예약이 삭제되었습니다");
      } else {
        const data = await response.json();
        showAlert(data.error || "삭제에 실패했습니다");
      }
    } catch (err) {
      console.error("예약 삭제 오류:", err);
      showAlert("삭제 중 오류가 발생했습니다");
    }
  }

  function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
    const dayName = dayNames[date.getDay()];
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${month}월 ${day}일(${dayName}) ${hours}:${minutes}`;
  }

  const containerClassName = embedded ? "space-y-4" : "space-y-5 sm:space-y-6";

  return (
    <div className={containerClassName}>
      <div className="-mx-4 pl-4 flex gap-2 overflow-x-auto pb-2 px-2 sm:mx-0 sm:px-0 scrollbar-none">
        {[
          { key: "all", label: "전체" },
          { key: "pending", label: "대기중" },
          { key: "confirmed", label: "확정" },
          { key: "visited", label: "방문 완료" },
          { key: "contracted", label: "계약 완료" },
        ].map((f) => (
          <Button
            key={f.key}
            size="sm"
            shape="pill"
            variant={filter === f.key ? "primary" : "secondary"}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {loading ? (
        <Card className="flex items-center justify-center py-12 sm:py-16">
          <Loader2 className="h-8 w-8 animate-spin text-(--oboon-primary)" />
        </Card>
      ) : consultations.length === 0 ? (
        <Card className="p-8 sm:p-10 text-center space-y-4">
          <CalendarDays className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-(--oboon-text-muted)" />
          <p className="ob-typo-body text-(--oboon-text-muted)">
            {filter === "all"
              ? "예약 내역이 없습니다"
              : "해당 상태의 예약이 없습니다"}
          </p>
          <Link href="/offerings" onClick={() => onNavigate?.()}>
            <Button variant="primary" className="mx-auto">
              분양 둘러보기
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-4">
          {consultations.map((consultation) => (
            <ConsultationCard
              key={consultation.id}
              statusLabel={
                STATUS_LABELS[consultation.status]?.label || consultation.status
              }
              statusVariant={
                STATUS_LABELS[consultation.status]?.variant || "default"
              }
              reservationId={consultation.id.slice(0, 8)}
              property={consultation.property}
              scheduledAtLabel={formatDate(consultation.scheduled_at)}
              onNavigate={() => onNavigate?.()}
              meta={<span>상담사: {consultation.agent.name}</span>}
              note={
                consultation.status === "pending" ? (
                  <p className="ob-typo-body text-(--oboon-warning) mt-2">
                    상담사 확인 대기중입니다
                  </p>
                ) : consultation.status === "cancelled" &&
                  consultation.cancelled_at ? (
                  <p className="ob-typo-caption text-(--oboon-danger)">
                    {getTimeUntilDeletion(consultation.cancelled_at)}
                  </p>
                ) : null
              }
              actions={
                <>
                  {(consultation.status === "pending" ||
                    consultation.status === "confirmed" ||
                    consultation.status === "visited" ||
                    consultation.status === "contracted") && (
                    <Button
                      size="md"
                      variant="secondary"
                      className="w-full sm:flex-1 min-h-8 inline-flex items-center justify-center gap-2"
                      onClick={() => handleNavigate(`/chat/${consultation.id}`)}
                    >
                      <MessageCircle className="h-5 w-5 shrink-0" />
                      <span className="leading-none">채팅</span>
                    </Button>
                  )}

                  {(consultation.status === "cancelled" ||
                    consultation.status === "visited" ||
                    consultation.status === "contracted") && (
                    <Button
                      size="md"
                      variant="danger"
                      className="w-full sm:flex-1 min-h-8"
                      onClick={() => handleDelete(consultation.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                      삭제
                    </Button>
                  )}

                  {(consultation.status === "pending" ||
                    consultation.status === "confirmed") && (
                    <Button
                      size="md"
                      variant="danger"
                      className="w-full sm:flex-1 sm:min-w-15 min-h-8"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleCancel(consultation.id);
                      }}
                    >
                      예약 취소
                    </Button>
                  )}
                </>
              }
            />
          ))}
        </div>
      )}

      {!loading && consultations.length > 0 && (
        <Button
          variant="secondary"
          className="w-full"
          onClick={() => void fetchConsultations()}
        >
          더보기
        </Button>
      )}
    </div>
  );
}
