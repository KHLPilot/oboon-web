"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  Clock3,
  MessageCircle,
  PieChart,
  Check,
  X,
  User,
  Loader2,
  Trash2,
  Settings,
  Bell,
  ChevronDown,
} from "lucide-react";

import PageContainer from "@/components/shared/PageContainer";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import { fetchAgentAccess } from "@/features/agent/services/agent.auth";
import AgentScheduleSettings from "@/features/agent/components/AgentScheduleSettings.client";
import ConsultationCard from "@/features/consultations/components/ConsultationCard.client";
import AgentBaseScheduleModal from "@/features/agent/components/AgentBaseScheduleModal.client";
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

type WorkingHoursRow = {
  day_of_week: number;
  start_time: string | null;
  end_time: string | null;
  is_enabled?: boolean | null;
};

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
  pending: { label: "승인 대기", variant: "default" },
  confirmed: { label: "예약 확정", variant: "status" },
  visited: { label: "방문 완료", variant: "status" },
  contracted: { label: "계약 완료", variant: "status" },
  cancelled: { label: "취소됨", variant: "default" },
};

type ReservationTab = "summary" | "list" | "schedule";

function AgentConsultationsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [allConsultations, setAllConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [isAgent, setIsAgent] = useState(false);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [showBaseScheduleModal, setShowBaseScheduleModal] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeTab, setActiveTab] = useState<ReservationTab>("summary");
  const [workingHoursRows, setWorkingHoursRows] = useState<WorkingHoursRow[]>([]);
  const [holidayDates, setHolidayDates] = useState<string[]>([]);

  // 약관 동의 모달 상태
  const [termsModalOpen, setTermsModalOpen] = useState(false);
  const [termsModalConsultationId, setTermsModalConsultationId] = useState<string | null>(null);
  const [agentTerms, setAgentTerms] = useState<{ title: string; content: string } | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [termsConfirming, setTermsConfirming] = useState(false);
  const [refundBankName, setRefundBankName] = useState("");
  const [refundBankAccountNumber, setRefundBankAccountNumber] = useState("");
  const [requireRefundAccountInput, setRequireRefundAccountInput] =
    useState(false);
  const [termsAccordionOpen, setTermsAccordionOpen] = useState(false);

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    const filterParam = searchParams.get("filter");

    if (
      tabParam === "summary" ||
      tabParam === "list" ||
      tabParam === "schedule"
    ) {
      setActiveTab(tabParam);
    }

    const validFilters = new Set([
      "all",
      "pending",
      "confirmed",
      "visited",
      "contracted",
      "cancelled",
    ]);
    if (filterParam && validFilters.has(filterParam)) {
      setFilter(filterParam);
    }
  }, [searchParams]);

  const fetchConsultations = useCallback(async () => {
    try {
      const url =
        filter === "all"
          ? "/api/consultations?role=agent"
          : `/api/consultations?role=agent&status=${filter}`;

      const [filteredRes, allRes] = await Promise.all([
        fetch(url),
        fetch("/api/consultations?role=agent"),
      ]);
      const filteredData = await filteredRes.json();
      const allData = await allRes.json();

      if (filteredRes.ok) {
        const statusOrder: Record<string, number> = {
          pending: 0,
          confirmed: 1,
          visited: 2,
          contracted: 3,
          cancelled: 4,
        };

        const sorted = (filteredData.consultations || []).sort(
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
        console.error("예약 목록 조회 실패:", filteredData.error);
      }

      if (allRes.ok) {
        setAllConsultations(allData.consultations || []);
      } else {
        console.error("전체 예약 조회 실패:", allData.error);
      }
    } catch (err) {
      console.error("데이터 조회 오류:", err);
    }
  }, [filter]);

  const fetchScheduleSummary = useCallback(async () => {
    try {
      const [workingHoursRes, holidaysRes] = await Promise.all([
        fetch("/api/agent/working-hours"),
        fetch("/api/agent/holidays"),
      ]);
      const [workingHoursData, holidaysData] = await Promise.all([
        workingHoursRes.json(),
        holidaysRes.json(),
      ]);

      if (workingHoursRes.ok) {
        setWorkingHoursRows((workingHoursData?.rows as WorkingHoursRow[]) || []);
      }
      if (holidaysRes.ok) {
        setHolidayDates(Array.isArray(holidaysData?.dates) ? holidaysData.dates : []);
      }
    } catch (err) {
      console.error("스케줄 요약 조회 오류:", err);
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
        await Promise.all([fetchConsultations(), fetchScheduleSummary()]);
      } catch (err) {
        console.error("데이터 조회 오류:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [router, fetchConsultations, fetchScheduleSummary]);

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

  // 약관 모달 열기 (승인 버튼 클릭 시)
  async function openTermsModal(consultationId: string) {
    setTermsModalConsultationId(consultationId);
    setAgreedToTerms(false);
    setTermsAccordionOpen(false);
    setRequireRefundAccountInput(false);
    setTermsModalOpen(true);

    try {
      const supabase = createSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("bank_name, bank_account_number")
          .eq("id", user.id)
          .maybeSingle();
        const fetchedBankName = profile?.bank_name ?? "";
        const fetchedBankAccountNumber = profile?.bank_account_number ?? "";
        setRequireRefundAccountInput(
          !fetchedBankName.trim() || !fetchedBankAccountNumber.trim(),
        );

        // 모달을 열고 사용자가 입력을 시작한 뒤 비동기 응답이 도착해도
        // 이미 입력한 값을 덮어쓰지 않도록 보호한다.
        setRefundBankName((prev) =>
          prev.trim().length > 0 ? prev : fetchedBankName,
        );
        setRefundBankAccountNumber((prev) =>
          prev.trim().length > 0 ? prev : fetchedBankAccountNumber,
        );
      }
      } catch (err) {
        console.error("계좌 정보 로드 오류:", err);
        setRequireRefundAccountInput(true);
      }

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
    const trimmedBankName = refundBankName.trim();
    const trimmedAccountNumber = refundBankAccountNumber.trim();
    const needsRefundAccount =
      requireRefundAccountInput &&
      (!trimmedBankName || !trimmedAccountNumber);

    setTermsConfirming(true);
    try {
      const supabase = createSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        showAlert("로그인이 필요합니다");
        return;
      }

      if (needsRefundAccount) {
        showAlert("환불 계좌 정보를 모두 입력해주세요");
        return;
      }

      if (trimmedBankName && trimmedAccountNumber) {
        const { error: bankUpdateError } = await supabase
          .from("profiles")
          .update({
            bank_name: trimmedBankName,
            bank_account_number: trimmedAccountNumber,
          })
          .eq("id", user.id);
        if (bankUpdateError) {
          showAlert("환불 계좌 저장에 실패했습니다");
          return;
        }
      }

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
        setRefundBankName(trimmedBankName);
        setRefundBankAccountNumber(trimmedAccountNumber);
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

  const hasAnyConsultations = consultations.length > 0;
  const summarySource = allConsultations.length > 0 ? allConsultations : consultations;
  const totalConsultationCount = summarySource.length;
  const pendingCount = summarySource.filter((c) => c.status === "pending").length;
  const confirmedCount = summarySource.filter((c) => c.status === "confirmed").length;
  const visitedCount = summarySource.filter((c) => c.status === "visited").length;
  const contractedCount = summarySource.filter((c) => c.status === "contracted").length;
  const cancelledCount = summarySource.filter((c) => c.status === "cancelled").length;
  const todayDateKey = new Date().toDateString();
  const todayConsultations = summarySource.filter(
    (c) => new Date(c.scheduled_at).toDateString() === todayDateKey,
  );
  const todayTotalCount = todayConsultations.length;
  const todayVisitPlanCount = todayConsultations.filter(
    (c) => c.status === "confirmed" || c.status === "pending",
  ).length;
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const previousMonthDate = new Date(currentYear, currentMonth - 1, 1);
  const previousYear = previousMonthDate.getFullYear();
  const previousMonth = previousMonthDate.getMonth();

  const inMonth = (iso: string, year: number, month: number) => {
    const d = new Date(iso);
    return d.getFullYear() === year && d.getMonth() === month;
  };

  const thisMonthConsultations = summarySource.filter((c) =>
    inMonth(c.scheduled_at, currentYear, currentMonth),
  );
  const prevMonthConsultations = summarySource.filter((c) =>
    inMonth(c.scheduled_at, previousYear, previousMonth),
  );

  const todayOfMonth = now.getDate();
  const todayInMonth = (iso: string, year: number, month: number, day: number) => {
    const d = new Date(iso);
    return (
      d.getFullYear() === year && d.getMonth() === month && d.getDate() === day
    );
  };
  const todaySameDayPrevMonth = summarySource.filter((c) =>
    todayInMonth(c.scheduled_at, previousYear, previousMonth, todayOfMonth),
  );

  const deltaMeta = (current: number, previous: number) => {
    const delta = current - previous;
    const percent =
      previous > 0 ? Math.round((Math.abs(delta) / previous) * 100) : current > 0 ? 100 : 0;
    const isUp = delta >= 0;
    return {
      delta,
      percent,
      isUp,
      sign: isUp ? "+" : "-",
      text: isUp ? "증가" : "감소",
    };
  };

  const statusMonthlyDelta = deltaMeta(
    thisMonthConsultations.length,
    prevMonthConsultations.length,
  );
  const overviewMonthlyDelta = deltaMeta(
    thisMonthConsultations.length,
    prevMonthConsultations.length,
  );
  const todayDelta = deltaMeta(todayConsultations.length, todaySameDayPrevMonth.length);
  const baseWorkingHoursRow = workingHoursRows.find((row) => row.day_of_week === 1)
    ?? workingHoursRows[0];
  const isWorkingEnabled =
    typeof baseWorkingHoursRow?.is_enabled === "boolean"
      ? baseWorkingHoursRow.is_enabled
      : true;
  const startTime = baseWorkingHoursRow?.start_time?.slice(0, 5) ?? "10:00";
  const endTime = baseWorkingHoursRow?.end_time?.slice(0, 5) ?? "17:00";
  const nowMonthKey = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`;
  const thisMonthHolidayDates = holidayDates.filter((d) => d.startsWith(nowMonthKey));

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

      <div className="grid grid-cols-1 gap-5 md:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="h-fit">
          <div className="rounded-2xl md:sticky md:top-24">
            <div className="space-y-0.5">
              {[
                { id: "summary" as const, label: "요약" },
                { id: "list" as const, label: "예약 목록" },
                { id: "schedule" as const, label: "예약 스케줄 설정" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={[
                    "w-full text-left py-1.5 rounded-xl ob-typo-body transition-colors relative",
                    activeTab === tab.id
                      ? "text-(--oboon-text-title)"
                      : "text-(--oboon-text-muted) hover:text-(--oboon-text-title)",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "relative block pl-5 pr-2 py-0.5 rounded-lg",
                      activeTab === tab.id ? "bg-(--oboon-bg-subtle) py-1" : "",
                    ].join(" ")}
                  >
                    {activeTab === tab.id && (
                      <span className="absolute left-0 top-0 bottom-0 w-1 rounded-full bg-(--oboon-primary)" />
                    )}
                    {tab.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        <div>
          <section className={activeTab === "summary" ? "" : "hidden"}>
            <div className="ob-typo-h2 text-(--oboon-text-title) mb-4">요약</div>

            <Card className="p-4 mb-3">
              <div className="ob-typo-caption text-(--oboon-text-muted)">OVERVIEW</div>
              <div className="mt-1 ob-typo-h3 text-(--oboon-text-title)">
                오늘의 예약 요약
              </div>
              <div className="mt-1 ob-typo-caption text-(--oboon-text-muted)">
                {new Date().toLocaleDateString("ko-KR", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  weekday: "long",
                })}
              </div>
            </Card>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Card className="p-4 sm:col-span-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-(--oboon-text-title)">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-(--oboon-bg-subtle)">
                      <PieChart className="h-4 w-4 text-(--oboon-primary)" />
                    </span>
                    <span className="ob-typo-subtitle">상태별 예약</span>
                  </div>
                  <span className="rounded-full border border-(--oboon-border-default) bg-(--oboon-bg-subtle) px-2 py-0.5 ob-typo-caption text-(--oboon-primary)">
                    {statusMonthlyDelta.isUp ? "↗" : "↘"}{" "}
                    {statusMonthlyDelta.sign}
                    {Math.abs(statusMonthlyDelta.delta)}건
                  </span>
                </div>
                <div className="mt-1 ob-typo-caption text-(--oboon-primary)">
                  지난달 대비 {statusMonthlyDelta.percent}% {statusMonthlyDelta.text}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
                  {[
                    { label: "확정", count: confirmedCount },
                    { label: "방문 완료", count: visitedCount },
                    { label: "계약 완료", count: contractedCount },
                    { label: "취소", count: cancelledCount },
                    { label: "승인 대기", count: pendingCount },
                  ].map((item) => (
                    <Card key={item.label} className="p-3 shadow-none">
                      <div className="ob-typo-caption text-(--oboon-text-muted)">
                        {item.label}
                      </div>
                      <div className="mt-1 ob-typo-h3 text-(--oboon-text-title)">
                        {item.count}건
                      </div>
                    </Card>
                  ))}
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-(--oboon-text-title)">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-(--oboon-bg-subtle)">
                      <BarChart3 className="h-4 w-4 text-(--oboon-primary)" />
                    </span>
                    <span className="ob-typo-subtitle">예약 현황</span>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    shape="pill"
                    className="h-8 w-8 p-0 rounded-full"
                    onClick={() => setActiveTab("list")}
                    aria-label="예약 목록으로 이동"
                  >
                    <ArrowRight className="h-4 w-4 text-(--oboon-text-muted)" />
                  </Button>
                </div>
                <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                  <div>
                    <div className="ob-typo-caption text-(--oboon-text-muted)">
                      전체 예약
                    </div>
                    <div className="mt-1 ob-typo-h3 text-(--oboon-text-title)">
                      {totalConsultationCount}건
                    </div>
                  </div>
                  <div className="h-10 w-px bg-(--oboon-border-default)" />
                  <div>
                    <div className="ob-typo-caption text-(--oboon-text-muted)">
                      승인 대기
                    </div>
                    <div className="mt-1 ob-typo-h3 text-(--oboon-text-title)">
                      {pendingCount}건
                    </div>
                  </div>
                </div>
                <div className="mt-2 ob-typo-caption text-(--oboon-primary)">
                  지난달 대비 {overviewMonthlyDelta.percent}% {overviewMonthlyDelta.text} (
                  {overviewMonthlyDelta.sign}
                  {Math.abs(overviewMonthlyDelta.delta)}건)
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-(--oboon-text-title)">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-(--oboon-bg-subtle)">
                      <CalendarDays className="h-4 w-4 text-(--oboon-primary)" />
                    </span>
                    <span className="ob-typo-subtitle">오늘 일정</span>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    shape="pill"
                    className="h-8 w-8 p-0 rounded-full"
                    onClick={() => setActiveTab("schedule")}
                    aria-label="예약 스케줄 설정으로 이동"
                  >
                    <ArrowRight className="h-4 w-4 text-(--oboon-text-muted)" />
                  </Button>
                </div>
                <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                  <div>
                    <div className="ob-typo-caption text-(--oboon-text-muted)">
                      오늘 예약
                    </div>
                    <div className="mt-1 ob-typo-h3 text-(--oboon-text-title)">
                      {todayTotalCount}건
                    </div>
                  </div>
                  <div className="h-10 w-px bg-(--oboon-border-default)" />
                  <div>
                    <div className="ob-typo-caption text-(--oboon-text-muted)">
                      오늘 방문 예정
                    </div>
                    <div className="mt-1 ob-typo-h3 text-(--oboon-text-title)">
                      {todayVisitPlanCount}건
                    </div>
                  </div>
                </div>
                <div className="mt-2 ob-typo-caption text-(--oboon-primary)">
                  지난달 같은 날짜 대비 {todayDelta.percent}% {todayDelta.text} (
                  {todayDelta.sign}
                  {Math.abs(todayDelta.delta)}건)
                </div>
              </Card>

              <Card className="p-4 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-(--oboon-text-title)">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-(--oboon-bg-subtle)">
                      <Clock3 className="h-4 w-4 text-(--oboon-primary)" />
                    </span>
                    <span className="ob-typo-subtitle">이번 달 스케줄</span>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    shape="pill"
                    className="h-8 w-8 p-0 rounded-full"
                    onClick={() => setActiveTab("schedule")}
                    aria-label="예약 스케줄 설정으로 이동"
                  >
                    <ArrowRight className="h-4 w-4 text-(--oboon-text-muted)" />
                  </Button>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                  <div>
                    <div className="ob-typo-caption text-(--oboon-text-muted)">
                      기본 운영 시간
                    </div>
                    <div className="mt-1 ob-typo-h3 text-(--oboon-text-title)">
                      {isWorkingEnabled ? `${startTime} ~ ${endTime}` : "휴무"}
                    </div>
                  </div>
                  <div className="hidden sm:block h-10 w-px bg-(--oboon-border-default)" />
                  <div>
                    <div className="ob-typo-caption text-(--oboon-text-muted)">
                      이번 달 휴무일
                    </div>
                    {thisMonthHolidayDates.length > 0 ? (
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {thisMonthHolidayDates.map((dateKey) => {
                          const day = Number(dateKey.slice(-2));
                          return (
                            <span
                              key={dateKey}
                              className="rounded-full border border-(--oboon-border-default) bg-(--oboon-bg-subtle) px-2 py-0.5 ob-typo-caption text-(--oboon-text-body)"
                            >
                              {day}일
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="mt-1 ob-typo-body text-(--oboon-text-title)">
                        등록된 휴무일 없음
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </div>
          </section>

          <section className={activeTab === "schedule" ? "" : "hidden"}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="ob-typo-h2 text-(--oboon-text-title)">예약 스케줄 설정</div>
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
          </section>

          <section className={activeTab === "list" ? "" : "hidden"}>
            <div className="ob-typo-h2 text-(--oboon-text-title) mb-4">예약 목록</div>

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

            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-(--oboon-primary)" />
              </div>
            ) : consultations.length === 0 ? (
              <Card className="text-center py-12">
                <CalendarDays className="h-12 w-12 mx-auto text-(--oboon-text-muted) mb-4" />
                <p className="ob-typo-body text-(--oboon-text-muted)">
                  {filter === "all"
                    ? "예약 내역이 없습니다"
                    : "해당 상태의 예약이 없습니다"}
                </p>
              </Card>
            ) : (
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
                    meta={
                      <span className="inline-flex items-center gap-2">
                        <User className="h-4 w-4" />
                        고객: {consultation.customer.name}
                      </span>
                    }
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
          </section>
        </div>
      </div>
      <AgentBaseScheduleModal
        open={showBaseScheduleModal}
        onClose={() => setShowBaseScheduleModal(false)}
        onSave={() => {
          void fetchScheduleSummary();
        }}
      />

      {/* 약관 동의 모달 */}
      <Modal
        open={termsModalOpen}
        onClose={() => {
          if (!termsConfirming) {
            setTermsModalOpen(false);
            setTermsModalConsultationId(null);
            setRequireRefundAccountInput(false);
            setTermsAccordionOpen(false);
          }
        }}
      >
        <div className="ob-typo-h3 text-(--oboon-text-title)">
          {agentTerms?.title || "방문성과비 이용약관"}
        </div>

        {requireRefundAccountInput && (
          <div className="mt-4 rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle) px-4 py-3">
            <div className="ob-typo-subtitle text-(--oboon-text-title)">
              환불계좌 입력
            </div>
            <p className="mt-1 ob-typo-caption text-(--oboon-text-muted)">
              예약 취소/정산 이슈 발생 시 환불 및 정산 처리를 위해 사용됩니다.
            </p>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Input
                value={refundBankName}
                onChange={(e) => setRefundBankName(e.target.value)}
                placeholder="은행명"
                disabled={termsConfirming}
              />
              <Input
                value={refundBankAccountNumber}
                onChange={(e) => setRefundBankAccountNumber(e.target.value)}
                placeholder="계좌번호"
                disabled={termsConfirming}
              />
            </div>
          </div>
        )}

        <div className="mt-3 rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle) px-4 py-3">
          <div className="ob-typo-subtitle text-(--oboon-text-title)">
            약관 요약
          </div>
          <ul className="mt-2 list-disc space-y-1 pl-5 ob-typo-caption text-(--oboon-text-muted)">
            <li>예약을 승인하면 해당 시간은 확정 처리됩니다.</li>
            <li>방문/취소 상태에 따라 예약금 및 방문성과비 정산이 진행됩니다.</li>
            <li>최종 상세 기준은 아래 약관 전문을 따릅니다.</li>
          </ul>
        </div>

        <div className="mt-3 rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) px-4 py-4">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-3 text-left"
            onClick={() => setTermsAccordionOpen((prev) => !prev)}
            aria-expanded={termsAccordionOpen}
          >
            <span className="ob-typo-subtitle text-(--oboon-text-title)">
              약관 전문
            </span>
            <ChevronDown
              className={[
                "h-5 w-5 text-(--oboon-text-muted) transition-transform duration-200",
                termsAccordionOpen ? "rotate-180" : "",
              ].join(" ")}
            />
          </button>
          {termsAccordionOpen ? (
            <div className="mt-3 max-h-64 overflow-y-auto rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle) px-3 py-3">
              <p className="ob-typo-caption whitespace-pre-wrap text-(--oboon-text-muted)">
                {agentTerms?.content || "약관을 불러오는 중..."}
              </p>
            </div>
          ) : null}
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

export default function AgentConsultationsPage() {
  return (
    <Suspense fallback={<div className="min-h-[1px]" />}>
      <AgentConsultationsPageContent />
    </Suspense>
  );
}
