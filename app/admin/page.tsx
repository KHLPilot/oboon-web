// app/admin/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { approveAgent, restoreAccount } from "./serverActions";
import {
  fetchAdminDashboardData,
  type AdminPropertyCard,
} from "@/features/admin/services/admin.dashboard";
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
import NaverMap, { type MapMarker } from "@/features/map/components/NaverMap";
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
  Trash2,
  User,
  Users,
} from "lucide-react";
import { deletePropertyById } from "@/features/company/services/property.list";

type Profile = {
  id: string;
  name: string | null;
  email: string;
  phone_number: string | null;
  role: string;
  created_at: string;
  deleted_at: string | null;
  last_sign_in_at?: string | null;
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

type FAQCategory = {
  id: string;
  key: string;
  name: string;
  sort_order: number;
  is_active: boolean;
};

type FAQItem = {
  id: string;
  categoryId: string;
  categoryKey: string;
  categoryName: string;
  question: string;
  answer: string;
  sortOrder: number;
  isActive: boolean;
};

type FAQEditor = {
  id?: string;
  categoryId: string;
  question: string;
  answer: string;
  sortOrder: number;
  isActive: boolean;
};

type NoticeCategory = "update" | "service" | "event" | "maintenance";
type NoticeAdminItem = {
  id: number;
  slug: string;
  title: string;
  summary: string;
  content: string;
  category: NoticeCategory;
  is_pinned: boolean;
  is_maintenance: boolean;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

type NoticeEditor = {
  id?: number;
  title: string;
  summary: string;
  content: string;
  category: NoticeCategory;
  isPinned: boolean;
  isMaintenance: boolean;
  isPublished: boolean;
  publishedAt: string;
};

type AppraisalKind = "apartment" | "officetel";

type AppraisalResultRow = {
  id: string;
  kind: AppraisalKind;
  name: string;
  road_address: string | null;
  jibun_address: string | null;
  lat: number;
  lng: number;
  distance_m: number | null;
  place_url: string | null;
  category_name: string | null;
  detail: {
    complex_name: string | null;
    location: string | null;
    use_approval_date: string | null;
    use_approval_date_is_estimated: boolean;
    age_years: number | null;
    exclusive_area_min_m2: number | null;
    exclusive_area_max_m2: number | null;
    source: {
      kakao: boolean;
      internal_db: boolean;
      public_data: boolean;
    };
    matched_property_id: number | null;
    match_score: number | null;
  };
};

function MissingPill({ label }: { label: string }) {
  return (
    <Badge variant="warning" className="ob-typo-caption px-2.5 py-1">
      {label}
    </Badge>
  );
}

function MorePill({ count }: { count: number }) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2.5 py-1",
        "border border-(--oboon-border-default)",
        "bg-(--oboon-bg-subtle)",
        "text-(--oboon-text-body)",
        "ob-typo-caption",
      ].join(" ")}
    >
      +{count}
    </span>
  );
}

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

const NOTICE_CATEGORY_OPTIONS: Array<{ value: NoticeCategory; label: string }> = [
  { value: "update", label: "업데이트" },
  { value: "service", label: "서비스" },
  { value: "event", label: "이벤트" },
  { value: "maintenance", label: "작업 안내" },
];

function noticeCategoryLabel(category: NoticeCategory) {
  return NOTICE_CATEGORY_OPTIONS.find((item) => item.value === category)?.label ?? category;
}

function appraisalKindLabel(kind: AppraisalKind) {
  return kind === "apartment" ? "아파트" : "오피스텔";
}

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

  const propertyProgress = (status: AdminPropertyCard["status"]) => {
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

  const requesterRoleLabel = (role?: string | null) => {
    switch (role) {
      case "admin":
        return "관리자";
      case "agent":
        return "분양상담사";
      case "builder":
        return "시공사";
      case "developer":
        return "시행사";
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
      <Modal
        open={Boolean(faqEditor)}
        onClose={() => {
          if (!faqSaving) setFaqEditor(null);
        }}
        showCloseIcon={!faqSaving}
      >
        {faqEditor ? (
          <div className="space-y-4">
            <div className="ob-typo-subtitle text-(--oboon-text-title)">
              {faqEditor.id ? "FAQ 수정" : "FAQ 등록"}
            </div>
            <div className="space-y-3">
              <label className="block">
                <span className="mb-1 block ob-typo-caption text-(--oboon-text-muted)">
                  카테고리
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="secondary"
                      className="w-full justify-between rounded-xl"
                      disabled={faqSaving}
                    >
                      <span>
                        {faqCategories.find((category) => category.id === faqEditor.categoryId)
                          ?.name ?? "카테고리 선택"}
                      </span>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-full min-w-[260px]">
                    {faqCategories.map((category) => (
                      <DropdownMenuItem
                        key={category.id}
                        onClick={() =>
                          setFaqEditor((prev) =>
                            prev ? { ...prev, categoryId: category.id } : prev,
                          )
                        }
                      >
                        {category.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </label>
              <label className="block">
                <span className="mb-1 block ob-typo-caption text-(--oboon-text-muted)">
                  질문
                </span>
                <Input
                  value={faqEditor.question}
                  onChange={(e) =>
                    setFaqEditor((prev) =>
                      prev
                        ? { ...prev, question: e.target.value }
                        : prev,
                    )
                  }
                  placeholder="질문을 입력하세요"
                  disabled={faqSaving}
                />
              </label>
              <label className="block">
                <span className="mb-1 block ob-typo-caption text-(--oboon-text-muted)">
                  답변
                </span>
                <Textarea
                  value={faqEditor.answer}
                  onChange={(e) =>
                    setFaqEditor((prev) =>
                      prev
                        ? { ...prev, answer: e.target.value }
                        : prev,
                    )
                  }
                  rows={8}
                  placeholder="답변을 입력하세요"
                  disabled={faqSaving}
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block ob-typo-caption text-(--oboon-text-muted)">
                    정렬 순서
                  </span>
                  <Input
                    type="number"
                    value={String(faqEditor.sortOrder)}
                    onChange={(e) =>
                      setFaqEditor((prev) =>
                        prev
                          ? {
                              ...prev,
                              sortOrder: Number(e.target.value) || 0,
                            }
                          : prev,
                      )
                    }
                    disabled={faqSaving}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block ob-typo-caption text-(--oboon-text-muted)">
                    노출 상태
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="secondary"
                        className="w-full justify-between rounded-xl"
                        disabled={faqSaving}
                      >
                        <span>{faqEditor.isActive ? "활성" : "비활성"}</span>
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-full min-w-[140px]">
                      <DropdownMenuItem
                        onClick={() =>
                          setFaqEditor((prev) =>
                            prev ? { ...prev, isActive: true } : prev,
                          )
                        }
                      >
                        활성
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          setFaqEditor((prev) =>
                            prev ? { ...prev, isActive: false } : prev,
                          )
                        }
                      >
                        비활성
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                size="sm"
                shape="pill"
                onClick={() => setFaqEditor(null)}
                disabled={faqSaving}
              >
                취소
              </Button>
              <Button
                variant="primary"
                size="sm"
                shape="pill"
                onClick={saveFaqEditor}
                loading={faqSaving}
              >
                저장
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
      <Modal
        open={Boolean(noticeEditor)}
        onClose={() => {
          if (!noticeSaving) setNoticeEditor(null);
        }}
        showCloseIcon={!noticeSaving}
      >
        {noticeEditor ? (
          <div className="space-y-4">
            <div className="ob-typo-subtitle text-(--oboon-text-title)">
              {noticeEditor.id ? "공지 수정" : "공지 등록"}
            </div>

            <label className="block">
              <span className="mb-1 block ob-typo-caption text-(--oboon-text-muted)">
                카테고리
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="secondary"
                    className="w-full justify-between rounded-xl"
                    disabled={noticeSaving}
                  >
                    <span>{noticeCategoryLabel(noticeEditor.category)}</span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  matchTriggerWidth
                  className="min-w-[260px]"
                >
                  {NOTICE_CATEGORY_OPTIONS.map((item) => (
                    <DropdownMenuItem
                      key={item.value}
                      onClick={() =>
                        setNoticeEditor((prev) =>
                          prev
                            ? {
                                ...prev,
                                category: item.value,
                                isMaintenance:
                                  item.value === "maintenance" || prev.isMaintenance,
                              }
                            : prev,
                        )
                      }
                    >
                      {item.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </label>

            <label className="block">
              <span className="mb-1 block ob-typo-caption text-(--oboon-text-muted)">
                제목
              </span>
              <Input
                value={noticeEditor.title}
                onChange={(e) =>
                  setNoticeEditor((prev) =>
                    prev
                      ? {
                          ...prev,
                          title: e.target.value,
                        }
                      : prev,
                  )
                }
                placeholder="공지 제목을 입력하세요"
                disabled={noticeSaving}
              />
            </label>

            <label className="block">
              <span className="mb-1 block ob-typo-caption text-(--oboon-text-muted)">
                요약
              </span>
              <Input
                value={noticeEditor.summary}
                onChange={(e) =>
                  setNoticeEditor((prev) =>
                    prev ? { ...prev, summary: e.target.value } : prev,
                  )
                }
                placeholder="목록에서 보일 한 줄 설명"
                disabled={noticeSaving}
              />
            </label>

            <label className="block">
              <span className="mb-1 block ob-typo-caption text-(--oboon-text-muted)">
                게시일
              </span>
              <Input
                type="date"
                value={noticeEditor.publishedAt}
                onChange={(e) =>
                  setNoticeEditor((prev) =>
                    prev ? { ...prev, publishedAt: e.target.value } : prev,
                  )
                }
                disabled={noticeSaving}
              />
            </label>

            <label className="block">
              <span className="mb-1 block ob-typo-caption text-(--oboon-text-muted)">
                내용
              </span>
              <Textarea
                value={noticeEditor.content}
                onChange={(e) =>
                  setNoticeEditor((prev) =>
                    prev ? { ...prev, content: e.target.value } : prev,
                  )
                }
                rows={10}
                disabled={noticeSaving}
              />
            </label>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <label className="flex items-center gap-2 rounded-xl border border-(--oboon-border-default) px-3 py-2">
                <input
                  type="checkbox"
                  checked={noticeEditor.isPinned}
                  onChange={(e) =>
                    setNoticeEditor((prev) =>
                      prev ? { ...prev, isPinned: e.target.checked } : prev,
                    )
                  }
                  disabled={noticeSaving}
                />
                <span className="ob-typo-caption text-(--oboon-text-title)">중요 공지</span>
              </label>
              <label className="flex items-center gap-2 rounded-xl border border-(--oboon-border-default) px-3 py-2">
                <input
                  type="checkbox"
                  checked={noticeEditor.isMaintenance}
                  onChange={(e) =>
                    setNoticeEditor((prev) =>
                      prev ? { ...prev, isMaintenance: e.target.checked } : prev,
                    )
                  }
                  disabled={noticeSaving}
                />
                <span className="ob-typo-caption text-(--oboon-text-title)">
                  점검 공지로 표시
                </span>
              </label>
              <label className="flex items-center gap-2 rounded-xl border border-(--oboon-border-default) px-3 py-2">
                <input
                  type="checkbox"
                  checked={noticeEditor.isPublished}
                  onChange={(e) =>
                    setNoticeEditor((prev) =>
                      prev ? { ...prev, isPublished: e.target.checked } : prev,
                    )
                  }
                  disabled={noticeSaving}
                />
                <span className="ob-typo-caption text-(--oboon-text-title)">게시 상태</span>
              </label>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                size="sm"
                shape="pill"
                onClick={() => setNoticeEditor(null)}
                disabled={noticeSaving}
              >
                취소
              </Button>
              <Button
                variant="primary"
                size="sm"
                shape="pill"
                onClick={() => void saveNoticeEditor()}
                loading={noticeSaving}
              >
                저장
              </Button>
            </div>
          </div>
        ) : null}
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
                    <span suppressHydrationWarning>
                      {new Date().toLocaleDateString("ko-KR", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        weekday: "long",
                      })}
                    </span>
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
                          {pendingPropertyRequestCount}건
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
                            <Th>최근 접속</Th>
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
                              <Td className="ob-typo-body text-(--oboon-text-muted)">
                                {u.role === "agent" || u.role === "agent_pending"
                                  ? formatLastSeen(u.last_sign_in_at)
                                  : "-"}
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
                    <Badge variant="status">{visiblePropertyCount}건</Badge>
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
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {[
                      { id: "all", label: "전체" },
                      { id: "incomplete", label: "미완성" },
                    ].map((tab) => {
                      const isActive = propertyStatusFilter === tab.id;
                      return (
                        <Button
                          key={tab.id}
                          onClick={() =>
                            setPropertyStatusFilter(
                              tab.id as "all" | "incomplete",
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
                  <Button
                    variant="primary"
                    size="sm"
                    shape="pill"
                    onClick={() => router.push("/company/properties/new")}
                  >
                    + 새 현장 등록
                  </Button>
                </div>

                {propertyCards.length === 0 ? (
                  <Card className="p-5 shadow-none">
                    <div className="ob-typo-body text-(--oboon-text-muted)">
                      표시할 현장이 없습니다.
                    </div>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {propertyCards.map((card) => {
                      const MAX_PILLS = 3;
                      const visibleMissing = card.missingLabels.slice(0, MAX_PILLS);
                      const hiddenCount = Math.max(0, card.missingLabels.length - MAX_PILLS);

                      return (
                        <Card
                          key={card.propertyId}
                          className="p-4 shadow-none cursor-pointer transition-colors hover:bg-(--oboon-bg-subtle)"
                          onClick={() => router.push(`/company/properties/${card.propertyId}`)}
                        >
                        <div className="flex items-start justify-between gap-3">
                          <div className="mt-1 min-w-0 flex-1 ob-typo-h3 text-(--oboon-text-title)">
                            <span className="block truncate whitespace-nowrap">
                              {card.title}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePropertyDelete(card.propertyId);
                            }}
                            disabled={propertyDeleteLoadingId === card.propertyId}
                            aria-label="삭제"
                            className={[
                              "inline-flex h-8 w-8 items-center justify-center rounded-full p-0 cursor-pointer transition-colors shrink-0",
                              "text-(--oboon-danger)",
                              "hover:bg-(--oboon-danger-bg)",
                              "focus:outline-none focus:ring-2 focus:ring-(--oboon-danger)/30",
                              propertyDeleteLoadingId === card.propertyId
                                ? "opacity-50 cursor-not-allowed"
                                : "",
                            ].join(" ")}
                          >
                            <Trash2 size={16} />
                          </button>
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
                              {new Date(card.createdAt).toLocaleString(
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
                          {card.missingLabels.length > 0 ? (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {visibleMissing.map((label) => (
                                <MissingPill key={label} label={label} />
                              ))}
                              {hiddenCount > 0 ? <MorePill count={hiddenCount} /> : null}
                            </div>
                          ) : null}
                          {card.status === "pending" &&
                          card.latestRequestId &&
                          !resolvedPropertyRequests[card.latestRequestId] ? (
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
                                    propertyAgentAction?.id === card.latestRequestId &&
                                    propertyAgentAction?.loading
                                  }
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const requestId = card.latestRequestId;
                                    const requestType = card.requestType;
                                    if (!requestId || !requestType) return;
                                    handlePropertyAgentApprove(requestId, requestType);
                                  }}
                                >
                                  승인
                                </Button>
                                <Button
                                  size="sm"
                                  shape="pill"
                                  variant="secondary"
                                  disabled={
                                    propertyAgentAction?.id === card.latestRequestId &&
                                    propertyAgentAction?.loading
                                  }
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const requestId = card.latestRequestId;
                                    const requestType = card.requestType;
                                    if (!requestId || !requestType) return;
                                    handlePropertyAgentReject(requestId, requestType);
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
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === "appraisals" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="ob-typo-h2 text-(--oboon-text-title)">감정평가</div>
                    <p className="mt-1 ob-typo-caption text-(--oboon-text-muted)">
                      카카오 지도 기반으로 근방 아파트/오피스텔을 찾고 상세 정보를 매칭합니다.
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

                <Card className="p-4 shadow-none">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
                    <div className="md:col-span-2 lg:col-span-2">
                      <label className="mb-1 block ob-typo-caption text-(--oboon-text-muted)">
                        기준 주소 (도로명 / 지번)
                      </label>
                      <Input
                        value={appraisalAddressQuery}
                        onChange={(e) => setAppraisalAddressQuery(e.target.value)}
                        placeholder="예: 서울특별시 강남구 테헤란로 212 또는 강남구 역삼동 719"
                        onKeyDown={(e) => {
                          if (e.key !== "Enter") return;
                          e.preventDefault();
                          void loadAppraisalNearby();
                        }}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block ob-typo-caption text-(--oboon-text-muted)">
                        반경 (m)
                      </label>
                      <Input
                        value={appraisalRadiusM}
                        onChange={(e) => setAppraisalRadiusM(e.target.value)}
                        placeholder="1000"
                        inputMode="numeric"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block ob-typo-caption text-(--oboon-text-muted)">
                        최대 건수
                      </label>
                      <Input
                        value={appraisalLimit}
                        onChange={(e) => setAppraisalLimit(e.target.value)}
                        placeholder="30"
                        inputMode="numeric"
                      />
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {(["apartment", "officetel"] as AppraisalKind[]).map((kind) => (
                        <Button
                          key={kind}
                          type="button"
                          size="sm"
                          shape="pill"
                          variant={appraisalTypes[kind] ? "primary" : "secondary"}
                          onClick={() =>
                            setAppraisalTypes((prev) => ({ ...prev, [kind]: !prev[kind] }))
                          }
                        >
                          {appraisalKindLabel(kind)}
                        </Button>
                      ))}
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      shape="pill"
                      onClick={() => void loadAppraisalNearby()}
                      loading={appraisalLoading}
                    >
                      <Search className="h-4 w-4" />
                      근방 검색
                    </Button>
                  </div>

                  {appraisalResolvedLat !== null && appraisalResolvedLng !== null ? (
                    <div className="mt-3 rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle) px-3 py-2">
                      <p className="ob-typo-caption text-(--oboon-text-muted)">
                        해석 주소:{" "}
                        {appraisalResolvedRoadAddress ??
                          appraisalResolvedJibunAddress ??
                          appraisalAddressQuery}
                      </p>
                      <p className="ob-typo-caption text-(--oboon-text-muted)">
                        좌표: {appraisalResolvedLat.toFixed(6)},{" "}
                        {appraisalResolvedLng.toFixed(6)}
                      </p>
                    </div>
                  ) : null}

                  <p className="mt-3 ob-typo-caption text-(--oboon-text-muted)">
                    현재는 카카오 검색 결과와 내부 데이터 매칭 기준으로 제공합니다.
                  </p>
                </Card>

                <Card className="p-4 shadow-none">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="ob-typo-subtitle text-(--oboon-text-title)">지도</div>
                      <Badge variant="status">{appraisalMapMarkers.length}개 마커</Badge>
                    </div>
                    <div className="ob-typo-caption text-(--oboon-text-muted)">기본 마커 표시 중</div>
                  </div>

                  {!hasNaverMapClientId ? (
                    <div className="rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle) p-6 text-center">
                      <p className="ob-typo-body text-(--oboon-text-muted)">
                        <code>NEXT_PUBLIC_NAVER_MAP_CLIENT_ID</code>가 설정되지 않아 지도를
                        표시할 수 없습니다.
                      </p>
                    </div>
                  ) : appraisalMapMarkers.length === 0 ? (
                    <div className="rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle) p-6 text-center">
                      <p className="ob-typo-body text-(--oboon-text-muted)">
                        먼저 근방 검색을 실행하면 지도에 기본 마커가 표시됩니다.
                      </p>
                    </div>
                  ) : (
                    <div className="h-[420px] w-full overflow-hidden rounded-2xl border border-(--oboon-border-default)">
                      <NaverMap
                        markers={appraisalMapMarkers}
                        focusedId={focusedAppraisalMarkerId}
                        showFocusedAsRich={false}
                        fitToMarkers
                        regionClusterEnabled={false}
                        onMarkerSelect={(markerId) => {
                          const rowId = appraisalMarkerToRowId.get(markerId);
                          if (!rowId) return;
                          setSelectedAppraisalRowId(rowId);
                        }}
                      />
                    </div>
                  )}
                </Card>

                <Card className="p-4 shadow-none">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="ob-typo-subtitle text-(--oboon-text-title)">
                        검색 결과
                      </div>
                      <Badge variant="status">{appraisalRows.length}건</Badge>
                    </div>
                    <div className="ob-typo-caption text-(--oboon-text-muted)">
                      {appraisalFetchedAt
                        ? `최근 조회: ${new Date(appraisalFetchedAt).toLocaleString("ko-KR")}`
                        : "최근 조회: -"}
                    </div>
                  </div>

                  {appraisalWarnings.length > 0 ? (
                    <div className="mb-3 space-y-1">
                      {appraisalWarnings.map((warning, index) => (
                        <div
                          key={`${warning}-${index}`}
                          className="flex items-center gap-1.5 ob-typo-caption text-(--oboon-warning-text)"
                        >
                          <AlertTriangle className="h-3.5 w-3.5" />
                          <span>{warning}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {appraisalLoading ? (
                    <div className="flex items-center justify-center py-10">
                      <Loader2 className="h-6 w-6 animate-spin text-(--oboon-primary)" />
                    </div>
                  ) : appraisalRows.length === 0 ? (
                    <div className="py-8 text-center ob-typo-body text-(--oboon-text-muted)">
                      조건에 맞는 결과가 없습니다.
                    </div>
                  ) : (
                    <TableShell>
                      <thead>
                        <tr>
                          <Th>유형 / 시설명</Th>
                          <Th>위치</Th>
                          <Th>단지</Th>
                          <Th>출처</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {appraisalRows.map((row) => (
                          <tr
                            key={row.id}
                            className={[
                              "cursor-pointer transition-colors",
                              selectedAppraisalRowId === row.id
                                ? "bg-(--oboon-bg-subtle)"
                                : "hover:bg-(--oboon-bg-subtle)/70",
                            ].join(" ")}
                            onClick={() => setSelectedAppraisalRowId(row.id)}
                          >
                            <Td>
                              <div className="space-y-1">
                                <Badge variant="status">{appraisalKindLabel(row.kind)}</Badge>
                                <div className="ob-typo-body text-(--oboon-text-title)">
                                  {row.name}
                                </div>
                                {row.place_url ? (
                                  <a
                                    href={row.place_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="ob-typo-caption text-(--oboon-primary) hover:underline"
                                  >
                                    카카오 장소 보기
                                  </a>
                                ) : null}
                              </div>
                            </Td>
                            <Td>
                              <div className="space-y-1">
                                <div>{row.road_address ?? row.jibun_address ?? "-"}</div>
                                <div className="ob-typo-caption text-(--oboon-text-muted)">
                                  {row.distance_m !== null ? `${row.distance_m}m` : "거리 정보 없음"}
                                </div>
                              </div>
                            </Td>
                            <Td>
                              <div className="space-y-1">
                                <div>{row.detail.complex_name ?? "-"}</div>
                                {row.detail.matched_property_id ? (
                                  <div className="ob-typo-caption text-(--oboon-text-muted)">
                                    내부 ID #{row.detail.matched_property_id}
                                  </div>
                                ) : null}
                              </div>
                            </Td>
                            <Td>
                              <div className="flex flex-wrap gap-1">
                                {row.detail.source.kakao ? (
                                  <Badge variant="status">Kakao</Badge>
                                ) : null}
                                {row.detail.source.internal_db ? (
                                  <Badge variant="success">내부DB</Badge>
                                ) : null}
                                {row.detail.source.public_data ? (
                                  <Badge variant="success">공공데이터</Badge>
                                ) : null}
                              </div>
                            </Td>
                          </tr>
                        ))}
                      </tbody>
                    </TableShell>
                  )}
                </Card>
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

            {activeTab === "notices" && (
              <>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="ob-typo-h2 text-(--oboon-text-title)">
                      공지 관리
                    </div>
                    <p className="mt-1 ob-typo-caption text-(--oboon-text-muted)">
                      공지사항 페이지에 노출될 공지를 등록/수정/삭제합니다.
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    shape="pill"
                    onClick={openCreateNoticeEditor}
                  >
                    + 공지 등록
                  </Button>
                </div>

                {noticeLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-(--oboon-primary)" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {noticeItems.map((item) => (
                      <Card key={item.id} className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <FileText className="h-4 w-4 text-(--oboon-primary)" />
                              <span className="ob-typo-body text-(--oboon-text-title)">
                                {item.title}
                              </span>
                              <Badge variant="status">
                                {noticeCategoryLabel(item.category)}
                              </Badge>
                              <Badge variant="status">
                                {item.is_published ? "게시" : "비공개"}
                              </Badge>
                              {item.is_pinned ? <Badge variant="success">중요</Badge> : null}
                            </div>
                            <div className="mt-1 ob-typo-caption text-(--oboon-text-muted)">
                              /notice/{item.slug} ·{" "}
                              {item.published_at
                                ? new Date(item.published_at).toLocaleDateString("ko-KR")
                                : "게시일 없음"}
                            </div>
                            {item.summary ? (
                              <div className="mt-1 ob-typo-caption text-(--oboon-text-muted) line-clamp-2">
                                {item.summary}
                              </div>
                            ) : null}
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <Button asChild variant="secondary" size="sm" shape="pill">
                              <a href={`/notice/${item.slug}`} target="_blank" rel="noreferrer">
                                미리보기
                              </a>
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              shape="pill"
                              onClick={() => openEditNoticeEditor(item)}
                            >
                              <Edit3 className="h-4 w-4" />
                              수정
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              shape="pill"
                              onClick={() => void deleteNotice(item.id)}
                              loading={noticeDeletingId === item.id}
                            >
                              <Trash2 className="h-4 w-4" />
                              삭제
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}

                    {noticeItems.length === 0 && (
                      <Card className="p-5 text-center">
                        <p className="ob-typo-body text-(--oboon-text-muted)">
                          등록된 공지가 없습니다.
                        </p>
                      </Card>
                    )}
                  </div>
                )}
              </>
            )}

            {activeTab === "faq" && (
              <>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="ob-typo-h2 text-(--oboon-text-title)">
                      FAQ 관리
                    </div>
                    <p className="mt-1 ob-typo-caption text-(--oboon-text-muted)">
                      자주 묻는 질문의 질문/답변/노출 상태를 관리합니다.
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    shape="pill"
                    onClick={openCreateFaqEditor}
                    disabled={faqCategories.length === 0}
                  >
                    + FAQ 등록
                  </Button>
                </div>

                {faqLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-(--oboon-primary)" />
                  </div>
                ) : (
                  <div className="space-y-6">
                    {faqCategories.map((category) => {
                      const items = faqItems
                        .filter((item) => item.categoryId === category.id)
                        .sort((a, b) => a.sortOrder - b.sortOrder);
                      return (
                        <div key={category.id}>
                          <div className="ob-typo-subtitle text-(--oboon-text-title) mb-3">
                            {category.name}
                          </div>
                          <div className="space-y-3">
                            {items.map((item) => (
                              <Card key={item.id} className="p-4">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <FileText className="h-4 w-4 text-(--oboon-primary)" />
                                      <span className="ob-typo-body text-(--oboon-text-title)">
                                        {item.question}
                                      </span>
                                      <Badge variant="status">정렬 {item.sortOrder}</Badge>
                                      <Badge variant="status">
                                        {item.isActive ? "활성" : "비활성"}
                                      </Badge>
                                    </div>
                                    <div className="mt-1 ob-typo-caption text-(--oboon-text-muted) line-clamp-3 whitespace-pre-wrap">
                                      {item.answer}
                                    </div>
                                  </div>
                                  <div className="flex shrink-0 items-center gap-2">
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      shape="pill"
                                      onClick={() => openEditFaqEditor(item)}
                                    >
                                      <Edit3 className="h-4 w-4" />
                                      수정
                                    </Button>
                                    <Button
                                      variant="danger"
                                      size="sm"
                                      shape="pill"
                                      onClick={() => void deleteFaq(item.id)}
                                      loading={faqDeletingId === item.id}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                      삭제
                                    </Button>
                                  </div>
                                </div>
                              </Card>
                            ))}
                            {items.length === 0 && (
                              <p className="ob-typo-caption text-(--oboon-text-muted)">
                                등록된 FAQ가 없습니다.
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {faqCategories.length === 0 && (
                      <Card className="p-5 text-center">
                        <p className="ob-typo-body text-(--oboon-text-muted)">
                          FAQ 카테고리가 없습니다. DB 마이그레이션 상태를 확인해주세요.
                        </p>
                      </Card>
                    )}
                  </div>
                )}
              </>
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
