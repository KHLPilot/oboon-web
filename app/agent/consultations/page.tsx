"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  MessageCircle,
  Check,
  X,
  Loader2,
  QrCode,
  Trash2,
  Settings,
} from "lucide-react";

import PageContainer from "@/components/shared/PageContainer";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { fetchAgentAccess } from "@/features/agent/services/agent.auth";
import AgentScheduleSettings from "@/features/agent/components/AgentScheduleSettings.client";
import ConsultationCard from "@/features/consultations/components/ConsultationCard.client";
import AgentBaseScheduleModal from "@/features/agent/components/AgentBaseScheduleModal.client";
import AgentScanModal from "@/features/agent/components/AgentScanModal.client";

import { showAlert } from "@/shared/alert";
interface Consultation {
  id: string;
  scheduled_at: string;
  status: string;
  qr_code: string;
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
  pending: { label: "승인 대기", variant: "default" },
  confirmed: { label: "예약 확정", variant: "status" },
  visited: { label: "방문 완료", variant: "status" },
  contracted: { label: "계약 완료", variant: "status" },
  cancelled: { label: "취소됨", variant: "default" },
};

export default function AgentConsultationsPage() {
  const router = useRouter();

  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [isAgent, setIsAgent] = useState(false);
  const [showBaseScheduleModal, setShowBaseScheduleModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrTargetId, setQrTargetId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      try {
        // 로그인 체크
        const access = await fetchAgentAccess();
        if (!access.userId) {
          router.push("/auth/login");
          return;
        }

        // 상담사 권한 체크
        if (access.role !== "agent" && access.role !== "admin") {
          showAlert("상담사 권한이 필요합니다");
          router.push("/");
          return;
        }

        setIsAgent(true);

        // 예약 목록 조회
        const url =
          filter === "all"
            ? "/api/consultations?role=agent"
            : `/api/consultations?role=agent&status=${filter}`;

        const response = await fetch(url);
        const data = await response.json();

        if (response.ok) {
          // 정렬: 최근 날짜 우선, 같은 날짜/시간이면 상태 순서대로
          const statusOrder: Record<string, number> = {
            pending: 0,
            confirmed: 1,
            visited: 2,
            contracted: 3,
            cancelled: 4,
          };

          const sorted = (data.consultations || []).sort(
            (a: Consultation, b: Consultation) => {
              // 1. 최근 날짜가 위로
              const dateA = new Date(a.scheduled_at).getTime();
              const dateB = new Date(b.scheduled_at).getTime();
              if (dateB !== dateA) return dateB - dateA;

              // 2. 같은 날짜/시간이면 상태 순서대로
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
        console.error("데이터 조회 오류:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [router, filter]);

  // 예약 확정
  async function handleConfirm(consultationId: string) {
    try {
      const response = await fetch(`/api/consultations/${consultationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "confirmed" }),
      });

      if (response.ok) {
        setConsultations((prev) =>
          prev.map((c) =>
            c.id === consultationId ? { ...c, status: "confirmed" } : c,
          ),
        );
        showAlert("예약이 확정되었습니다");
      } else {
        const data = await response.json();
        showAlert(data.error || "확정에 실패했습니다");
      }
    } catch (err) {
      console.error("예약 확정 오류:", err);
      showAlert("확정 중 오류가 발생했습니다");
    }
  }

  // 예약 취소
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
        showAlert("예약이 취소되었습니다. 3일 후 자동으로 삭제됩니다.");
      } else {
        const data = await response.json();
        showAlert(data.error || "취소에 실패했습니다");
      }
    } catch (err) {
      console.error("예약 취소 오류:", err);
      showAlert("취소 중 오류가 발생했습니다");
    }
  }

  // 예약 삭제
  async function handleDelete(consultationId: string) {
    if (
      !confirm(
        "이 예약을 완전히 삭제하시겠습니까?\n삭제된 예약은 복구할 수 없습니다.",
      )
    )
      return;

    try {
      const response = await fetch(`/api/consultations/${consultationId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setConsultations((prev) => prev.filter((c) => c.id !== consultationId));
        showAlert("예약이 삭제되었습니다.");
      } else {
        const data = await response.json();
        showAlert(data.error || "삭제에 실패했습니다");
      }
    } catch (err) {
      console.error("예약 삭제 오류:", err);
      showAlert("삭제 중 오류가 발생했습니다");
    }
  }

  // 주의사항
  function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
    const dayName = dayNames[date.getDay()];
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${month}월 ${day}일 (${dayName}) ${hours}:${minutes}`;
  }

  const hasAnyConsultations = consultations.length > 0;

  if (!isAgent && !loading && !hasAnyConsultations) {
    return null;
  }

  return (
    <PageContainer className="pb-8">
      {/* 헤더 */}
      <div className="mb-4">
        <div className="ob-typo-h1 text-(--oboon-text-title)">예약 관리</div>
        <p className="mt-1 ob-typo-body text-(--oboon-text-muted)">
          상담 스케줄을 관리하고, 고객 상담 예약을 확인하고 관리할 수 있습니다
        </p>
      </div>

      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="ob-typo-h2 text-(--oboon-text-title)">
          예약 스케줄 설정
        </div>
        <Button
          size="sm"
          variant="secondary"
          shape="pill"
          onClick={() => setShowBaseScheduleModal(true)}
        >
          <Settings className="h-4 w-4" />
          예약 기본 설정
        </Button>
      </div>
      {isAgent && <AgentScheduleSettings showTitle={false} />}

      <div className="ob-typo-h2 text-(--oboon-text-title) mb-4">예약 목록</div>

      {/* 필터 */}
      <div className="flex gap-2 mb-2 overflow-x-auto pb-2 scrollbar-none">
        {[
          { key: "all", label: "전체" },
          { key: "pending", label: "승인 대기" },
          { key: "confirmed", label: "확정" },
          { key: "visited", label: "방문완료" },
          { key: "contracted", label: "계약완료" },
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

      {/* 로딩 */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-(--oboon-primary)" />
        </div>
      ) : consultations.length === 0 ? (
        /* 빈 상태 */
        <Card className="text-center py-12">
          <CalendarDays className="h-12 w-12 mx-auto text-(--oboon-text-muted) mb-4" />
          <p className="ob-typo-body text-(--oboon-text-muted)">
            {filter === "all"
              ? "예약 내역이 없습니다"
              : "해당 상태의 예약이 없습니다"}
          </p>
        </Card>
      ) : (
        /* 예약 목록 */
        <div className="grid gap-4 lg:grid-cols-2">
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
              note={
                consultation.status === "cancelled" &&
                consultation.cancelled_at ? (
                  <p className="ob-typo-body text-(--oboon-danger)">
                    {getTimeUntilDeletion(consultation.cancelled_at)}
                  </p>
                ) : null
              }
              actions={
                <>
                  {consultation.status === "pending" && (
                    <>
                      <Button
                        size="sm"
                        variant="primary"
                        shape="pill"
                        className="flex-1 min-h-8"
                        onClick={() => handleConfirm(consultation.id)}
                      >
                        <Check className="h-4 w-4" />
                        승인
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        shape="pill"
                        className="flex-1 min-h-8"
                        onClick={() => handleCancel(consultation.id)}
                      >
                        <X className="h-4 w-4" />
                        거절
                      </Button>
                    </>
                  )}

                  {consultation.status === "confirmed" && (
                    <>
                      <Button
                        size="sm"
                        variant="secondary"
                        shape="pill"
                        className="flex-1 min-h-8"
                        onClick={() => {
                          setQrTargetId(consultation.id);
                          setShowQrModal(true);
                        }}
                      >
                        <QrCode className="h-4 w-4" />
                        QR 스캔
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        shape="pill"
                        className="flex-1 min-h-8"
                        onClick={() => router.push(`/chat/${consultation.id}`)}
                      >
                        <MessageCircle className="h-4 w-4" />
                        채팅
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        shape="pill"
                        className="flex-1 min-h-8"
                        onClick={() => handleCancel(consultation.id)}
                      >
                        예약 취소
                      </Button>
                    </>
                  )}

                  {consultation.status === "cancelled" && (
                    <Button
                      size="sm"
                      variant="danger"
                      shape="pill"
                      className="flex-1 min-h-8"
                      onClick={() => handleDelete(consultation.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                      삭제
                    </Button>
                  )}

                  {(consultation.status === "visited" ||
                    consultation.status === "contracted") && (
                    <Button
                      size="sm"
                      variant="secondary"
                      shape="pill"
                      className="flex-1 min-h-8"
                      onClick={() => router.push(`/chat/${consultation.id}`)}
                    >
                      <MessageCircle className="h-4 w-4" />
                      채팅
                    </Button>
                  )}
                </>
              }
            />
          ))}
        </div>
      )}
      <AgentBaseScheduleModal
        open={showBaseScheduleModal}
        onClose={() => setShowBaseScheduleModal(false)}
      />
      <AgentScanModal
        open={showQrModal}
        consultationId={qrTargetId}
        onClose={() => {
          setShowQrModal(false);
          setQrTargetId(null);
        }}
      />
    </PageContainer>
  );
}
