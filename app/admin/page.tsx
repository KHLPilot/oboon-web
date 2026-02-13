// app/admin/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { approveAgent, restoreAccount } from "./serverActions";
import { fetchAdminDashboardData } from "@/features/admin/services/admin.dashboard";
import { DEFAULT_AVATAR_URL, getAvatarUrlOrDefault } from "@/shared/imageUrl";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import OboonDatePicker from "@/components/ui/DatePicker";
import Modal from "@/components/ui/Modal";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import SettlementDetailModal from "@/features/admin/components/SettlementDetailModal";
import ReservationDetailModal from "@/features/admin/components/ReservationDetailModal";
import { toKoreanErrorMessage } from "@/shared/errorMessage";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Calendar,
  CalendarDays,
  ChevronDown,
  Edit3,
  FileText,
  Loader2,
  RefreshCw,
  Search,
  Scale,
  User,
  Users,
} from "lucide-react";

type Profile = {
  id: string;
  name: string | null;
  email: string;
  phone_number: string | null;
  role: string;
  created_at: string;
  deleted_at: string | null;
};

type PropertyAgent = {
  id: string;
  property_id: number;
  agent_id: string;
  request_type: "publish" | "delete";
  status: "pending" | "approved" | "rejected";
  reason?: string | null;
  rejection_reason?: string | null;
  requested_at: string;
  properties: {
    id: number;
    name: string;
    progressPercent?: number;
    inputCount?: number;
    totalCount?: number;
  } | null;
  profiles: {
    id: string;
    name: string;
    email: string;
    role?: string | null;
  } | null;
};

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

type SettlementSummary = {
  rewardPendingCount: number;
  refundPendingCount: number;
  noShowPendingCount: number;
};

type SettlementRow = {
  id: string;
  status: string;
  scheduled_at: string;
  scheduled_at_label: string;
  deposit_label: string;
  deposit_tone: "primary" | "success" | "warning" | "danger" | "muted";
  reward_label: string;
  reward_tone: "primary" | "success" | "warning" | "danger" | "muted";
  reason: string;
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

type Term = {
  id: string;
  type: string;
  version: number;
  title: string;
  content: string;
  is_active: boolean;
  updated_at: string;
  created_at: string;
};

function roleLabel(role: string) {
  switch (role) {
    case "admin":
      return "관리자";
    case "user":
      return "일반 사용자";
    case "agent_pending":
      return "대행사 직원 (승인 대기)";
    case "agent":
      return "대행사 직원";
    default:
      return role;
  }
}

function roleSortKey(role: string) {
  // 사람이 보는 라벨 기준으로 정렬
  return roleLabel(role);
}

function termTypeLabel(type: string) {
  switch (type) {
    case "customer_reservation":
      return "고객용 예약금 안내";
    case "agent_visit_fee":
      return "상담사용 방문성과비 약관";
    case "signup_terms":
      return "회원가입 - 서비스 이용약관";
    case "signup_privacy":
      return "회원가입 - 개인정보 수집·이용";
    case "signup_location":
      return "회원가입 - 위치정보 이용";
    case "signup_marketing":
      return "회원가입 - 마케팅 수신 (선택)";
    default:
      return type;
  }
}

function getErrorMessage(error: unknown, fallback: string) {
  return toKoreanErrorMessage(error, fallback);
}


type ConfirmKind = "approve" | "restore";
type ConfirmState =
  | { open: false }
  | {
      open: true;
      kind: ConfirmKind;
      userId: string;
      title: string;
      description: string;
      confirmLabel: string;
    };

const ADMIN_TABS = [
  { id: "summary", label: "요약" },
  { id: "users", label: "사용자 관리" },
  { id: "properties", label: "현장 관리" },
  { id: "reservations", label: "예약 관리" },
  { id: "settlements", label: "정산 관리" },
  { id: "terms", label: "약관 관리" },
] as const;

export default function AdminPage() {
  return (
    <ToastProvider>
      <AdminPageInner />
    </ToastProvider>
  );
}

function AdminPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [propertyAgents, setPropertyAgents] = useState<PropertyAgent[]>([]);
  const [publishedPropertyCount, setPublishedPropertyCount] = useState(0);
  const [todayNewConsultations, setTodayNewConsultations] = useState(0);
  const [todayVisitConsultations, setTodayVisitConsultations] = useState(0);
  const [todayNewQnaCount, setTodayNewQnaCount] = useState(0);
  const [pendingQnaCount, setPendingQnaCount] = useState(0);
  const [deletedUsers, setDeletedUsers] = useState<Profile[]>([]);
  const [activeUsers, setActiveUsers] = useState<Profile[]>([]);
  const [roleSort, setRoleSort] = useState<"none" | "asc" | "desc">("none");
  const [searchQuery, setSearchQuery] = useState("");
  const [propertyStatusFilter, setPropertyStatusFilter] = useState<
    "all" | "pending" | "rejected" | "approved"
  >("all");
  const [confirm, setConfirm] = useState<ConfirmState>({ open: false });
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [propertyAgentAction, setPropertyAgentAction] = useState<{
    id: string;
    action: "approve" | "reject";
    loading: boolean;
  } | null>(null);
  const [reservations, setReservations] = useState<ReservationRow[]>([]);
  const [reservationsLoading, setReservationsLoading] = useState(false);
  const [reservationAction, setReservationAction] = useState<{
    id: string;
    action: "approve" | "reject";
    loading: boolean;
  } | null>(null);
  const [reservationStatus, setReservationStatus] = useState("all");
  const [reservationDate, setReservationDate] = useState<Date | null>(null);
  const [reservationAgentQuery, setReservationAgentQuery] = useState("");
  const [reservationPage, setReservationPage] = useState(1);
  const [selectedReservation, setSelectedReservation] =
    useState<ReservationRow | null>(null);
  const [settlementLoading, setSettlementLoading] = useState(false);
  const [settlementSummary, setSettlementSummary] = useState<SettlementSummary>({
    rewardPendingCount: 0,
    refundPendingCount: 0,
    noShowPendingCount: 0,
  });
  const [settlementRows, setSettlementRows] = useState<SettlementRow[]>([]);
  const [selectedSettlement, setSelectedSettlement] =
    useState<SettlementRow | null>(null);
  const [resolvedPropertyRequests, setResolvedPropertyRequests] = useState<
    Record<string, boolean>
  >({});

  // 약관 관리 상태
  const [terms, setTerms] = useState<Term[]>([]);
  const [termsLoading, setTermsLoading] = useState(false);
  const [editingTerm, setEditingTerm] = useState<Term | null>(null);
  const [termSaving, setTermSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);

    const data = await fetchAdminDashboardData();

    if (!data.user) {
      router.push("/");
      return;
    }

    if (data.role !== "admin") {
      router.push("/");
      return;
    }

    setPropertyAgents(data.propertyAgents);
    setPublishedPropertyCount(data.publishedPropertyCount);
    setTodayNewConsultations(data.todayNewConsultations);
    setTodayVisitConsultations(data.todayVisitConsultations);
    setTodayNewQnaCount(data.todayNewQnaCount);
    setPendingQnaCount(data.pendingQnaCount);
    setDeletedUsers(data.deletedUsers);
    setActiveUsers(data.activeUsers);
    setResolvedPropertyRequests({});
    setLoading(false);
  }, [router]);

  const closeConfirm = () => {
    if (confirmLoading) return;
    setConfirm({ open: false });
  };

  // 약관 목록 로드
  const loadTerms = useCallback(async () => {
    setTermsLoading(true);
    try {
      const response = await fetch("/api/admin/terms");
      const data = await response.json();
      if (response.ok) {
        setTerms(data.terms || []);
      }
    } catch (err) {
      console.error("약관 조회 오류:", err);
    } finally {
      setTermsLoading(false);
    }
  }, []);

  // 약관 저장
  const saveTerm = async () => {
    if (!editingTerm) return;
    setTermSaving(true);
    try {
      const response = await fetch("/api/admin/terms", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingTerm.id,
          title: editingTerm.title,
          content: editingTerm.content,
        }),
      });
      if (response.ok) {
        toast.success("약관이 저장되었습니다", "완료");
        setEditingTerm(null);
        await loadTerms();
      } else {
        const data = await response.json();
        toast.error(data.error || "저장에 실패했습니다", "오류");
      }
    } catch (err) {
      console.error("약관 저장 오류:", err);
      toast.error("저장 중 오류가 발생했습니다", "오류");
    } finally {
      setTermSaving(false);
    }
  };

  const openRestoreConfirm = (u: Profile) => {
    setConfirm({
      open: true,
      kind: "restore",
      userId: u.id,
      title: "복구 확인",
      description: `${u.name ?? "-"} (${u.email}) 계정을 복구할까요?`,
      confirmLabel: "복구하기",
    });
  };

  const onConfirm = async () => {
    if (!confirm.open) return;
    try {
      setConfirmLoading(true);
      const formData = new FormData();
      formData.append("userId", confirm.userId);
      const result =
        confirm.kind === "approve"
          ? await approveAgent(formData)
          : await restoreAccount(formData);

      if (result?.error) {
        toast.error(result.error, "작업 실패");
        return;
      }

      // 성공: 모달 닫기 + 데이터 재로딩(토스트가 보이도록)
      setConfirm({ open: false });
      await loadData();
      router.refresh();
      toast.success(
        confirm.kind === "approve"
          ? "승인이 완료되었습니다."
          : "복구가 완료되었습니다.",
        "완료",
      );
    } finally {
      setConfirmLoading(false);
    }
  };

  const handlePropertyAgentApprove = async (
    propertyAgentId: string,
    requestType: "publish" | "delete",
  ) => {
    setPropertyAgentAction({
      id: propertyAgentId,
      action: "approve",
      loading: true,
    });
    try {
      const response = await fetch(
        `/api/property-requests/${propertyAgentId}`,
        {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "승인에 실패했습니다");
      }

      toast.success(
        requestType === "delete" ? "삭제 요청이 승인되었습니다" : "게시 요청이 승인되었습니다",
        "완료",
      );
      setResolvedPropertyRequests((prev) => ({
        ...prev,
        [propertyAgentId]: true,
      }));
      await loadData();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "승인에 실패했습니다"), "오류");
    } finally {
      setPropertyAgentAction(null);
    }
  };

  const handlePropertyAgentReject = async (
    propertyAgentId: string,
    requestType: "publish" | "delete",
  ) => {
    const reason = prompt("거절 사유를 입력해주세요:");
    if (!reason) return;

    setPropertyAgentAction({
      id: propertyAgentId,
      action: "reject",
      loading: true,
    });
    try {
      const response = await fetch(
        `/api/property-requests/${propertyAgentId}`,
        {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "rejected", rejection_reason: reason }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "거절에 실패했습니다");
      }

      toast.success(
        requestType === "delete" ? "삭제 요청이 반려되었습니다" : "게시 요청이 반려되었습니다",
        "완료",
      );
      setResolvedPropertyRequests((prev) => ({
        ...prev,
        [propertyAgentId]: true,
      }));
      await loadData();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "거절에 실패했습니다"), "오류");
    } finally {
      setPropertyAgentAction(null);
    }
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadReservations = useCallback(async () => {
    setReservationsLoading(true);
    try {
      const response = await fetch("/api/consultations?role=admin");
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "예약 조회 실패");
      }
      setReservations((data.consultations || []) as ReservationRow[]);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "예약 조회 실패"), "오류");
    } finally {
      setReservationsLoading(false);
    }
  }, [toast]);

  const reservationStatusLabel: Record<string, string> = {
    requested: "승인 요청",
    pending: "예약 대기",
    confirmed: "예약 확정",
    visited: "방문 완료",
    contracted: "계약 완료",
    cancelled: "취소됨",
    no_show: "노쇼",
  };

  const loadSettlements = useCallback(async () => {
    setSettlementLoading(true);
    try {
      const response = await fetch("/api/admin/settlements");
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "정산 데이터 조회 실패");
      }
      setSettlementSummary(
        (data.summary || {
          rewardPendingCount: 0,
          refundPendingCount: 0,
          noShowPendingCount: 0,
        }) as SettlementSummary,
      );
      setSettlementRows((data.rows || []) as SettlementRow[]);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "정산 데이터 조회 실패"), "오류");
    } finally {
      setSettlementLoading(false);
    }
  }, [toast]);

  const handleReservationApprove = async (reservationId: string) => {
    setReservationAction({ id: reservationId, action: "approve", loading: true });
    try {
      const response = await fetch(`/api/consultations/${reservationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "pending" }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "예약 요청 승인에 실패했습니다");
      }

      toast.success("예약 요청을 승인했습니다", "완료");
      setSelectedReservation((prev) =>
        prev?.id === reservationId ? { ...prev, status: "pending" } : prev,
      );
      await loadReservations();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "예약 요청 승인에 실패했습니다"), "오류");
    } finally {
      setReservationAction(null);
    }
  };

  const handleReservationReject = async (
    reservationId: string,
    rejectionReason: string,
  ) => {
    setReservationAction({ id: reservationId, action: "reject", loading: true });
    try {
      const response = await fetch(`/api/consultations/${reservationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "cancelled",
          rejection_reason: rejectionReason,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "예약 요청 거절에 실패했습니다");
      }

      toast.success("예약 요청을 거절했습니다", "완료");
      setSelectedReservation((prev) =>
        prev?.id === reservationId ? { ...prev, status: "cancelled" } : prev,
      );
      await loadReservations();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "예약 요청 거절에 실패했습니다"), "오류");
      throw error;
    } finally {
      setReservationAction(null);
    }
  };

  const filteredReservations = useMemo(() => {
    const query = reservationAgentQuery.trim().toLowerCase();
    const formatLocalDate = (date: Date) =>
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
        date.getDate(),
      ).padStart(2, "0")}`;
    return reservations
      .filter((r) => {
        if (reservationStatus !== "all" && r.status !== reservationStatus) {
          return false;
        }
        if (reservationDate) {
          const local = formatLocalDate(new Date(r.scheduled_at));
          if (local !== formatLocalDate(reservationDate)) return false;
        }
        if (query) {
          const name = (r.agent?.name ?? "").toLowerCase();
          if (!name.includes(query)) return false;
        }
        return true;
      })
      .sort(
        (a, b) =>
          new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime(),
      );
  }, [reservations, reservationStatus, reservationDate, reservationAgentQuery]);

  const reservationPageSize = 10;
  const reservationTotal = filteredReservations.length;
  const reservationPageCount = Math.max(
    1,
    Math.ceil(reservationTotal / reservationPageSize),
  );
  const reservationPageSafe = Math.min(
    reservationPage,
    reservationPageCount,
  );
  const reservationStart = (reservationPageSafe - 1) * reservationPageSize;
  const reservationEnd = reservationStart + reservationPageSize;
  const reservationSlice = filteredReservations.slice(
    reservationStart,
    reservationEnd,
  );

  const toggleRoleSort = () => {
    setRoleSort((prev) =>
      prev === "none" ? "asc" : prev === "asc" ? "desc" : "none",
    );
  };

  const sortedActiveUsers = useMemo(() => {
    if (roleSort === "none") return activeUsers;
    const dir = roleSort === "asc" ? 1 : -1;
    return [...activeUsers].sort(
      (a, b) =>
        roleSortKey(a.role).localeCompare(roleSortKey(b.role), "ko-KR") * dir,
    );
  }, [activeUsers, roleSort]);

  const filteredActiveUsers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return sortedActiveUsers;
    return sortedActiveUsers.filter((u) => {
      const name = (u.name ?? "").toLowerCase();
      const email = u.email.toLowerCase();
      const phone = (u.phone_number ?? "").toLowerCase();
      return (
        name.includes(query) || email.includes(query) || phone.includes(query)
      );
    });
  }, [searchQuery, sortedActiveUsers]);

  const userGrowth = useMemo(() => {
    const total = activeUsers.length;
    if (total === 0) {
      return { total: 0, delta: 0, percent: 0 };
    }
    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const newToday = activeUsers.filter(
      (u) => new Date(u.created_at) >= startOfToday,
    ).length;
    const yesterdayTotal = Math.max(total - newToday, 0);
    const percent = yesterdayTotal
      ? Math.round((newToday / yesterdayTotal) * 1000) / 10
      : 0;
    return { total, delta: newToday, percent };
  }, [activeUsers]);

  const pendingPropertyAgentCount = useMemo(
    () => propertyAgents.filter((pa) => pa.status === "pending").length,
    [propertyAgents],
  );

  const propertyCards = useMemo(() => {
    const cards = propertyAgents.map((pa) => ({
      id: pa.id,
      propertyId: pa.property_id,
      requestType: pa.request_type,
      title: pa.properties?.name || "-",
      progressPercent: pa.properties?.progressPercent ?? null,
      inputCount: pa.properties?.inputCount ?? null,
      totalCount: pa.properties?.totalCount ?? null,
      agent: pa.profiles?.name || "-",
      agentRole: pa.profiles?.role ?? null,
      email: pa.profiles?.email || "-",
      requestedAt: pa.requested_at,
      status: pa.status,
      reason: pa.reason ?? null,
      rejectionReason: pa.rejection_reason ?? null,
    }));

    const latestPerProperty = new Map<number, (typeof cards)[number]>();
    cards.forEach((card) => {
      const prev = latestPerProperty.get(card.propertyId);
      if (!prev) {
        latestPerProperty.set(card.propertyId, card);
        return;
      }
      const prevPriority = prev.status === "pending" ? 2 : 1;
      const nextPriority = card.status === "pending" ? 2 : 1;
      if (nextPriority > prevPriority) {
        latestPerProperty.set(card.propertyId, card);
        return;
      }
      if (
        nextPriority === prevPriority &&
        new Date(card.requestedAt).getTime() > new Date(prev.requestedAt).getTime()
      ) {
        latestPerProperty.set(card.propertyId, card);
      }
    });

    const deduped = Array.from(latestPerProperty.values()).sort(
      (a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime(),
    );
    if (propertyStatusFilter === "all") return deduped;
    return deduped.filter((card) => card.status === propertyStatusFilter);
  }, [propertyAgents, propertyStatusFilter]);

  const propertyProgress = (status: PropertyAgent["status"]) => {
    switch (status) {
      case "pending":
        return 40;
      case "rejected":
        return 40;
      case "approved":
        return 100;
      default:
        return 0;
    }
  };

  const getCardProgress = (card: (typeof propertyCards)[number]) =>
    card.progressPercent ?? propertyProgress(card.status);

  const getInputStatusLabel = (card: (typeof propertyCards)[number]) => {
    if (card.inputCount == null || card.totalCount == null) return "입력중";
    return card.inputCount === card.totalCount
      ? "입력 완료"
      : `입력 상태 ${card.inputCount}/${card.totalCount}`;
  };

  const propertyStateLabel = (
    requestType: PropertyAgent["request_type"],
    status: PropertyAgent["status"],
    requesterRole?: string | null,
  ) => {
    if (requestType === "publish") {
      if (status === "pending") {
        return requesterRole === "admin" ? "게시" : "게시 요청";
      }
      if (status === "approved") return "게시됨";
      if (status === "rejected") return "게시 반려";
    }
    if (requestType === "delete") {
      if (status === "pending") return "삭제 요청";
      if (status === "approved") return "삭제 완료";
      if (status === "rejected") return "삭제 반려";
    }
    return status;
  };

  const propertyStateVariant = (
    requestType: PropertyAgent["request_type"],
    status: PropertyAgent["status"],
  ): "status" | "warning" | "danger" | "success" => {
    if (requestType === "delete") {
      if (status === "pending") return "danger";
      if (status === "approved") return "danger";
      if (status === "rejected") return "warning";
    }
    if (status === "pending") return "warning";
    if (status === "approved") return "success";
    if (status === "rejected") return "danger";
    return "status";
  };

  const requesterRoleLabel = (role?: string | null) => {
    switch (role) {
      case "admin":
        return "관리자";
      case "agent":
        return "분양상담사";
      default:
        return role ?? "-";
    }
  };

  const tabs = ADMIN_TABS;

  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]["id"]>(
    "summary",
  );
  const validReservationStatuses = useMemo(
    () =>
      new Set([
        "all",
        "requested",
        "pending",
        "confirmed",
        "visited",
        "contracted",
        "cancelled",
        "no_show",
      ]),
    [],
  );

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && tabs.some((item) => item.id === tab)) {
      setActiveTab(tab as (typeof tabs)[number]["id"]);
    }

    const status = searchParams.get("reservationStatus");
    if (status && validReservationStatuses.has(status)) {
      setReservationStatus(status);
    }
  }, [searchParams, tabs, validReservationStatuses]);

  const refreshCurrentTab = useCallback(() => {
    loadData();
    if (activeTab === "reservations") {
      void loadReservations();
    }
    if (activeTab === "settlements" || activeTab === "summary") {
      void loadSettlements();
    }
  }, [activeTab, loadData, loadReservations, loadSettlements]);

  useEffect(() => {
    if (activeTab === "reservations") {
      void loadReservations();
    }
    if (activeTab === "settlements" || activeTab === "summary") {
      void loadSettlements();
    }
  }, [activeTab, loadReservations, loadSettlements]);

  const settlementSummaryCards = useMemo(
    () => [
      {
        label: "방문 보상 지급 대기",
        count: settlementSummary.rewardPendingCount,
        icon: <RefreshCw className="h-4 w-4 text-(--oboon-primary)" />,
      },
      {
        label: "고객 예약금 환급 대기",
        count: settlementSummary.refundPendingCount,
        icon: <RefreshCw className="h-4 w-4 text-(--oboon-primary)" />,
      },
      {
        label: "노쇼 판정 필요",
        count: settlementSummary.noShowPendingCount,
        icon: <Scale className="h-4 w-4 text-(--oboon-danger)" />,
      },
    ],
    [settlementSummary],
  );

  const getSettlementStatusBadgeVariant = (
    row: SettlementRow,
  ): "default" | "status" | "success" | "warning" | "danger" => {
    if (row.status === "no_show") {
      return "danger";
    }
    if (row.reward_label === "보상 지급 대기" || row.deposit_label === "환급 대기") {
      // Badge 컴포넌트에서 success를 primary(파란색) 스타일로 사용 중
      return "success";
    }
    return "status";
  };

  const getReservationStatusBadgeVariant = (
    status: string,
  ): "default" | "status" | "success" | "warning" | "danger" => {
    if (status === "requested") {
      // Badge 컴포넌트에서 success를 primary(파란색) 스타일로 사용 중
      return "success";
    }
    return "status";
  };

  // 약관 탭 활성화 시 약관 로드
  useEffect(() => {
    if (activeTab === "terms") {
      loadTerms();
    }
  }, [activeTab, loadTerms]);

  if (loading) {
    return (
      <div className="py-16 text-center ob-typo-body text-(--oboon-text-muted)">
        로딩 중...
      </div>
    );
  }

  const TableShell = ({
    children,
    className = "",
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <div className="overflow-x-auto scrollbar-none">
      <table
        className={[
          "w-full min-w-[720px] ob-typo-body border-collapse",
          className,
        ].join(" ")}
      >
        {children}
      </table>
    </div>
  );

  const Th = ({
    children,
    className = "",
    ...rest
  }: React.ThHTMLAttributes<HTMLTableCellElement>) => (
    <th
      {...rest}
      className={[
        "py-3 px-3 text-left font-semibold",
        "text-(--oboon-text-title)",
        "border-b border-(--oboon-border-default)",
        className,
      ].join(" ")}
    >
      {children}
    </th>
  );

  const Td = ({
    children,
    className = "",
    ...rest
  }: React.TdHTMLAttributes<HTMLTableCellElement>) => (
    <td
      {...rest}
      className={[
        "py-3 px-3 align-middle",
        "text-(--oboon-text-body)",
        "border-b border-(--oboon-border-default)",
        className,
      ].join(" ")}
    >
      {children}
    </td>
  );

  const Avatar = ({
    name,
    url,
  }: {
    name?: string | null;
    url?: string | null;
  }) => {
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
  };

  return (
    <div className="bg-(--oboon-bg-default)">
      <Modal
        open={confirm.open}
        onClose={closeConfirm}
        showCloseIcon={!confirmLoading}
      >
        {confirm.open && (
          <>
            <div className="ob-typo-subtitle text-(--oboon-text-title)">
              {confirm.title}
            </div>
            <p className="mt-2 ob-typo-body text-(--oboon-text-muted)">
              {confirm.description}
            </p>
            <div className="mt-5 flex gap-2">
              <Button
                className="flex-1"
                variant="secondary"
                onClick={closeConfirm}
                disabled={confirmLoading}
              >
                취소
              </Button>
              <Button
                className="flex-1"
                variant="primary"
                loading={confirmLoading}
                onClick={onConfirm}
              >
                {confirm.confirmLabel}
              </Button>
            </div>
          </>
        )}
      </Modal>
      <SettlementDetailModal
        open={Boolean(selectedSettlement)}
        onClose={() => setSelectedSettlement(null)}
        row={selectedSettlement}
        statusLabelMap={reservationStatusLabel}
      />
      <ReservationDetailModal
        open={Boolean(selectedReservation)}
        onClose={() => setSelectedReservation(null)}
        row={selectedReservation}
        statusLabelMap={reservationStatusLabel}
        onApprove={handleReservationApprove}
        onReject={handleReservationReject}
        approving={Boolean(
          reservationAction?.id === selectedReservation?.id &&
            reservationAction?.action === "approve" &&
            reservationAction?.loading,
        )}
        rejecting={Boolean(
          reservationAction?.id === selectedReservation?.id &&
            reservationAction?.action === "reject" &&
            reservationAction?.loading,
        )}
      />
      <div className="mx-auto w-full max-w-6xl px-4 pb-16">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <div className="ob-typo-h1 text-(--oboon-text-title)">
              관리자 대시보드
            </div>
            <p className="mt-1 ob-typo-body text-(--oboon-text-muted)">
              승인/복구 및 사용자 현황을 관리합니다.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">
          <aside className="hidden lg:block h-fit">
            <div className="rounded-2xl">
              <div className="space-y-0.5">
                {tabs.map((tab) => (
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
                        activeTab === tab.id
                          ? "bg-(--oboon-bg-subtle) py-1"
                          : "",
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

          <section className="min-w-0 space-y-4">
            <div className="lg:hidden">
              <div className="flex max-w-full gap-2 overflow-x-auto pb-2 scrollbar-none">
                {tabs.map((tab) => (
                  <Button
                    key={tab.id}
                    type="button"
                    size="sm"
                    shape="pill"
                    variant={activeTab === tab.id ? "primary" : "secondary"}
                    className="shrink-0"
                    onClick={() => setActiveTab(tab.id)}
                  >
                    {tab.label}
                  </Button>
                ))}
              </div>
            </div>
            {activeTab === "summary" && (
              <>
                <div className="flex items-center justify-between">
                  <div className="ob-typo-h2 text-(--oboon-text-title)">요약</div>
                  <Button
                    variant="secondary"
                    size="sm"
                    shape="pill"
                    className="h-9 w-9 p-0 rounded-full"
                    onClick={refreshCurrentTab}
                    aria-label="새로고침"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
                <Card className="p-5">
                  <div className="ob-typo-caption text-(--oboon-text-muted)">
                    OVERVIEW
                  </div>
                  <div className="mt-1 ob-typo-h3 text-(--oboon-text-title)">
                    오늘의 운영 요약
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
                  <Card className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-(--oboon-text-title)">
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-(--oboon-bg-subtle)">
                          <Users className="h-4 w-4 text-(--oboon-primary)" />
                        </span>
                        <span className="ob-typo-subtitle">전체 사용자</span>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        shape="pill"
                        className="h-8 w-8 p-0 rounded-full"
                        onClick={() => setActiveTab("users")}
                        aria-label="사용자 관리로 이동"
                      >
                        <ArrowRight className="h-4 w-4 text-(--oboon-text-muted)" />
                      </Button>
                    </div>
                    <div className="mt-3 flex items-center gap-4">
                      <div className="ob-typo-h2 text-(--oboon-text-title)">
                        {userGrowth.total.toLocaleString()}명
                      </div>
                      <span className="rounded-full border border-(--oboon-border-default) bg-(--oboon-bg-subtle) px-2 py-0.5 ob-typo-caption text-(--oboon-text-muted)">
                        ↗ +{userGrowth.delta}명
                      </span>
                    </div>
                    <div className="mt-2 ob-typo-caption text-(--oboon-text-muted)">
                      어제 대비 {userGrowth.percent}% 증가
                    </div>
                  </Card>
                  <Card className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-(--oboon-text-title)">
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-(--oboon-bg-subtle)">
                          <Building2 className="h-4 w-4 text-(--oboon-primary)" />
                        </span>
                        <span className="ob-typo-subtitle">현장 등록 현황</span>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        shape="pill"
                        className="h-8 w-8 p-0 rounded-full"
                        onClick={() => setActiveTab("properties")}
                        aria-label="현장 관리로 이동"
                      >
                        <ArrowRight className="h-4 w-4 text-(--oboon-text-muted)" />
                      </Button>
                    </div>
                    <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                      <div>
                        <div className="ob-typo-caption text-(--oboon-text-muted)">
                          승인 대기
                        </div>
                        <div className="mt-1 ob-typo-h3 text-(--oboon-text-title)">
                          {pendingPropertyAgentCount}건
                        </div>
                      </div>
                      <div className="h-10 w-px bg-(--oboon-border-default)" />
                      <div>
                        <div className="ob-typo-caption text-(--oboon-text-muted)">
                          현재 게시된 현장
                        </div>
                        <div className="mt-1 ob-typo-h3 text-(--oboon-text-title)">
                          {publishedPropertyCount}건
                        </div>
                      </div>
                    </div>
                  </Card>
                  <div className="grid grid-cols-1 gap-3 sm:col-span-2 sm:grid-cols-2">
                    <Card className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-(--oboon-text-title)">
                          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-(--oboon-bg-subtle)">
                            <CalendarDays className="h-4 w-4 text-(--oboon-primary)" />
                          </span>
                          <span className="ob-typo-subtitle">오늘 예약</span>
                        </div>
                        <Button
                          variant="secondary"
                          size="sm"
                          shape="pill"
                          className="h-8 w-8 p-0 rounded-full"
                          onClick={() => setActiveTab("reservations")}
                          aria-label="예약 관리로 이동"
                        >
                          <ArrowRight className="h-4 w-4 text-(--oboon-text-muted)" />
                        </Button>
                      </div>

                      <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                        <div>
                          <div className="ob-typo-caption text-(--oboon-text-muted)">
                            신규 예약
                          </div>
                          <div className="mt-1 ob-typo-h3 text-(--oboon-text-title)">
                            {todayNewConsultations}건
                          </div>
                        </div>
                        <div className="h-10 w-px bg-(--oboon-border-default)" />
                        <div>
                          <div className="ob-typo-caption text-(--oboon-text-muted)">
                            오늘 방문 예정
                          </div>
                          <div className="mt-1 ob-typo-h3 text-(--oboon-text-title)">
                            {todayVisitConsultations}건
                          </div>
                        </div>
                      </div>
                    </Card>

                    <Card className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-(--oboon-text-title)">
                          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-(--oboon-bg-subtle)">
                            <FileText className="h-4 w-4 text-(--oboon-primary)" />
                          </span>
                          <span className="ob-typo-subtitle">1:1 문의</span>
                        </div>
                        <Button
                          variant="secondary"
                          size="sm"
                          shape="pill"
                          className="h-8 w-8 p-0 rounded-full"
                          onClick={() => router.push("/support/qna")}
                          aria-label="고객센터로 이동"
                        >
                          <ArrowRight className="h-4 w-4 text-(--oboon-text-muted)" />
                        </Button>
                      </div>

                      <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                        <div>
                          <div className="ob-typo-caption text-(--oboon-text-muted)">
                            오늘 신규 문의
                          </div>
                          <div className="mt-1 ob-typo-h3 text-(--oboon-text-title)">
                            {todayNewQnaCount}건
                          </div>
                        </div>
                        <div className="h-10 w-px bg-(--oboon-border-default)" />
                        <div>
                          <div className="ob-typo-caption text-(--oboon-text-muted)">
                            답변 대기
                          </div>
                          <div className="mt-1 ob-typo-h3 text-(--oboon-text-title)">
                            {pendingQnaCount}건
                          </div>
                        </div>
                      </div>
                    </Card>
                  </div>
                  <Card className="p-4 sm:col-span-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-(--oboon-text-title)">
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-(--oboon-bg-subtle)">
                          <AlertTriangle className="h-4 w-4 text-(--oboon-danger)" />
                        </span>
                        <span className="ob-typo-subtitle">정산 처리 필요 목록</span>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        shape="pill"
                        className="h-8 w-8 p-0 rounded-full"
                        onClick={() => setActiveTab("settlements")}
                        aria-label="정산 관리로 이동"
                      >
                        <ArrowRight className="h-4 w-4 text-(--oboon-text-muted)" />
                      </Button>
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                      {settlementSummaryCards.map((item) => (
                        <Card key={`summary-${item.label}`} className="p-4 shadow-none">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <span
                                className={[
                                  "h-8 w-8 rounded-lg border",
                                  "inline-flex items-center justify-center",
                                  "bg-(--oboon-bg-subtle) border-(--oboon-border-default)",
                                ].join(" ")}
                              >
                                {item.icon}
                              </span>
                              <span className="ob-typo-h4 text-(--oboon-text-title)">
                                {item.label}
                              </span>
                            </div>
                            <span className="ob-typo-body text-(--oboon-text-title)">
                              {item.count}건
                            </span>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </Card>
                </div>
              </>
            )}

            {activeTab === "users" && (
              <>
                <Card className="p-0 bg-transparent border-0 shadow-none">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="ob-typo-h2 text-(--oboon-text-title)">
                        사용자 관리
                      </div>
                      <p className="mt-1 ob-typo-caption text-(--oboon-text-muted)">
                        승인 대기/탈퇴 사용자 및 전체 사용자 현황
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      shape="pill"
                      className="h-9 w-9 p-0 rounded-full"
                      onClick={refreshCurrentTab}
                      aria-label="새로고침"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>

                {deletedUsers.length > 0 && (
                  <Card className="p-5 border-(--oboon-warning-border) shadow-none">
                    <div className="flex items-center justify-between gap-3">
                      <div className="ob-typo-body text-(--oboon-text-title)">
                        탈퇴(비활성) 사용자
                      </div>
                      <Badge variant="status">{deletedUsers.length}명</Badge>
                    </div>
                    <div className="mt-4">
                      <TableShell>
                        <thead>
                          <tr>
                            <Th>이름</Th>
                            <Th>이메일</Th>
                            <Th>탈퇴일</Th>
                            <Th className="text-right">작업</Th>
                          </tr>
                        </thead>
                        <tbody>
                          {deletedUsers.map((u) => (
                            <tr key={u.id}>
                              <Td className="text-(--oboon-text-muted)">
                                {u.name || "-"}
                              </Td>
                              <Td className="text-(--oboon-text-muted)">
                                {u.email}
                              </Td>
                              <Td className="ob-typo-caption text-(--oboon-text-muted)">
                                {u.deleted_at
                                  ? new Date(
                                      u.deleted_at,
                                    ).toLocaleDateString()
                                  : "-"}
                              </Td>
                              <Td className="text-right">
                                <Button
                                  size="sm"
                                  shape="pill"
                                  variant="warning"
                                  onClick={() => openRestoreConfirm(u)}
                                >
                                  복구
                                </Button>
                              </Td>
                            </tr>
                          ))}
                        </tbody>
                      </TableShell>
                    </div>
                  </Card>
                )}

                <Card className="p-5 shadow-none">
                  <div className="flex items-center justify-between gap-3">
                    <div className="ob-typo-body text-(--oboon-text-title)">
                      전체 사용자 현황
                    </div>
                    <Badge variant="status">{activeUsers.length}명</Badge>
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <Input
                      placeholder="검색"
                      className="rounded-full bg-(--oboon-bg-default) py-2"
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                    />
                    <button
                      type="button"
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-(--oboon-border-default) bg-(--oboon-bg-default) text-(--oboon-text-muted) transition-colors hover:text-(--oboon-text-title)"
                      aria-label="검색"
                    >
                      <Search className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-4">
                    {activeUsers.length === 0 ? (
                      <div className="ob-typo-body text-(--oboon-text-muted)">
                        사용자가 없습니다.
                      </div>
                    ) : (
                      <TableShell>
                        <thead>
                          <tr>
                            <Th>이름</Th>
                            <Th>이메일</Th>
                            <Th>
                              <button
                                type="button"
                                onClick={toggleRoleSort}
                                className="inline-flex items-center gap-2 hover:text-(--oboon-text-title)"
                                title="계정 유형 정렬"
                              >
                                계정 유형
                                <span
                                  className={[
                                    "ob-typo-caption",
                                    roleSort === "none"
                                      ? "text-(--oboon-text-muted)"
                                      : "text-(--oboon-text-title)",
                                  ].join(" ")}
                                >
                                  {roleSort === "none"
                                    ? "-"
                                    : roleSort === "asc"
                                      ? "▲"
                                      : "▼"}
                                </span>
                              </button>
                            </Th>
                            <Th>가입일</Th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredActiveUsers.map((u) => (
                            <tr key={u.id}>
                              <Td>{u.name || "-"}</Td>
                              <Td className="text-(--oboon-text-muted)">
                                {u.email}
                              </Td>
                              <Td>
                                <Badge variant="status">
                                  {roleLabel(u.role)}
                                </Badge>
                              </Td>
                              <Td className="ob-typo-body text-(--oboon-text-muted)">
                                {new Date(u.created_at).toLocaleDateString()}
                              </Td>
                            </tr>
                          ))}
                        </tbody>
                      </TableShell>
                    )}
                  </div>
                </Card>
              </>
            )}

            {activeTab === "reservations" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="ob-typo-h2 text-(--oboon-text-title)">
                    예약 관리
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    shape="pill"
                    className="h-9 w-9 p-0 rounded-full"
                    onClick={refreshCurrentTab}
                    disabled={reservationsLoading}
                    aria-label="새로고침"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 items-center gap-3 sm:grid-cols-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="secondary"
                        size="md"
                        className="w-full justify-between"
                      >
                        <span>
                          {reservationStatus === "all"
                            ? "모든 상태"
                            : reservationStatusLabel[reservationStatus] ||
                              reservationStatus}
                        </span>
                        <ChevronDown className="h-4 w-4 text-(--oboon-text-muted)" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" matchTriggerWidth>
                      <DropdownMenuItem
                        onClick={() => {
                          setReservationStatus("all");
                          setReservationPage(1);
                        }}
                      >
                        모든 상태
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setReservationStatus("requested");
                          setReservationPage(1);
                        }}
                      >
                        승인 요청
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setReservationStatus("pending");
                          setReservationPage(1);
                        }}
                      >
                        예약 대기
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setReservationStatus("confirmed");
                          setReservationPage(1);
                        }}
                      >
                        예약 확정
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setReservationStatus("visited");
                          setReservationPage(1);
                        }}
                      >
                        방문 완료
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setReservationStatus("contracted");
                          setReservationPage(1);
                        }}
                      >
                        계약 완료
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setReservationStatus("cancelled");
                          setReservationPage(1);
                        }}
                      >
                        취소됨
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <OboonDatePicker
                    selected={reservationDate}
                    onChange={(date: Date | null) => {
                      setReservationDate(date);
                      setReservationPage(1);
                    }}
                    dateFormat="yyyy-MM-dd"
                    textFormat="yyyy-MM-dd"
                    placeholder="예약일"
                    inputClassName={[
                      "h-11 w-full rounded-xl bg-(--oboon-bg-surface)",
                      "border border-(--oboon-border-default)",
                      "px-4 py-2 text-sm text-(--oboon-text-title)",
                      "placeholder:text-(--oboon-text-muted)",
                    ].join(" ")}
                  />
                  <Input
                    placeholder="상담사명 검색"
                    value={reservationAgentQuery}
                    onChange={(event) => {
                      setReservationAgentQuery(event.target.value);
                      setReservationPage(1);
                    }}
                    className="w-full py-2"
                  />
                </div>

                <Card className="p-4 shadow-none">
                  <div className="overflow-x-auto scrollbar-none">
                    <table className="w-full min-w-[720px] ob-typo-body border-collapse">
                      <thead>
                        <tr>
                          <Th>예약 번호</Th>
                          <Th>상태</Th>
                          <Th>고객 정보</Th>
                          <Th>상담사</Th>
                          <Th>방문 일시</Th>
                          <Th className="text-right"> </Th>
                        </tr>
                      </thead>
                      <tbody>
                        {reservationSlice.map((row) => (
                          <tr key={row.id}>
                            <Td className="text-(--oboon-text-muted)">
                              {row.id.slice(0, 8)}
                            </Td>
                            <Td>
                              <Badge variant={getReservationStatusBadgeVariant(row.status)}>
                                {reservationStatusLabel[row.status] ||
                                  row.status}
                              </Badge>
                            </Td>
                            <Td>
                              <div className="flex items-center gap-2">
                                <Avatar
                                  name={row.customer?.name}
                                  url={row.customer_avatar_url}
                                />
                                <span>{row.customer?.name ?? "-"}</span>
                              </div>
                            </Td>
                            <Td>
                              <div className="flex items-center gap-2">
                                <Avatar
                                  name={row.agent?.name}
                                  url={row.agent_avatar_url}
                                />
                                <span>{row.agent?.name ?? "-"}</span>
                              </div>
                            </Td>
                            <Td className="text-(--oboon-text-muted)">
                              {new Date(row.scheduled_at).toLocaleString(
                                "ko-KR",
                                {
                                  year: "numeric",
                                  month: "2-digit",
                                  day: "2-digit",
                                  weekday: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )}
                            </Td>
                            <Td className="text-right">
                              <button
                                type="button"
                                className="ob-typo-body text-(--oboon-text-muted) hover:text-(--oboon-text-title)"
                                onClick={() => setSelectedReservation(row)}
                                aria-label="예약 상세 보기"
                              >
                                &gt;
                              </button>
                            </Td>
                          </tr>
                        ))}
                        {reservationSlice.length === 0 && (
                          <tr>
                            <Td colSpan={6} className="py-8 text-center">
                              {reservationsLoading
                                ? "불러오는 중..."
                                : "예약이 없습니다."}
                            </Td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <div className="ob-typo-caption text-(--oboon-text-muted)">
                      총 {reservationTotal}개의 예약 중{" "}
                      {reservationTotal === 0
                        ? "0"
                        : `${reservationStart + 1}-${Math.min(
                            reservationEnd,
                            reservationTotal,
                          )}`}{" "}
                      표시
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        shape="pill"
                        disabled={reservationPageSafe <= 1}
                        onClick={() =>
                          setReservationPage(Math.max(1, reservationPageSafe - 1))
                        }
                      >
                        ‹
                      </Button>
                      {Array.from(
                        { length: Math.min(5, reservationPageCount) },
                        (_, i) => i + 1,
                      ).map((page) => (
                        <Button
                          key={`reservation-page-${page}`}
                          variant={page === reservationPageSafe ? "primary" : "secondary"}
                          size="sm"
                          shape="pill"
                          onClick={() => setReservationPage(page)}
                        >
                          {page}
                        </Button>
                      ))}
                      <Button
                        variant="secondary"
                        size="sm"
                        shape="pill"
                        disabled={reservationPageSafe >= reservationPageCount}
                        onClick={() =>
                          setReservationPage(
                            Math.min(
                              reservationPageSafe + 1,
                              reservationPageCount,
                            ),
                          )
                        }
                      >
                        ›
                      </Button>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {activeTab === "properties" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="ob-typo-h2 text-(--oboon-text-title)">
                      현장 관리
                    </div>
                    <Badge variant="status">
                      {pendingPropertyAgentCount}건
                    </Badge>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    shape="pill"
                    className="h-9 w-9 p-0 rounded-full"
                    onClick={refreshCurrentTab}
                    aria-label="새로고침"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  {[
                    { id: "all", label: "전체" },
                    { id: "pending", label: "검토 대기" },
                    { id: "rejected", label: "반려됨" },
                    { id: "approved", label: "게시됨" },
                  ].map((tab) => {
                    const isActive = propertyStatusFilter === tab.id;
                    return (
                      <Button
                        key={tab.id}
                        onClick={() =>
                          setPropertyStatusFilter(
                            tab.id as "all" | "pending" | "rejected" | "approved",
                          )
                        }
                        variant={isActive ? "primary" : "secondary"}
                        size="sm"
                        shape="pill"
                        className="text-xs"
                      >
                        {tab.label}
                      </Button>
                    );
                  })}
                </div>

                {propertyCards.length === 0 ? (
                  <Card className="p-5 shadow-none">
                    <div className="ob-typo-body text-(--oboon-text-muted)">
                      표시할 현장이 없습니다.
                    </div>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {propertyCards.map((card) => (
                      <Card
                        key={card.id}
                        className="p-4 shadow-none cursor-pointer transition-colors hover:bg-(--oboon-bg-subtle)"
                        onClick={() => router.push(`/company/properties/${card.propertyId}`)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="mt-1 min-w-0 flex-1 ob-typo-h3 text-(--oboon-text-title)">
                            <span className="block truncate whitespace-nowrap">
                              {card.title}
                            </span>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <Badge
                              variant={propertyStateVariant(card.requestType, card.status)}
                              className="ob-typo-caption px-2 py-0.5"
                            >
                              {propertyStateLabel(
                                card.requestType,
                                card.status,
                                card.agentRole,
                              )}
                            </Badge>
                            <Badge
                              variant="status"
                              className="ob-typo-caption px-2 py-0.5"
                            >
                              {getInputStatusLabel(card)}
                            </Badge>
                          </div>
                        </div>
                        <div className="mt-2 space-y-1 ob-typo-body text-(--oboon-text-muted)">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-(--oboon-text-muted)" />
                            <span>
                              {card.agent} / {requesterRoleLabel(card.agentRole)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-(--oboon-text-muted)" />
                            <span>
                              {new Date(card.requestedAt).toLocaleString(
                                "ko-KR",
                                {
                                  year: "numeric",
                                  month: "2-digit",
                                  day: "2-digit",
                                  weekday: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )}
                            </span>
                          </div>
                          {card.status === "rejected" && card.rejectionReason ? (
                            <div className="text-(--oboon-danger) ob-typo-body">
                              반려 사유: {card.rejectionReason}
                            </div>
                          ) : null}
                        </div>
                        <div className="mt-3 border-t border-(--oboon-border-default) pt-3">
                          <div className="ob-typo-body text-(--oboon-text-muted)">
                            입력 진행률 · {getCardProgress(card)}%
                          </div>
                          <div className="mt-2 h-2 w-full rounded-full bg-(--oboon-bg-subtle)">
                            <div
                              className="h-2 rounded-full bg-(--oboon-primary)"
                              style={{
                                width: `${getCardProgress(card)}%`,
                              }}
                            />
                          </div>
                          {card.status === "pending" &&
                          !resolvedPropertyRequests[card.id] ? (
                            <div className="mt-3 flex items-center justify-between gap-3">
                              {card.requestType === "delete" && card.reason ? (
                                <div className="ob-typo-body text-(--oboon-danger) truncate">
                                  삭제 사유: {card.reason}
                                </div>
                              ) : (
                                <span />
                              )}
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  shape="pill"
                                  variant="primary"
                                  disabled={
                                    propertyAgentAction?.id === card.id &&
                                    propertyAgentAction?.loading
                                  }
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handlePropertyAgentApprove(card.id, card.requestType);
                                  }}
                                >
                                  승인
                                </Button>
                                <Button
                                  size="sm"
                                  shape="pill"
                                  variant="secondary"
                                  disabled={
                                    propertyAgentAction?.id === card.id &&
                                    propertyAgentAction?.loading
                                  }
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handlePropertyAgentReject(card.id, card.requestType);
                                  }}
                                >
                                  반려
                                </Button>
                              </div>
                            </div>
                          ) : card.requestType === "delete" && card.reason ? (
                            <div className="mt-3 ob-typo-body text-(--oboon-danger)">
                              삭제 사유: {card.reason}
                            </div>
                          ) : null}
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "settlements" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="ob-typo-h2 text-(--oboon-text-title)">
                    정산 관리
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    shape="pill"
                    className="h-9 w-9 p-0 rounded-full"
                    onClick={refreshCurrentTab}
                    aria-label="새로고침"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {settlementSummaryCards.map((item) => (
                    <Card key={item.label} className="p-4 shadow-none">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={[
                              "h-8 w-8 rounded-lg border",
                              "inline-flex items-center justify-center",
                              "bg-(--oboon-bg-subtle) border-(--oboon-border-default)",
                            ].join(" ")}
                          >
                            {item.icon}
                          </span>
                          <span className="ob-typo-h4 text-(--oboon-text-title)">
                            {item.label}
                          </span>
                        </div>
                        <span className="ob-typo-body text-(--oboon-text-title)">
                          {item.count}건
                        </span>
                      </div>
                    </Card>
                  ))}
                </div>

                <Card className="p-4 shadow-none">
                  <div className="overflow-x-auto scrollbar-none">
                    <table className="w-full min-w-[720px] ob-typo-body border-collapse">
                      <thead>
                        <tr>
                          <Th>예약 번호</Th>
                          <Th>예약 상태</Th>
                          <Th>고객 예약금</Th>
                          <Th>방문 보상금</Th>
                          <Th>사유</Th>
                          <Th className="text-right"> </Th>
                        </tr>
                      </thead>
                      <tbody>
                        {settlementRows.map((row) => {
                          const statusBadgeVariant = getSettlementStatusBadgeVariant(row);
                          return (
                          <tr key={`settlement-${row.id}`}>
                            <Td className="text-(--oboon-text-muted)">
                              {row.id.slice(0, 8)}
                            </Td>
                            <Td>
                              <Badge
                                variant={statusBadgeVariant}
                              >
                                {reservationStatusLabel[row.status] || row.status}
                              </Badge>
                            </Td>
                            <Td>
                              <span
                                className={
                                  row.deposit_tone === "primary"
                                    ? "text-(--oboon-primary)"
                                    : row.deposit_tone === "success"
                                      ? "text-(--oboon-success)"
                                      : row.deposit_tone === "warning"
                                        ? "text-(--oboon-warning)"
                                        : row.deposit_tone === "danger"
                                          ? "text-(--oboon-danger)"
                                        : "text-(--oboon-text-muted)"
                                }
                              >
                                {row.deposit_label}
                              </span>
                            </Td>
                            <Td>
                              <span
                                className={
                                  row.reward_tone === "primary"
                                    ? "text-(--oboon-primary)"
                                    : row.reward_tone === "success"
                                      ? "text-(--oboon-success)"
                                      : row.reward_tone === "warning"
                                        ? "text-(--oboon-warning)"
                                        : row.reward_tone === "danger"
                                          ? "text-(--oboon-danger)"
                                        : "text-(--oboon-text-muted)"
                                }
                              >
                                {row.reward_label}
                              </span>
                            </Td>
                            <Td>{row.reason}</Td>
                            <Td className="text-right">
                              <button
                                type="button"
                                className="ob-typo-body text-(--oboon-text-muted) hover:text-(--oboon-text-title)"
                                onClick={() => setSelectedSettlement(row)}
                                aria-label="정산 상세 보기"
                              >
                                &gt;
                              </button>
                            </Td>
                          </tr>
                        )})}
                        {settlementRows.length === 0 && (
                          <tr>
                            <Td colSpan={6} className="py-8 text-center">
                              {settlementLoading
                                ? "불러오는 중..."
                                : "정산 데이터가 없습니다."}
                            </Td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            )}

            {activeTab === "terms" && (
              <>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="ob-typo-h2 text-(--oboon-text-title)">
                        약관 관리
                      </div>
                      <p className="mt-1 ob-typo-caption text-(--oboon-text-muted)">
                        고객 및 상담사에게 표시되는 약관을 관리합니다.
                      </p>
                    </div>
                  </div>
                
                {termsLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-(--oboon-primary)" />
                  </div>
                ) : editingTerm ? (
                  <Card className="p-5">
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <FileText className="h-5 w-5 text-(--oboon-primary)" />
                        <span className="ob-typo-subtitle text-(--oboon-text-title)">
                          {termTypeLabel(editingTerm.type)}
                        </span>
                        <Badge variant="status">v{editingTerm.version}</Badge>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block ob-typo-caption text-(--oboon-text-muted) mb-1">
                          제목
                        </label>
                        <input
                          type="text"
                          value={editingTerm.title}
                          onChange={(e) =>
                            setEditingTerm({
                              ...editingTerm,
                              title: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) text-(--oboon-text-title) ob-typo-body focus:outline-none focus:ring-2 focus:ring-(--oboon-primary)"
                        />
                      </div>

                      <div>
                        <label className="block ob-typo-caption text-(--oboon-text-muted) mb-1">
                          내용
                        </label>
                        <Textarea
                          value={editingTerm.content}
                          onChange={(e) =>
                            setEditingTerm({
                              ...editingTerm,
                              content: e.target.value,
                            })
                          }
                          rows={12}
                          className="w-full px-3 py-2 rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) text-(--oboon-text-title) ob-typo-body focus:outline-none focus:ring-2 focus:ring-(--oboon-primary) resize-none"
                        />
                      </div>

                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="secondary"
                          size="sm"
                          shape="pill"
                          onClick={() => setEditingTerm(null)}
                          disabled={termSaving}
                        >
                          취소
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          shape="pill"
                          onClick={saveTerm}
                          loading={termSaving}
                        >
                          저장
                        </Button>
                      </div>
                    </div>
                  </Card>
                ) : (
                  <div className="space-y-6">
                    {/* 회원가입 약관 */}
                    <div>
                      <div className="ob-typo-subtitle text-(--oboon-text-title) mb-3">
                        회원가입 약관
                      </div>
                      <div className="space-y-3">
                        {terms
                          .filter((t) => t.type.startsWith("signup_"))
                          .map((term) => (
                            <Card key={term.id} className="p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <FileText className="h-4 w-4 text-(--oboon-primary)" />
                                    <span className="ob-typo-body text-(--oboon-text-title)">
                                      {termTypeLabel(term.type)}
                                    </span>
                                    <Badge variant="status">v{term.version}</Badge>
                                    <Badge variant="status">
                                      {term.is_active ? "활성" : "비활성"}
                                    </Badge>
                                  </div>
                                  <div className="mt-1 ob-typo-caption text-(--oboon-text-muted) line-clamp-2">
                                    {term.content.slice(0, 100)}...
                                  </div>
                                </div>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  shape="pill"
                                  onClick={() => setEditingTerm(term)}
                                >
                                  <Edit3 className="h-4 w-4" />
                                  수정
                                </Button>
                              </div>
                            </Card>
                          ))}
                        {terms.filter((t) => t.type.startsWith("signup_"))
                          .length === 0 && (
                          <p className="ob-typo-caption text-(--oboon-text-muted)">
                            회원가입 약관이 없습니다. DB 마이그레이션을 실행해주세요.
                          </p>
                        )}
                      </div>
                    </div>

                    {/* 예약/상담사 약관 */}
                    <div>
                      <div className="ob-typo-subtitle text-(--oboon-text-title) mb-3">
                        예약 · 상담사 약관
                      </div>
                      <div className="space-y-3">
                        {terms
                          .filter((t) => !t.type.startsWith("signup_"))
                          .map((term) => (
                            <Card key={term.id} className="p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <FileText className="h-4 w-4 text-(--oboon-primary)" />
                                    <span className="ob-typo-body text-(--oboon-text-title)">
                                      {termTypeLabel(term.type)}
                                    </span>
                                    <Badge variant="status">v{term.version}</Badge>
                                    <Badge variant="status">
                                      {term.is_active ? "활성" : "비활성"}
                                    </Badge>
                                  </div>
                                  <div className="mt-1 ob-typo-body text-(--oboon-text-title)">
                                    {term.title}
                                  </div>
                                  <div className="mt-1 ob-typo-caption text-(--oboon-text-muted) line-clamp-2">
                                    {term.content.slice(0, 100)}...
                                  </div>
                                </div>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  shape="pill"
                                  onClick={() => setEditingTerm(term)}
                                >
                                  <Edit3 className="h-4 w-4" />
                                  수정
                                </Button>
                              </div>
                            </Card>
                          ))}
                        {terms.filter((t) => !t.type.startsWith("signup_"))
                          .length === 0 && (
                          <p className="ob-typo-caption text-(--oboon-text-muted)">
                            예약/상담사 약관이 없습니다.
                          </p>
                        )}
                      </div>
                    </div>

                    {terms.length === 0 && (
                      <Card className="p-5 text-center">
                        <p className="ob-typo-body text-(--oboon-text-muted)">
                          등록된 약관이 없습니다.
                        </p>
                      </Card>
                    )}
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
