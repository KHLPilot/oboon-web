"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  MessageCircle,
  Check,
  X,
  Loader2,
  Trash2,
  Settings,
  Bell,
  AlertCircle,
} from "lucide-react";

import PageContainer from "@/components/shared/PageContainer";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { fetchAgentAccess } from "@/features/agent/services/agent.auth";
import AgentScheduleSettings from "@/features/agent/components/AgentScheduleSettings.client";
import ConsultationCard from "@/features/consultations/components/ConsultationCard.client";
import AgentBaseScheduleModal from "@/features/agent/components/AgentBaseScheduleModal.client";
import { subscribeToVisitConfirmRequests } from "@/features/agent/services/agent.scan";
import { createSupabaseClient } from "@/lib/supabaseClient";

import { showAlert } from "@/shared/alert";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  consultation_id: string | null;
  read_at: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

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

interface ManualRequest {
  id: string;
  status: string;
  reason: string | null;
  created_at: string;
  token: {
    id: string;
    property_id: number;
    consultation_id: string | null;
    created_at: string;
  } | null;
  property: {
    id: number;
    name: string;
  } | null;
  consultation: {
    id: string;
    scheduled_at: string;
    customer: {
      id: string;
      name: string;
    } | null;
  } | null;
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
  const [agentId, setAgentId] = useState<string | null>(null);
  const [showBaseScheduleModal, setShowBaseScheduleModal] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [pendingManualRequests, setPendingManualRequests] = useState<ManualRequest[]>([]);
  const [processingManualRequestId, setProcessingManualRequestId] = useState<string | null>(null);
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [manualModalConsultationId, setManualModalConsultationId] = useState<string | null>(null);

  // 약관 동의 모달 상태
  const [termsModalOpen, setTermsModalOpen] = useState(false);
  const [termsModalConsultationId, setTermsModalConsultationId] = useState<string | null>(null);
  const [agentTerms, setAgentTerms] = useState<{ title: string; content: string } | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [termsConfirming, setTermsConfirming] = useState(false);

  const fetchConsultations = useCallback(async () => {
    try {
      const url =
        filter === "all"
          ? "/api/consultations?role=agent"
          : `/api/consultations?role=agent&status=${filter}`;

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
      console.error("데이터 조회 오류:", err);
    }
  }, [filter]);

  const fetchPendingManualRequests = useCallback(async () => {
    try {
      const response = await fetch("/api/visits/manual-approve");
      const data = await response.json();
      if (response.ok) {
        setPendingManualRequests((data.requests || []) as ManualRequest[]);
      }
    } catch (err) {
      console.error("수동 확인 요청 조회 오류:", err);
    }
  }, []);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      try {
        const access = await fetchAgentAccess();
        if (!access.userId) {
          router.push("/auth/login");
          return;
        }

        if (access.role !== "agent" && access.role !== "admin") {
          showAlert("상담사 권한이 필요합니다");
          router.push("/");
          return;
        }

        setIsAgent(true);
        setAgentId(access.userId);
        await Promise.all([fetchConsultations(), fetchPendingManualRequests()]);
      } catch (err) {
        console.error("데이터 조회 오류:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [router, fetchConsultations, fetchPendingManualRequests]);

  // Realtime 알림 구독
  useEffect(() => {
    if (!agentId) return;

    const supabase = createSupabaseClient();

    // 초기 읽지 않은 알림 조회
    async function fetchUnreadNotifications() {
      try {
        const response = await fetch("/api/agent/notifications");
        const data = await response.json();
        if (response.ok) {
          const unread = (data.notifications || []).filter(
            (n: Notification) => !n.read_at,
          );
          setNotifications(unread);
        }
      } catch (err) {
        console.error("알림 조회 오류:", err);
      }
    }

    fetchUnreadNotifications();

    // Realtime 구독
    const channel = supabase
      .channel(`agent_notifications_${agentId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${agentId}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications((prev) => [newNotification, ...prev]);
          // 고객 도착 시 consultation 목록도 새로고침
          if (newNotification.type === "customer_arrival") {
            fetchConsultations();
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [agentId, fetchConsultations]);

  useEffect(() => {
    if (!isAgent) return;
    const unsubscribe = subscribeToVisitConfirmRequests(fetchPendingManualRequests);
    return () => unsubscribe();
  }, [isAgent, fetchPendingManualRequests]);

  async function handleDismissNotification(notificationId: string) {
    try {
      const response = await fetch("/api/agent/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId }),
      });

      if (response.ok) {
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      }
    } catch (err) {
      console.error("알림 읽음 처리 오류:", err);
    }
  }

  async function handleManualRequestAction(
    requestId: string,
    action: "approve" | "reject",
  ) {
    setProcessingManualRequestId(requestId);
    try {
      const response = await fetch("/api/visits/manual-approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "처리에 실패했습니다");
      }
      showAlert(action === "approve" ? "방문 인증을 승인했습니다." : "요청을 거절했습니다.");
      await Promise.all([fetchPendingManualRequests(), fetchConsultations()]);
    } catch (err: any) {
      showAlert(err.message || "처리 중 오류가 발생했습니다.");
    } finally {
      setProcessingManualRequestId(null);
    }
  }

  // 약관 모달 열기 (승인 버튼 클릭 시)
  async function openTermsModal(consultationId: string) {
    setTermsModalConsultationId(consultationId);
    setAgreedToTerms(false);
    setTermsModalOpen(true);

    // 약관 로드
    try {
      const res = await fetch("/api/terms?type=agent_visit_fee");
      const data = await res.json();
      if (data.terms?.[0]) {
        setAgentTerms(data.terms[0]);
      }
    } catch (err) {
      console.error("약관 로드 오류:", err);
    }
  }

  // 약관 동의 후 실제 승인 처리
  async function confirmWithTerms() {
    if (!termsModalConsultationId || !agreedToTerms) return;

    setTermsConfirming(true);
    try {
      const response = await fetch(`/api/consultations/${termsModalConsultationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "confirmed", agreed_to_terms: true }),
      });

      if (response.ok) {
        setConsultations((prev) =>
          prev.map((c) =>
            c.id === termsModalConsultationId ? { ...c, status: "confirmed" } : c,
          ),
        );
        showAlert("예약이 확정되었습니다");
        setTermsModalOpen(false);
        setTermsModalConsultationId(null);
      } else {
        const data = await response.json();
        showAlert(data.error || "확정에 실패했습니다");
      }
    } catch (err) {
      console.error("예약 확정 오류:", err);
      showAlert("확정 중 오류가 발생했습니다");
    } finally {
      setTermsConfirming(false);
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

  const manualRequestsForModal = pendingManualRequests
    .filter((request) => request.consultation?.id === manualModalConsultationId)
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

  const hasAnyConsultations = consultations.length > 0;

  if (!isAgent && !loading && !hasAnyConsultations) {
    return null;
  }

  return (
    <PageContainer className="pb-8">
      {/* 알림 배너 */}
      {notifications.length > 0 && (
        <div className="space-y-2 mb-4">
          {notifications.map((notification) => (
            <Card
              key={notification.id}
              className="p-3 bg-(--oboon-safe-bg) border border-(--oboon-safe)"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-(--oboon-safe) flex items-center justify-center shrink-0">
                  <Bell className="h-4 w-4 text-(--oboon-on-safe)" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="ob-typo-body2 text-(--oboon-text-title)">
                    {notification.title}
                  </p>
                  <p className="ob-typo-caption text-(--oboon-text-muted)">
                    {notification.message}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  shape="pill"
                  onClick={() => handleDismissNotification(notification.id)}
                >
                  <Check className="h-3 w-3" />
                  확인
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

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
                        onClick={() => openTermsModal(consultation.id)}
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
                          setManualModalConsultationId(consultation.id);
                          setManualModalOpen(true);
                        }}
                      >
                        <AlertCircle className="h-4 w-4" />
                        수동 요청
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

      <Modal
        open={manualModalOpen}
        onClose={() => {
          if (processingManualRequestId !== null) return;
          setManualModalOpen(false);
          setManualModalConsultationId(null);
        }}
      >
        <div className="ob-typo-h3 text-(--oboon-text-title)">수동 확인 요청</div>
        <div className="mt-1 ob-typo-caption text-(--oboon-text-muted)">
          고객의 GPS 인증 실패 요청을 확인하고 승인/거절할 수 있습니다.
        </div>

        <div className="mt-4 space-y-2">
          {manualRequestsForModal.length === 0 ? (
            <Card className="p-4 text-center shadow-none">
              <div className="ob-typo-body text-(--oboon-text-muted)">
                해당 예약의 수동 확인 요청이 없습니다.
              </div>
            </Card>
          ) : (
            manualRequestsForModal.map((request) => (
              <Card key={request.id} className="p-3 shadow-none">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="ob-typo-body text-(--oboon-text-title)">
                      {request.consultation?.customer?.name || "고객"}
                    </div>
                    <div className="ob-typo-caption text-(--oboon-text-muted)">
                      {request.property?.name || "-"}
                    </div>
                    <div className="mt-1 ob-typo-caption text-(--oboon-text-muted)">
                      요청 시간: {formatDate(request.created_at)}
                    </div>
                    {request.reason ? (
                      <div className="mt-1 ob-typo-caption text-(--oboon-text-muted)">
                        사유: {request.reason}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="primary"
                      shape="pill"
                      onClick={() =>
                        handleManualRequestAction(request.id, "approve")
                      }
                      disabled={processingManualRequestId !== null}
                      loading={processingManualRequestId === request.id}
                    >
                      승인
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      shape="pill"
                      onClick={() =>
                        handleManualRequestAction(request.id, "reject")
                      }
                      disabled={processingManualRequestId !== null}
                      loading={processingManualRequestId === request.id}
                    >
                      거절
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </Modal>

      {/* 약관 동의 모달 */}
      <Modal
        open={termsModalOpen}
        onClose={() => {
          if (!termsConfirming) {
            setTermsModalOpen(false);
            setTermsModalConsultationId(null);
          }
        }}
      >
        <div className="ob-typo-h3 text-(--oboon-text-title)">
          {agentTerms?.title || "방문성과비 이용약관"}
        </div>

        <div className="mt-4 rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) px-4 py-4 max-h-64 overflow-y-auto">
          <p className="ob-typo-caption text-(--oboon-text-muted) whitespace-pre-wrap">
            {agentTerms?.content || "약관을 불러오는 중..."}
          </p>
        </div>

        <label className="mt-4 flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={agreedToTerms}
            onChange={(e) => setAgreedToTerms(e.target.checked)}
            className="w-5 h-5 rounded border-(--oboon-border-default) accent-(--oboon-primary)"
          />
          <span className="ob-typo-body text-(--oboon-text-title)">
            위 내용을 확인하였으며 동의합니다
          </span>
        </label>

        <div className="mt-6 flex gap-2">
          <Button
            className="flex-1"
            variant="secondary"
            size="md"
            shape="pill"
            onClick={() => {
              setTermsModalOpen(false);
              setTermsModalConsultationId(null);
            }}
            disabled={termsConfirming}
          >
            취소
          </Button>
          <Button
            className="flex-1"
            variant="primary"
            size="md"
            shape="pill"
            onClick={confirmWithTerms}
            disabled={!agreedToTerms || termsConfirming}
            loading={termsConfirming}
          >
            승인 확정
          </Button>
        </div>
      </Modal>
    </PageContainer>
  );
}
