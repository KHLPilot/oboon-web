// app/admin/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { approveAgent, restoreAccount } from "./serverActions";
import {
  fetchAdminDashboardData,
  type AdminPropertyCard,
} from "@/features/admin/services/admin.dashboard";
import {
  type AppraisalKind,
  type AppraisalResultRow,
  type FAQCategory,
  type FAQEditor,
  type FAQItem,
  type NoticeAdminItem,
  type NoticeEditor,
  type Profile,
  type ReservationRow,
  type SettlementRow,
  type SettlementSummary,
  type Term,
} from "@/features/admin/types/dashboard";
import { appraisalKindLabel, roleSortKey } from "@/features/admin/lib/dashboard-labels";

import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import AdminSummaryTab from "@/features/admin/components/AdminSummaryTab";
import AdminUsersTab from "@/features/admin/components/AdminUsersTab";
import AdminReservationsTab from "@/features/admin/components/AdminReservationsTab";
import AdminPropertiesTab from "@/features/admin/components/AdminPropertiesTab";
import AdminSettlementsTab from "@/features/admin/components/AdminSettlementsTab";
import AdminAppraisalsTab from "@/features/admin/components/AdminAppraisalsTab";
import AdminNoticesTab from "@/features/admin/components/AdminNoticesTab";
import AdminFaqTab from "@/features/admin/components/AdminFaqTab";
import AdminTermsTab from "@/features/admin/components/AdminTermsTab";
import AdminRegulationRulesTab from "@/features/admin/components/AdminRegulationRulesTab";
import FaqEditorModal from "@/features/admin/components/FaqEditorModal";
import NoticeEditorModal from "@/features/admin/components/NoticeEditorModal";
import SettlementDetailModal from "@/features/admin/components/SettlementDetailModal";
import ReservationDetailModal from "@/features/admin/components/ReservationDetailModal";
import { type MapMarker } from "@/features/map/components/NaverMap";
import { toKoreanErrorMessage } from "@/shared/errorMessage";
import { deletePropertyById } from "@/features/company/services/property.list";
import AdminPageSkeleton from "@/features/admin/components/AdminPageSkeleton";
import ProfilePageShell from "@/features/profile/components/ProfilePageShell";

function getErrorMessage(error: unknown, fallback: string) {
  return toKoreanErrorMessage(error, fallback);
}

function formatLastSeen(lastSignInAt?: string | null) {
  if (!lastSignInAt) return "미접속";

  const last = new Date(lastSignInAt);
  if (Number.isNaN(last.getTime())) return "미접속";

  const diffMs = Date.now() - last.getTime();
  const safeMs = Math.max(diffMs, 0);
  const diffMinutes = Math.floor(safeMs / (1000 * 60));
  const diffHours = Math.floor(safeMs / (1000 * 60 * 60));
  const diffDays = Math.floor(safeMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 60) {
    return `${Math.max(1, diffMinutes)}분 전`;
  }
  if (diffHours < 24) {
    return `${diffHours}시간 전`;
  }
  if (diffDays <= 7) {
    return `${diffDays}일 전`;
  }
  return "7일 이상 전";
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
  { id: "appraisals", label: "감정평가" },
  { id: "reservations", label: "예약 관리" },
  { id: "settlements", label: "정산 관리" },
  { id: "notices", label: "공지 관리" },
  { id: "terms", label: "약관 관리" },
  { id: "faq", label: "FAQ 관리" },
  { id: "regulations", label: "규제 룰 관리" },
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
  const [allPropertyCards, setAllPropertyCards] = useState<AdminPropertyCard[]>([]);
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
    "all" | "incomplete"
  >("all");
  const [confirm, setConfirm] = useState<ConfirmState>({ open: false });
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [propertyAgentAction, setPropertyAgentAction] = useState<{
    id: string;
    action: "approve" | "reject";
    loading: boolean;
  } | null>(null);
  const [propertyDeleteLoadingId, setPropertyDeleteLoadingId] = useState<number | null>(
    null,
  );
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
  const [faqCategories, setFaqCategories] = useState<FAQCategory[]>([]);
  const [faqItems, setFaqItems] = useState<FAQItem[]>([]);
  const [faqLoading, setFaqLoading] = useState(false);
  const [faqSaving, setFaqSaving] = useState(false);
  const [faqDeletingId, setFaqDeletingId] = useState<string | null>(null);
  const [faqEditor, setFaqEditor] = useState<FAQEditor | null>(null);
  const [noticeItems, setNoticeItems] = useState<NoticeAdminItem[]>([]);
  const [noticeLoading, setNoticeLoading] = useState(false);
  const [noticeSaving, setNoticeSaving] = useState(false);
  const [noticeDeletingId, setNoticeDeletingId] = useState<number | null>(null);
  const [noticeEditor, setNoticeEditor] = useState<NoticeEditor | null>(null);
  const [appraisalAddressQuery, setAppraisalAddressQuery] = useState("");
  const [appraisalResolvedRoadAddress, setAppraisalResolvedRoadAddress] = useState<string | null>(
    null,
  );
  const [appraisalResolvedJibunAddress, setAppraisalResolvedJibunAddress] = useState<
    string | null
  >(null);
  const [appraisalResolvedLat, setAppraisalResolvedLat] = useState<number | null>(null);
  const [appraisalResolvedLng, setAppraisalResolvedLng] = useState<number | null>(null);
  const [appraisalRadiusM, setAppraisalRadiusM] = useState("1000");
  const [appraisalLimit, setAppraisalLimit] = useState("30");
  const [appraisalTypes, setAppraisalTypes] = useState<Record<AppraisalKind, boolean>>({
    apartment: true,
    officetel: true,
  });
  const [appraisalLoading, setAppraisalLoading] = useState(false);
  const [appraisalLoadedOnce, setAppraisalLoadedOnce] = useState(false);
  const [appraisalRows, setAppraisalRows] = useState<AppraisalResultRow[]>([]);
  const [appraisalWarnings, setAppraisalWarnings] = useState<string[]>([]);
  const [appraisalFetchedAt, setAppraisalFetchedAt] = useState<string | null>(null);
  const [selectedAppraisalRowId, setSelectedAppraisalRowId] = useState<string | null>(null);

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

    setAllPropertyCards(data.propertyCards);
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

  const loadFaqAdmin = useCallback(async () => {
    setFaqLoading(true);
    try {
      const response = await fetch("/api/support/faq/admin");
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "FAQ 조회 실패");
      }

      const categories = (data.categories || []) as FAQCategory[];
      const categoryMap = new Map(categories.map((category) => [category.key, category]));
      const items = ((data.items || []) as Array<Record<string, unknown>>).map((item) => {
        const categoryKey = String(item.categoryKey ?? "");
        const category = categoryMap.get(categoryKey);
        return {
          id: String(item.id ?? ""),
          categoryId: category?.id ?? "",
          categoryKey,
          categoryName: String(item.categoryName ?? ""),
          question: String(item.question ?? ""),
          answer: String(item.answer ?? ""),
          sortOrder: Number(item.sortOrder ?? 0) || 0,
          isActive: item.isActive !== false,
        } satisfies FAQItem;
      });

      setFaqCategories(categories);
      setFaqItems(items);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "FAQ 조회 실패"), "오류");
    } finally {
      setFaqLoading(false);
    }
  }, [toast]);

  const openCreateFaqEditor = () => {
    const firstCategory = faqCategories.find((category) => category.is_active) ?? faqCategories[0];
    if (!firstCategory) {
      toast.error("FAQ 카테고리가 없습니다.", "오류");
      return;
    }
    setFaqEditor({
      categoryId: firstCategory.id,
      question: "",
      answer: "",
      sortOrder: 0,
      isActive: true,
    });
  };

  const openEditFaqEditor = (item: FAQItem) => {
    setFaqEditor({
      id: item.id,
      categoryId: item.categoryId,
      question: item.question,
      answer: item.answer,
      sortOrder: item.sortOrder,
      isActive: item.isActive,
    });
  };

  const saveFaqEditor = async () => {
    if (!faqEditor) return;
    if (!faqEditor.categoryId || !faqEditor.question.trim() || !faqEditor.answer.trim()) {
      toast.error("카테고리, 질문, 답변을 입력해주세요.", "오류");
      return;
    }

    setFaqSaving(true);
    try {
      const payload = {
        id: faqEditor.id,
        categoryId: faqEditor.categoryId,
        question: faqEditor.question.trim(),
        answer: faqEditor.answer.trim(),
        sortOrder: faqEditor.sortOrder,
        isActive: faqEditor.isActive,
      };

      const response = await fetch("/api/support/faq/admin", {
        method: faqEditor.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || "FAQ 저장 실패");
      }

      toast.success(faqEditor.id ? "FAQ가 수정되었습니다" : "FAQ가 등록되었습니다", "완료");
      setFaqEditor(null);
      await loadFaqAdmin();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "FAQ 저장 실패"), "오류");
    } finally {
      setFaqSaving(false);
    }
  };

  const deleteFaq = async (faqId: string) => {
    const ok = window.confirm("이 FAQ를 삭제할까요?");
    if (!ok) return;

    setFaqDeletingId(faqId);
    try {
      const response = await fetch(`/api/support/faq/admin?id=${encodeURIComponent(faqId)}`, {
        method: "DELETE",
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || "FAQ 삭제 실패");
      }
      toast.success("FAQ가 삭제되었습니다", "완료");
      await loadFaqAdmin();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "FAQ 삭제 실패"), "오류");
    } finally {
      setFaqDeletingId(null);
    }
  };

  const loadNotices = useCallback(async () => {
    setNoticeLoading(true);
    try {
      const response = await fetch("/api/admin/notices");
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "공지 조회 실패");
      }
      setNoticeItems((data.items || []) as NoticeAdminItem[]);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "공지 조회 실패"), "오류");
    } finally {
      setNoticeLoading(false);
    }
  }, [toast]);

  const openCreateNoticeEditor = () => {
    const today = new Date().toISOString().slice(0, 10);
    setNoticeEditor({
      title: "",
      summary: "",
      content: "",
      category: "service",
      isPinned: false,
      isMaintenance: false,
      isPublished: true,
      publishedAt: today,
    });
  };

  const openEditNoticeEditor = (item: NoticeAdminItem) => {
    const publishedDate = item.published_at
      ? new Date(item.published_at).toISOString().slice(0, 10)
      : "";
    setNoticeEditor({
      id: item.id,
      title: item.title,
      summary: item.summary,
      content: item.content,
      category: item.category,
      isPinned: item.is_pinned,
      isMaintenance: item.is_maintenance,
      isPublished: item.is_published,
      publishedAt: publishedDate,
    });
  };

  const saveNoticeEditor = async () => {
    if (!noticeEditor) return;
    const title = noticeEditor.title.trim();
    const content = noticeEditor.content.trim();
    if (!title || !content) {
      toast.error("제목과 내용을 입력해주세요.", "오류");
      return;
    }

    setNoticeSaving(true);
    try {
      const payload = {
        id: noticeEditor.id,
        title,
        summary: noticeEditor.summary.trim(),
        content,
        category: noticeEditor.category,
        isPinned: noticeEditor.isPinned,
        isMaintenance: noticeEditor.isMaintenance,
        isPublished: noticeEditor.isPublished,
        publishedAt: noticeEditor.publishedAt,
      };

      const response = await fetch("/api/admin/notices", {
        method: noticeEditor.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || "공지 저장 실패");
      }

      toast.success(noticeEditor.id ? "공지 수정 완료" : "공지 등록 완료", "완료");
      setNoticeEditor(null);
      await loadNotices();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "공지 저장 실패"), "오류");
    } finally {
      setNoticeSaving(false);
    }
  };

  const deleteNotice = async (noticeId: number) => {
    const ok = window.confirm("이 공지를 삭제할까요?");
    if (!ok) return;

    setNoticeDeletingId(noticeId);
    try {
      const response = await fetch(`/api/admin/notices?id=${noticeId}`, {
        method: "DELETE",
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || "공지 삭제 실패");
      }
      toast.success("공지 삭제 완료", "완료");
      await loadNotices();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "공지 삭제 실패"), "오류");
    } finally {
      setNoticeDeletingId(null);
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

  const handlePropertyDelete = async (propertyId: number) => {
    const ok = window.confirm("이 현장을 삭제할까요? 이 작업은 되돌릴 수 없습니다.");
    if (!ok) return;

    setPropertyDeleteLoadingId(propertyId);
    try {
      const { error } = await deletePropertyById(propertyId);
      if (error) {
        throw error;
      }
      toast.success("현장이 삭제되었습니다", "완료");
      await loadData();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "삭제에 실패했습니다"), "오류");
    } finally {
      setPropertyDeleteLoadingId(null);
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

  const loadAppraisalNearby = useCallback(async () => {
    const selectedKinds = (Object.entries(appraisalTypes) as Array<[AppraisalKind, boolean]>)
      .filter(([, enabled]) => enabled)
      .map(([kind]) => kind);

    if (selectedKinds.length === 0) {
      toast.error("시설 유형을 1개 이상 선택해주세요.", "오류");
      return;
    }

    const addressQuery = appraisalAddressQuery.trim();
    if (!addressQuery) {
      toast.error("도로명 주소 또는 지번 주소를 입력해주세요.", "오류");
      return;
    }

    const radiusM = Number(appraisalRadiusM);
    const limit = Number(appraisalLimit);

    setAppraisalLoading(true);
    try {
      const geocodeResponse = await fetch(
        `/api/geo/address?query=${encodeURIComponent(addressQuery)}`,
      );
      const geocodeData = await geocodeResponse.json().catch(() => ({}));
      if (!geocodeResponse.ok) {
        throw new Error(geocodeData?.error || "입력한 주소를 찾을 수 없습니다.");
      }

      const lat = Number(geocodeData.lat);
      const lng = Number(geocodeData.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        throw new Error("주소 좌표 변환 결과가 올바르지 않습니다.");
      }

      setAppraisalResolvedRoadAddress(
        typeof geocodeData.road_address === "string" ? geocodeData.road_address : null,
      );
      setAppraisalResolvedJibunAddress(
        typeof geocodeData.jibun_address === "string" ? geocodeData.jibun_address : null,
      );
      setAppraisalResolvedLat(lat);
      setAppraisalResolvedLng(lng);

      const query = new URLSearchParams({
        lat: String(lat),
        lng: String(lng),
        radius: String(Number.isFinite(radiusM) ? Math.floor(radiusM) : 1000),
        limit: String(Number.isFinite(limit) ? Math.floor(limit) : 30),
        types: selectedKinds.join(","),
      });

      const response = await fetch(`/api/admin/appraisals/nearby?${query.toString()}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "감정평가 근방 검색 실패");
      }

      setAppraisalRows((data.items || []) as AppraisalResultRow[]);
      setAppraisalWarnings((data.warnings || []) as string[]);
      setAppraisalFetchedAt(typeof data.fetched_at === "string" ? data.fetched_at : null);
      setSelectedAppraisalRowId((data.items?.[0]?.id as string | undefined) ?? null);
      setAppraisalLoadedOnce(true);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "감정평가 근방 검색 실패"), "오류");
    } finally {
      setAppraisalLoading(false);
    }
  }, [
    appraisalAddressQuery,
    appraisalLimit,
    appraisalRadiusM,
    appraisalTypes,
    toast,
  ]);

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

  const pendingPropertyRequestCount = useMemo(
    () => allPropertyCards.filter((card) => card.status === "pending").length,
    [allPropertyCards],
  );

  const propertyCards = useMemo(() => {
    if (propertyStatusFilter === "all") return allPropertyCards;
    return allPropertyCards.filter((card) => card.missingLabels.length > 0);
  }, [allPropertyCards, propertyStatusFilter]);
  const visiblePropertyCount = propertyCards.length;
  const hasNaverMapClientId = Boolean(process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID);
  const appraisalRowToMarkerId = useMemo(
    () => new Map(appraisalRows.map((row, index) => [row.id, index + 1] as const)),
    [appraisalRows],
  );
  const appraisalMarkerToRowId = useMemo(
    () => new Map(appraisalRows.map((row, index) => [index + 1, row.id] as const)),
    [appraisalRows],
  );
  const appraisalMapMarkers = useMemo<MapMarker[]>(
    () =>
      appraisalRows.map((row, index) => ({
        id: index + 1,
        label: row.name,
        lat: row.lat,
        lng: row.lng,
        type: row.kind === "apartment" ? "valuation" : "agent",
        topLabel: `${appraisalKindLabel(row.kind)}${
          row.distance_m !== null ? ` · ${row.distance_m}m` : ""
        }`,
        mainLabel: row.name,
        address: row.road_address ?? row.jibun_address ?? row.detail.location ?? null,
      })),
    [appraisalRows],
  );
  const focusedAppraisalMarkerId = selectedAppraisalRowId
    ? appraisalRowToMarkerId.get(selectedAppraisalRowId) ?? null
    : null;

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
    if (activeTab === "appraisals" && appraisalLoadedOnce) {
      void loadAppraisalNearby();
    }
    if (activeTab === "settlements" || activeTab === "summary") {
      void loadSettlements();
    }
  }, [
    activeTab,
    appraisalLoadedOnce,
    loadAppraisalNearby,
    loadData,
    loadReservations,
    loadSettlements,
  ]);

  useEffect(() => {
    if (activeTab === "reservations") {
      void loadReservations();
    }
    if (activeTab === "settlements" || activeTab === "summary") {
      void loadSettlements();
    }
  }, [
    activeTab,
    loadReservations,
    loadSettlements,
  ]);

  // 약관 탭 활성화 시 약관 로드
  useEffect(() => {
    if (activeTab === "terms") {
      loadTerms();
    }
  }, [activeTab, loadTerms]);

  useEffect(() => {
    if (activeTab === "faq") {
      void loadFaqAdmin();
    }
  }, [activeTab, loadFaqAdmin]);

  useEffect(() => {
    if (activeTab === "notices") {
      void loadNotices();
    }
  }, [activeTab, loadNotices]);

  useEffect(() => {
    if (!selectedAppraisalRowId) return;
    if (!appraisalRowToMarkerId.has(selectedAppraisalRowId)) {
      setSelectedAppraisalRowId(null);
    }
  }, [appraisalRowToMarkerId, selectedAppraisalRowId]);

  if (loading) {
    return <AdminPageSkeleton />;
  }

  return (
    <>
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
      <FaqEditorModal
        faqEditor={faqEditor}
        setFaqEditor={setFaqEditor}
        faqCategories={faqCategories}
        faqSaving={faqSaving}
        onSaveFaqEditor={saveFaqEditor}
      />
      <NoticeEditorModal
        noticeEditor={noticeEditor}
        setNoticeEditor={setNoticeEditor}
        noticeSaving={noticeSaving}
        onSaveNoticeEditor={() => void saveNoticeEditor()}
      />
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

      <ProfilePageShell
        title="관리자 대시보드"
        description="승인/복구 및 사용자 현황을 관리합니다."
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      >
            {activeTab === "summary" && (
              <AdminSummaryTab
                onRefresh={refreshCurrentTab}
                userGrowth={userGrowth}
                pendingPropertyRequestCount={pendingPropertyRequestCount}
                publishedPropertyCount={publishedPropertyCount}
                todayNewConsultations={todayNewConsultations}
                todayVisitConsultations={todayVisitConsultations}
                todayNewQnaCount={todayNewQnaCount}
                pendingQnaCount={pendingQnaCount}
                settlementSummary={settlementSummary}
                onGoUsers={() => setActiveTab("users")}
                onGoProperties={() => setActiveTab("properties")}
                onGoReservations={() => setActiveTab("reservations")}
                onGoSettlements={() => setActiveTab("settlements")}
                onGoQna={() => router.push("/support/qna")}
              />
            )}

            {activeTab === "users" && (
              <AdminUsersTab
                onRefresh={refreshCurrentTab}
                deletedUsers={deletedUsers}
                activeUsers={activeUsers}
                filteredActiveUsers={filteredActiveUsers}
                searchQuery={searchQuery}
                onChangeSearchQuery={setSearchQuery}
                roleSort={roleSort}
                onToggleRoleSort={toggleRoleSort}
                onRestoreUser={openRestoreConfirm}
                formatLastSeen={formatLastSeen}
              />
            )}

            {activeTab === "reservations" && (
              <AdminReservationsTab
                onRefresh={refreshCurrentTab}
                reservationsLoading={reservationsLoading}
                reservationStatus={reservationStatus}
                reservationStatusLabel={reservationStatusLabel}
                onSelectStatus={(status) => {
                  setReservationStatus(status);
                  setReservationPage(1);
                }}
                reservationDate={reservationDate}
                onChangeReservationDate={(date) => {
                  setReservationDate(date);
                  setReservationPage(1);
                }}
                reservationAgentQuery={reservationAgentQuery}
                onChangeReservationAgentQuery={(value) => {
                  setReservationAgentQuery(value);
                  setReservationPage(1);
                }}
                reservationSlice={reservationSlice}
                reservationTotal={reservationTotal}
                reservationStart={reservationStart}
                reservationEnd={reservationEnd}
                reservationPageSafe={reservationPageSafe}
                reservationPageCount={reservationPageCount}
                onSetReservationPage={setReservationPage}
                onSelectReservation={setSelectedReservation}
              />
            )}

            {activeTab === "properties" && (
              <AdminPropertiesTab
                visiblePropertyCount={visiblePropertyCount}
                propertyStatusFilter={propertyStatusFilter}
                onChangePropertyStatusFilter={setPropertyStatusFilter}
                onRefresh={refreshCurrentTab}
                onCreateProperty={() => router.push("/company/properties/new")}
                propertyCards={propertyCards}
                propertyDeleteLoadingId={propertyDeleteLoadingId}
                onDeleteProperty={handlePropertyDelete}
                onOpenProperty={(propertyId) => router.push(`/company/properties/${propertyId}`)}
                resolvedPropertyRequests={resolvedPropertyRequests}
                propertyAgentAction={propertyAgentAction}
                onApprovePropertyRequest={handlePropertyAgentApprove}
                onRejectPropertyRequest={handlePropertyAgentReject}
              />
            )}

            {activeTab === "appraisals" && (
              <AdminAppraisalsTab
                onRefresh={refreshCurrentTab}
                appraisalAddressQuery={appraisalAddressQuery}
                onChangeAddressQuery={setAppraisalAddressQuery}
                appraisalRadiusM={appraisalRadiusM}
                onChangeRadiusM={setAppraisalRadiusM}
                appraisalLimit={appraisalLimit}
                onChangeLimit={setAppraisalLimit}
                appraisalTypes={appraisalTypes}
                onToggleType={(kind) =>
                  setAppraisalTypes((prev) => ({ ...prev, [kind]: !prev[kind] }))
                }
                onSearchNearby={() => void loadAppraisalNearby()}
                appraisalLoading={appraisalLoading}
                appraisalResolvedRoadAddress={appraisalResolvedRoadAddress}
                appraisalResolvedJibunAddress={appraisalResolvedJibunAddress}
                appraisalResolvedLat={appraisalResolvedLat}
                appraisalResolvedLng={appraisalResolvedLng}
                hasNaverMapClientId={hasNaverMapClientId}
                appraisalMapMarkers={appraisalMapMarkers}
                focusedAppraisalMarkerId={focusedAppraisalMarkerId}
                onMarkerSelect={(markerId) => {
                  const rowId = appraisalMarkerToRowId.get(markerId);
                  if (!rowId) return;
                  setSelectedAppraisalRowId(rowId);
                }}
                appraisalRows={appraisalRows}
                selectedAppraisalRowId={selectedAppraisalRowId}
                onSelectRow={setSelectedAppraisalRowId}
                appraisalWarnings={appraisalWarnings}
                appraisalFetchedAt={appraisalFetchedAt}
              />
            )}

            {activeTab === "settlements" && (
              <AdminSettlementsTab
                onRefresh={refreshCurrentTab}
                settlementSummary={settlementSummary}
                settlementRows={settlementRows}
                settlementLoading={settlementLoading}
                reservationStatusLabel={reservationStatusLabel}
                onSelectSettlement={setSelectedSettlement}
              />
            )}

            {activeTab === "notices" && (
              <AdminNoticesTab
                noticeLoading={noticeLoading}
                noticeItems={noticeItems}
                noticeDeletingId={noticeDeletingId}
                onCreateNotice={openCreateNoticeEditor}
                onEditNotice={openEditNoticeEditor}
                onDeleteNotice={(noticeId) => void deleteNotice(noticeId)}
              />
            )}

            {activeTab === "faq" && (
              <AdminFaqTab
                faqLoading={faqLoading}
                faqCategories={faqCategories}
                faqItems={faqItems}
                faqDeletingId={faqDeletingId}
                onCreateFaq={openCreateFaqEditor}
                onEditFaq={openEditFaqEditor}
                onDeleteFaq={(faqId) => void deleteFaq(faqId)}
              />
            )}

            {activeTab === "terms" && (
              <AdminTermsTab
                termsLoading={termsLoading}
                editingTerm={editingTerm}
                setEditingTerm={setEditingTerm}
                termSaving={termSaving}
                onSaveTerm={saveTerm}
                terms={terms}
              />
            )}

            {activeTab === "regulations" && (
              <AdminRegulationRulesTab active={activeTab === "regulations"} />
            )}
      </ProfilePageShell>
    </>
  );
}
