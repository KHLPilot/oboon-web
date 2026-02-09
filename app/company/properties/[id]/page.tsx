"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type ComponentType,
  type ReactNode,
} from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  CalendarDays,
  Image as ImageIcon,
  Landmark,
  LayoutTemplate,
  MapPin,
  Loader2,
  X,
} from "lucide-react";

import { deletePropertyCascade, fetchPropertyDetail, updatePropertyBasicInfo } from "@/features/company/services/property.detail";
import {
  cancelPropertyRequest,
  createPropertyRequest,
  fetchMyDeleteRequest,
  fetchMyPropertyRequest,
  type PropertyRequestStatus,
} from "@/features/company/services/property.request";
import { validateRequiredOrShowModal } from "@/shared/validationMessage";

import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import PageContainer from "@/components/shared/PageContainer";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import { ToastProvider, useToast } from "@/components/ui/Toast";

import { FormField } from "@/components/shared/FormField";

import PropertyStatusSelect from "@/app/company/properties/PropertyStatusSelect";
import {
  PROPERTY_STATUS_LABEL,
  PROPERTY_STATUS_OPTIONS,
  isPropertyStatus,
} from "@/features/property/domain/propertyStatus";
import { getPropertySectionStatus } from "@/features/property/components/propertyProgress";
import { showAlert } from "@/shared/alert";
import { createSupabaseClient } from "@/lib/supabaseClient";

/* ==================================================
   타입 정의
================================================== */
type PropertyRow = {
  id: number;
  created_by?: string | null;
  name: string;
  property_type: string | null;
  status: string | null;
  description: string | null;
  image_url: string | null;
  confirmed_note: string | null;
  estimated_note: string | null;
  undecided_note: string | null;
};

type RelationRow = { id: number };

type SpecsRow = {
  id: number;
  sale_type?: string | null;
  trust_company?: string | null;
  developer?: string | null;
  builder?: string | null;
  land_use_zone?: string | null;
  site_area?: number | null;
  building_area?: number | null;
  building_coverage_ratio?: number | null;
  floor_area_ratio?: number | null;
  floor_ground?: number | null;
  floor_underground?: number | null;
  building_count?: number | null;
  household_total?: number | null;
  parking_total?: number | null;
  parking_per_household?: number | null;
  heating_type?: string | null;
  amenities?: string | null;
};

type TimelineRow = {
  id: number;
  announcement_date?: string | null;
  application_start?: string | null;
  application_end?: string | null;
  winner_announce?: string | null;
  contract_start?: string | null;
  contract_end?: string | null;
  move_in_date?: string | null;
};

type PropertyDetail = PropertyRow & {
  property_locations?: RelationRow[] | null;
  property_facilities?: RelationRow[] | null;
  property_specs?: SpecsRow | SpecsRow[] | null;
  property_timeline?: TimelineRow | TimelineRow[] | null;
  property_unit_types?: RelationRow[] | null;
};

type SectionStatus = "none" | "partial" | "full";
type PropertyGalleryImage = {
  id: string;
  property_id: number;
  storage_path: string;
  image_url: string;
  sort_order: number;
  caption: string | null;
  created_at: string;
};

/* ==================================================
   하위 컴포넌트
================================================== */

// 섹션별 진행 상태 카드
function SectionCard({
  title,
  description,
  href,
  status,
  summary,
  icon: Icon,
  editDisabled,
}: {
  title: string;
  description: string;
  href: string;
  status: SectionStatus;
  summary?: string | null;
  icon: ComponentType<{ className?: string }>;
  editDisabled?: boolean;
}) {
  const statusLabel =
    status === "full" ? "완료" : status === "partial" ? "입력중" : "미입력";

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-4 transition hover:-translate-y-px hover:shadow-(--oboon-shadow-card)">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <div className="rounded-xl bg-(--oboon-bg-subtle) p-2 text-(--oboon-text-muted)">
            <Icon className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <span className="ob-typo-body font-semibold text-(--oboon-text-title)">
              {title}
            </span>
            <span className="ob-typo-body text-(--oboon-text-muted)">
              {description}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="status" className="text-[11px]">
            {statusLabel}
          </Badge>
          {editDisabled ? (
            <Button variant="secondary" size="sm" shape="pill" className="px-2" disabled>
              편집
            </Button>
          ) : (
            <Link href={href}>
              <Button variant="secondary" size="sm" shape="pill" className="px-2">
                편집
              </Button>
            </Link>
          )}
        </div>
      </div>
      <div className="rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle)/50 px-3 py-2 ob-typo-body text-(--oboon-text-muted)">
        {status !== "none" && summary ? summary : "아직 입력된 정보가 없어요"}
      </div>
    </div>
  );
}

// 읽기 모드 전용 정보 로우
function InfoRow({
  label,
  value,
  multiline,
  variant,
}: {
  label: string;
  value: ReactNode;
  multiline?: boolean;
  variant?: "inline" | "stacked";
}) {
  const v = variant ?? "inline";
  return (
    <div className="rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle)/50 px-3 py-3">
      {v === "inline" ? (
        <div
          className={[
            multiline ? "flex items-start" : "flex items-center",
            "justify-between gap-3",
          ].join(" ")}
        >
          <span className="ob-typo-body text-(--oboon-text-muted) shrink-0">
            {label}
          </span>
          <span className="ob-typo-body text-(--oboon-text-title) flex-1 min-w-0 text-right">
            {value ?? "-"}
          </span>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <span className="ob-typo-body text-(--oboon-text-muted)">
            {label}
          </span>
          <div className="ob-typo-body text-(--oboon-text-title)">
            {value ?? "-"}
          </div>
        </div>
      )}
    </div>
  );
}

/* ==================================================
   메인 페이지
================================================== */
export default function PropertyDetailPage() {
  return (
    <ToastProvider>
      <PropertyDetailPageInner />
    </ToastProvider>
  );
}

function PropertyDetailPageInner() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const id = Number(params.id);

  // 상태 관리
  const [data, setData] = useState<PropertyDetail | null>(null);
  const [form, setForm] = useState<PropertyRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [imageFileName, setImageFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const [galleryImages, setGalleryImages] = useState<PropertyGalleryImage[]>([]);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [galleryDeletingId, setGalleryDeletingId] = useState<string | null>(null);
  const [galleryReordering, setGalleryReordering] = useState(false);
  const [draggingGalleryImageId, setDraggingGalleryImageId] = useState<
    string | null
  >(null);
  const [dragOverGalleryImageId, setDragOverGalleryImageId] = useState<
    string | null
  >(null);
  const [requestStatus, setRequestStatus] =
    useState<PropertyRequestStatus | null>(null);
  const [deleteRequestStatus, setDeleteRequestStatus] =
    useState<PropertyRequestStatus | null>(null);
  const [deleteRequestId, setDeleteRequestId] = useState<string | number | null>(null);
  const [requestRejectionReason, setRequestRejectionReason] = useState<
    string | null
  >(null);
  const [requestLoading, setRequestLoading] = useState(false);
  const [needsReapproval, setNeedsReapproval] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isAffiliatedAgent, setIsAffiliatedAgent] = useState(false);

  const getPropertyListHref = () =>
    currentUserRole === "agent"
      ? "/agent/profile#property-register"
      : "/company/properties";

  const fetchGalleryImages = useCallback(async (propertyId: number) => {
    try {
      const response = await fetch(`/api/property/gallery?propertyId=${propertyId}`);
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "추가 사진 조회에 실패했습니다");
      }
      setGalleryImages((payload.images || []) as PropertyGalleryImage[]);
    } catch (error) {
      console.error("property gallery fetch error:", error);
      setGalleryImages([]);
    }
  }, []);

  // 데이터 로드
  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
      const { data: me } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      setCurrentUserRole(me?.role ?? null);

      if (me?.role === "agent") {
        const { data: memberships } = await supabase
          .from("property_agents")
          .select("id")
          .eq("agent_id", user.id)
          .eq("property_id", id)
          .eq("status", "approved")
          .limit(1);
        setIsAffiliatedAgent((memberships?.length ?? 0) > 0);
      } else {
        setIsAffiliatedAgent(false);
      }
    }

    const { data: res, error } = await fetchPropertyDetail(id);

    if (!error && res) {
      setData(res as PropertyDetail);
      setForm({
        id: res.id,
        name: res.name,
        property_type: res.property_type,
        status: res.status,
        description: res.description,
        image_url: res.image_url,
        confirmed_note: res.confirmed_note,
        estimated_note: res.estimated_note,
        undecided_note: res.undecided_note,
      });
      await fetchGalleryImages(res.id);
    }
    const [requestResult, deleteRequestResult] = await Promise.all([
      fetchMyPropertyRequest(id),
      fetchMyDeleteRequest(id),
    ]);
    if (!requestResult.error) {
      setRequestStatus(requestResult.data?.status ?? null);
      setRequestRejectionReason(requestResult.data?.rejection_reason ?? null);
    }
    if (!deleteRequestResult.error) {
      setDeleteRequestStatus(deleteRequestResult.data?.status ?? null);
      setDeleteRequestId(deleteRequestResult.data?.id ?? null);
    }

    setLoading(false);
  }, [fetchGalleryImages, id]);

  useEffect(() => {
    load();
  }, [load]);

  // 진행도 계산
  const { completion, progressPercent, incompleteSectionNames } =
    useMemo(() => {
      if (!data)
        return {
          completion: null,
          progressPercent: 0,
          incompleteSectionNames: [],
        };

      const status = getPropertySectionStatus(data);
      const sections = [
        { name: "현장 위치", status: status.siteLocationStatus },
        { name: "건물 스펙", status: status.specsStatus },
        { name: "일정", status: status.timelineStatus },
        { name: "평면 타입", status: status.unitStatus },
        { name: "홍보시설", status: status.facilityStatus },
        { name: "감정평가사 메모", status: status.commentStatus },
      ];

      const completedCount = sections.filter((s) => s.status === "full").length;
      const partialCount = sections.filter(
        (s) => s.status === "partial",
      ).length;

      // 완료(full)가 아닌 것들만 이름을 모읍니다.
      const incompleteNames = sections
        .filter((s) => s.status !== "full")
        .map((s) => s.name);

      const percent = Math.round(
        ((completedCount + partialCount * 0.5) / sections.length) * 100,
      );

      return {
        completion: status,
        progressPercent: percent,
        incompleteSectionNames: incompleteNames,
      };
    }, [data]);

  // 기본 정보 저장
  async function saveBasicInfo() {
    if (!form) return;
    if (!validateRequiredOrShowModal(form.name, "현장명")) return;
    setSaving(true);
    const { error } = await updatePropertyBasicInfo(id, { ...form });
    setSaving(false);

    if (error) return showAlert("저장 실패: " + error.message);

    setLocalPreview(null);
    setImageFileName(null);
    setEditMode(false);
    if (requestStatus === "approved" && currentUserRole !== "admin") {
      setNeedsReapproval(true);
    }
    load();
  }

  // 삭제 처리
  async function handleDelete() {
    if (currentUserRole === "agent") {
      if (deleteRequestStatus === "pending" && deleteRequestId) {
        const { error } = await cancelPropertyRequest(deleteRequestId);
        if (error) {
          showAlert(error.message || "삭제 요청 철회에 실패했습니다.");
          return;
        }

        showAlert("삭제 요청이 철회되었습니다.");
        setDeleteRequestStatus(null);
        setDeleteRequestId(null);
        return;
      }

      const reason = prompt("삭제 요청 사유를 입력해주세요:");
      if (!reason || !reason.trim()) return;

      const response = await fetch("/api/property-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: id,
          requestType: "delete",
          reason: reason.trim(),
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        showAlert(payload.error || "삭제 요청에 실패했습니다.");
        return;
      }

      showAlert("삭제 요청이 접수되었습니다. 관리자 승인 후 삭제됩니다.");
      setDeleteRequestStatus("pending");
      setDeleteRequestId(payload?.propertyRequest?.id ?? null);
      return;
    }

    if (!confirm("정말 현장을 삭제할까요?\n복구할 수 없어요.")) return;
    try {
      await deletePropertyCascade(id);
      router.push(getPropertyListHref());
    } catch (err) {
      showAlert(
        "삭제 실패: " +
          (err instanceof Error ? err.message : "알 수 없는 오류"),
      );
    }
  }

  async function handlePublishRequest() {
    if (deleteRequestStatus === "pending") {
      showAlert("삭제 요청 처리 중에는 게시 요청을 할 수 없습니다.");
      return;
    }
    if (requestLoading) return;
    setRequestLoading(true);
    const { error } = await createPropertyRequest(id, {
      force: (editMode || needsReapproval) && requestStatus === "approved",
    });
    setRequestLoading(false);

    if (error) {
      toast.error(error.message ?? "알 수 없는 오류", "요청 실패");
      return;
    }

    toast.success("게시 요청이 접수되었습니다.", "완료");
    const [requestResult, deleteRequestResult] = await Promise.all([
      fetchMyPropertyRequest(id),
      fetchMyDeleteRequest(id),
    ]);
    if (!requestResult.error) {
      setRequestStatus(requestResult.data?.status ?? null);
      setRequestRejectionReason(requestResult.data?.rejection_reason ?? null);
      setNeedsReapproval(false);
    }
    if (!deleteRequestResult.error) {
      setDeleteRequestStatus(deleteRequestResult.data?.status ?? null);
      setDeleteRequestId(deleteRequestResult.data?.id ?? null);
    }
  }

  // 이미지 업로드
  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !form) return;

    if (file.size > 5 * 1024 * 1024)
      return showAlert("이미지는 5MB 이하만 가능합니다.");

    setLocalPreview(URL.createObjectURL(file));
    setImageFileName(file.name);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("propertyId", String(id));
      formData.append("mode", "property_main");

      const res = await fetch("/api/r2/upload", {
        method: "POST",
        body: formData,
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Upload failed");

      setForm({ ...form, image_url: result.url });
    } catch (err) {
      showAlert(
        "업로드 실패: " + (err instanceof Error ? err.message : "오류"),
      );
      setImageFileName(null);
    }
  }

  const handleGallerySelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    if (galleryImages.length + files.length > 5) {
      toast.error("추가 사진은 최대 5장까지 업로드할 수 있습니다.", "업로드 실패");
      event.target.value = "";
      return;
    }

    setGalleryUploading(true);
    try {
      const formData = new FormData();
      formData.append("propertyId", String(id));
      files.forEach((file) => formData.append("files", file));

      const response = await fetch("/api/property/gallery", {
        method: "POST",
        body: formData,
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "업로드에 실패했습니다");
      }

      setGalleryImages((payload.images || []) as PropertyGalleryImage[]);
      toast.success("추가 사진이 업로드되었습니다.", "완료");
    } catch (error: any) {
      toast.error(error.message || "업로드 중 오류가 발생했습니다.", "업로드 실패");
    } finally {
      setGalleryUploading(false);
      event.target.value = "";
    }
  };

  const handleGalleryDelete = async (imageId: string) => {
    if (!confirm("이 사진을 삭제할까요?")) return;

    setGalleryDeletingId(imageId);
    try {
      const response = await fetch("/api/property/gallery", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: imageId, propertyId: id }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "삭제에 실패했습니다");
      }

      setGalleryImages((payload.images || []) as PropertyGalleryImage[]);
      toast.success("사진이 삭제되었습니다.", "완료");
    } catch (error: any) {
      toast.error(error.message || "삭제 중 오류가 발생했습니다.", "삭제 실패");
    } finally {
      setGalleryDeletingId(null);
    }
  };

  const saveGalleryOrder = async (reordered: PropertyGalleryImage[]) => {
    const updates = reordered.map((image, index) => ({
      id: image.id,
      sort_order: index + 1,
      caption: image.caption,
    }));

    setGalleryReordering(true);
    try {
      const response = await fetch("/api/property/gallery", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId: id, updates }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "정렬 저장에 실패했습니다");
      }

      setGalleryImages((payload.images || []) as PropertyGalleryImage[]);
    } catch (error: any) {
      toast.error(error.message || "정렬 저장 중 오류가 발생했습니다.", "정렬 실패");
    } finally {
      setGalleryReordering(false);
    }
  };

  const handleGalleryDragStart = (
    event: DragEvent<HTMLDivElement>,
    imageId: string,
  ) => {
    if (galleryReordering) return;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", imageId);
    setDraggingGalleryImageId(imageId);
    setDragOverGalleryImageId(null);
  };

  const handleGalleryDragOver = (
    event: DragEvent<HTMLDivElement>,
    imageId: string,
  ) => {
    if (!draggingGalleryImageId || draggingGalleryImageId === imageId) return;
    event.preventDefault();
    setDragOverGalleryImageId(imageId);
  };

  const handleGalleryDragEnd = () => {
    setDraggingGalleryImageId(null);
    setDragOverGalleryImageId(null);
  };

  const handleGalleryDrop = async (
    event: DragEvent<HTMLDivElement>,
    targetImageId: string,
  ) => {
    event.preventDefault();

    const sourceImageId =
      draggingGalleryImageId || event.dataTransfer.getData("text/plain");
    if (!sourceImageId || sourceImageId === targetImageId) {
      handleGalleryDragEnd();
      return;
    }

    const sourceIndex = galleryImages.findIndex((image) => image.id === sourceImageId);
    const targetIndex = galleryImages.findIndex((image) => image.id === targetImageId);

    if (sourceIndex < 0 || targetIndex < 0) {
      handleGalleryDragEnd();
      return;
    }

    const reordered = [...galleryImages];
    const [moved] = reordered.splice(sourceIndex, 1);
    reordered.splice(targetIndex, 0, moved);

    handleGalleryDragEnd();
    await saveGalleryOrder(reordered);
  };

  if (loading)
    return (
      <div className="flex h-40 items-center justify-center ob-typo-body text-(--oboon-text-muted)">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 불러오는 중...
      </div>
    );
  if (!data || !form)
    return (
      <div className="p-6 ob-typo-body text-(--oboon-text-muted)">
        데이터를 찾을 수 없습니다.
      </div>
    );

  const statusLabel = isPropertyStatus(data.status)
    ? PROPERTY_STATUS_LABEL[data.status]
    : "상태 미정";
  const canDelete =
    currentUserRole === "admin" || data.created_by === currentUserId;
  const hasPendingDeleteRequest = deleteRequestStatus === "pending";
  const canEditProperty =
    (canDelete || (currentUserRole === "agent" && isAffiliatedAgent)) &&
    !hasPendingDeleteRequest;
  const requestStatusLabel = needsReapproval
    ? "재승인 필요"
    : requestStatus
      ? requestStatus === "pending"
        ? "검토 대기"
        : requestStatus === "approved"
          ? "승인 완료"
          : "반려됨"
      : null;
  const requestBadgeVariant = needsReapproval
    ? "warning"
    : requestStatus === "approved"
      ? "success"
      : requestStatus === "rejected"
        ? "danger"
        : "warning";
  const publishButtonLabel = needsReapproval
    ? "재승인"
    : editMode
      ? "재승인"
      : requestStatus
        ? requestStatus === "pending"
          ? "요청 중"
          : requestStatus === "approved"
            ? "승인 완료"
            : "재요청"
        : currentUserRole === "admin"
          ? "게시"
          : "게시 요청";
  const publishDisabled =
    requestLoading || requestStatus === "pending" || hasPendingDeleteRequest;
  const showPublishButton =
    !requestStatus ||
    requestStatus !== "approved" ||
    needsReapproval ||
    (editMode && currentUserRole !== "admin");
  const displayImageFileName =
    imageFileName ||
    (() => {
      const url = (form.image_url || "").trim();
      if (!url) return null;
      try {
        const parsed = new URL(url);
        const fileName = decodeURIComponent(
          (parsed.pathname.split("/").pop() || "").trim(),
        );
        return fileName || null;
      } catch {
        const fileName = decodeURIComponent(
          (url.split("/").pop() || "").split("?")[0].trim(),
        );
        return fileName || null;
      }
    })();

  return (
    <main className="bg-(--oboon-bg-page)">
      <PageContainer className="pb-10">
        <div className="flex w-full flex-col gap-6">
          {/* 헤더 섹션 */}
          <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold text-(--oboon-text-title)">
                현장 상세
              </h1>
              <p className="ob-typo-body text-(--oboon-text-muted)">
                이 현장의 핵심 정보와 입력 상태를 확인해요
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="status" className="text-[11px]">
                {statusLabel}
              </Badge>
              {requestStatusLabel ? (
                <Badge variant={requestBadgeVariant} className="text-[11px]">
                  게시 요청 · {requestStatusLabel}
                </Badge>
              ) : null}
              {hasPendingDeleteRequest ? (
                <Badge variant="danger" className="text-[11px]">
                  삭제 요청 처리 중
                </Badge>
              ) : null}
              {!editMode ? (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    shape="pill"
                    onClick={() => router.push(getPropertyListHref())}
                  >
                    목록
                  </Button>
                  {showPublishButton ? (
                    <Button
                      variant={publishDisabled ? "secondary" : "primary"}
                      size="sm"
                      shape="pill"
                      disabled={publishDisabled}
                      loading={requestLoading}
                      onClick={handlePublishRequest}
                    >
                      {publishButtonLabel}
                    </Button>
                  ) : null}
                  {canDelete ? (
                    <Button
                      variant="danger"
                      size="sm"
                      shape="pill"
                      onClick={handleDelete}
                    >
                      {currentUserRole === "agent"
                        ? hasPendingDeleteRequest
                          ? "삭제 요청 철회"
                          : "삭제 요청"
                        : "삭제"}
                    </Button>
                  ) : null}
                </>
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  shape="pill"
                  onClick={() => {
                    setEditMode(false);
                    setLocalPreview(null);
                  }}
                >
                  취소
                </Button>
              )}
            </div>
          </header>

          {/* 프로그레스 바 */}
          <div className="rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) px-5 py-4 shadow-sm">
            <div className="flex flex-col gap-3">
              <div className="flex items-end justify-between">
                <div className="w-full space-y-1">
                  <span
                    className="ob-typo-body text-(--oboon-text-muted) tracking-wider"
                    style={{ fontWeight: "var(--oboon-font-weight-bold)" }}
                  >
                    입력 진행률
                  </span>
                  <div>
                    <span
                      className="ob-typo-h2 text-(--oboon-text-title)"
                      style={{ fontWeight: "var(--oboon-font-weight-heavy)" }}
                    >
                      {progressPercent}%
                    </span>
                  </div>
                  <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full bg-(--oboon-primary) transition-all duration-700 ease-out"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <div className="mt-3 flex flex-wrap items-start gap-2">
                    {hasPendingDeleteRequest ? (
                      <span className="inline-flex max-w-full rounded-full border border-(--oboon-danger-border) bg-(--oboon-danger-bg) px-3 py-1.5 ob-typo-body text-(--oboon-on-danger)">
                        삭제 요청 처리 중이라 편집과 게시 요청이 잠시 비활성화됩니다.
                      </span>
                    ) : (
                      <>
                        {incompleteSectionNames.length > 0 ? (
                          <span className="inline-flex max-w-full flex-col rounded-xl bg-(--oboon-warning-bg) px-3 py-1.5 text-(--oboon-warning)">
                            <span className="ob-typo-caption font-bold">입력 필요</span>
                            <span className="ob-typo-body break-words">
                              {incompleteSectionNames.join(", ")}
                            </span>
                          </span>
                        ) : (
                          <span className="inline-flex rounded-xl bg-(--oboon-safe-bg) px-3 py-1.5 ob-typo-body text-(--oboon-safe)">
                            모든 섹션 입력 완료
                          </span>
                        )}
                        {requestStatus === "rejected" && requestRejectionReason ? (
                          <span className="inline-flex max-w-full flex-col rounded-xl bg-(--oboon-danger-bg) px-3 py-1.5 text-(--oboon-danger)">
                            <span className="ob-typo-caption font-bold">반려 사유</span>
                            <span className="ob-typo-body break-words">{requestRejectionReason}</span>
                          </span>
                        ) : null}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 기본 정보 카드 */}
          <Card className="px-6 py-5">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-(--oboon-text-title)">
                기본 정보
              </h2>
              {!editMode ? (
                <Button
                  variant="secondary"
                  size="sm"
                  shape="pill"
                  disabled={!canEditProperty}
                  onClick={() => setEditMode(true)}
                >
                  편집
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  shape="pill"
                  onClick={saveBasicInfo}
                  loading={saving}
                >
                  저장
                </Button>
              )}
            </div>

            {!editMode ? (
              /* 읽기 모드 UI */
              <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                <div className="md:col-span-2 grid grid-cols-1 gap-2 md:grid-cols-2">
                  <InfoRow label="현장명" value={data.name} />
                  <InfoRow label="분양 유형" value={data.property_type} />
                  <InfoRow label="분양 상태" value={statusLabel} />
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle)/50 p-3">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-(--oboon-border-default)">
                    {data.image_url ? (
                      <img
                        src={data.image_url}
                        alt="Thumbnail"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="text-(--oboon-text-muted)" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="ob-typo-body text-(--oboon-text-muted)">
                      대표 이미지
                    </p>
                    <p className="truncate ob-typo-body font-medium">
                      {data.image_url ? "등록됨" : "미등록"}
                    </p>
                  </div>
                </div>
                <div className="md:col-span-3">
                  <InfoRow
                    label="설명"
                    variant="stacked"
                    multiline
                    value={
                      <div className="w-full">
                        <p
                          className={[
                            "ob-typo-body leading-relaxed text-(--oboon-text-title) w-full",
                            showFullDesc ? "" : "line-clamp-2",
                          ].join(" ")}
                        >
                          {data.description || "등록된 설명이 없습니다."}
                        </p>

                        {data.description && data.description.length > 80 ? (
                          <button
                            type="button"
                            onClick={() => setShowFullDesc((v) => !v)}
                            className="mt-2 inline-flex ob-typo-body font-semibold text-(--oboon-primary)"
                          >
                            {showFullDesc ? "접기" : "더보기"}
                          </button>
                        ) : null}
                      </div>
                    }
                  />
                </div>
              </div>
            ) : (
              /* 편집 모드 UI */
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                <FormField label="현장명">
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </FormField>
                <FormField label="분양 유형">
                  <Input
                    value={form.property_type ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, property_type: e.target.value })
                    }
                  />
                </FormField>
                <FormField label="분양 상태">
                  <PropertyStatusSelect
                    value={
                      isPropertyStatus(form.status)
                        ? form.status
                        : PROPERTY_STATUS_OPTIONS[0].value
                    }
                    onChange={(v) => setForm({ ...form, status: v })}
                  />
                </FormField>
                <FormField label="설명" className="md:col-span-2">
                  <Textarea
                    className="w-full min-h-25 rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-3 ob-typo-body focus:outline-none focus:ring-2 focus:ring-(--oboon-primary)/20"
                    value={form.description ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                  />
                </FormField>
                <FormField label="대표 이미지" className="md:col-span-2">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        shape="pill"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        이미지 업로드
                      </Button>
                      {localPreview || form.image_url ? (
                        <Button
                          variant="danger"
                          size="sm"
                          shape="pill"
                          onClick={() => {
                            setForm({ ...form, image_url: null });
                            setLocalPreview(null);
                            setImageFileName(null);
                          }}
                        >
                          삭제
                        </Button>
                      ) : null}
                      <p className="ob-typo-caption text-(--oboon-text-muted) truncate">
                        {displayImageFileName ? (
                          <>
                            선택된 파일:{" "}
                            <span className="text-(--oboon-text-title)">
                              {displayImageFileName}
                            </span>
                          </>
                        ) : (
                          "선택된 파일 없음"
                        )}
                      </p>

                      <input
                        type="file"
                        ref={fileInputRef}
                        className="sr-only"
                        accept="image/*"
                        onChange={(e) => {
                          handleImageUpload(e);
                          e.currentTarget.value = "";
                        }}
                      />
                    </div>

                    {/* 이미지 카드 */}
                    <div className="relative grid-cols-2 aspect-video w-full max-w-sm overflow-hidden rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-surface)">
                      {localPreview || form.image_url ? (
                        <img
                          src={localPreview || form.image_url || ""}
                          className="h-full w-full object-cover"
                          alt="Preview"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center ob-typo-caption text-(--oboon-text-muted)">
                          이미지가 없습니다
                        </div>
                      )}
                    </div>
                  </div>
                </FormField>
              </div>
            )}

            <div className="mt-5 space-y-2 border-t border-(--oboon-border-default) pt-4">
              <div className="flex items-center justify-between">
                <h3 className="ob-typo-body font-semibold text-(--oboon-text-title)">
                  추가 사진 (선택)
                </h3>
                <span className="ob-typo-caption text-(--oboon-text-muted)">
                  {galleryImages.length}/5
                </span>
              </div>

              {editMode ? (
                <>
                  <input
                    ref={galleryInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    className="hidden"
                    onChange={handleGallerySelect}
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    onClick={() => galleryInputRef.current?.click()}
                    disabled={galleryUploading || galleryImages.length >= 5}
                    loading={galleryUploading}
                  >
                    이미지 업로드
                  </Button>
                  <p className="ob-typo-caption text-(--oboon-text-muted)">
                    jpg/png/webp, 파일당 5MB, 최대 5장까지 등록할 수 있습니다.
                  </p>
                </>
              ) : null}

              {galleryImages.length === 0 ? (
                <div className="rounded-xl border border-dashed border-(--oboon-border-default) p-4 text-center ob-typo-caption text-(--oboon-text-muted)">
                  등록된 추가 사진이 없습니다.
                </div>
              ) : (
                <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 md:grid md:grid-cols-5 md:overflow-visible">
                  {galleryImages.map((image, index) => (
                    <div
                      key={image.id}
                      draggable={editMode && !galleryReordering}
                      onDragStart={(event) => handleGalleryDragStart(event, image.id)}
                      onDragOver={(event) => handleGalleryDragOver(event, image.id)}
                      onDrop={(event) => handleGalleryDrop(event, image.id)}
                      onDragEnd={handleGalleryDragEnd}
                      className={[
                        "relative w-28 shrink-0 snap-start overflow-hidden rounded-xl border bg-(--oboon-bg-surface) transition md:w-auto",
                        draggingGalleryImageId === image.id
                          ? "opacity-50 border-(--oboon-primary)"
                          : "border-(--oboon-border-default)",
                        dragOverGalleryImageId === image.id
                          ? "ring-2 ring-(--oboon-primary)/50"
                          : "",
                      ].join(" ")}
                    >
                      <div className="relative aspect-square w-full overflow-hidden bg-(--oboon-bg-subtle)">
                        <img
                          src={image.image_url}
                          alt={`현장 추가 사진 ${index + 1}`}
                          className="h-full w-full object-cover"
                        />
                        <div className="pointer-events-none absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/55 ob-typo-caption font-medium text-white">
                          {index + 1}
                        </div>
                        {editMode ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="absolute right-2 top-1 h-6 w-6 min-w-0 rounded-full p-0 !bg-transparent text-white hover:!bg-transparent hover:text-white"
                            disabled={galleryDeletingId === image.id}
                            onClick={() => handleGalleryDelete(image.id)}
                          >
                            <X className="h-4 w-4 text-(--oboon-danger)" />
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* 상세 섹션 카드 목록 */}
          <section className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <SectionCard
              title="현장 위치"
              description="주소 및 위치 정보"
              status={completion?.siteLocationStatus ?? "none"}
              summary={
                completion?.siteLocationStatus !== "none"
                  ? "주소가 등록되었습니다"
                  : null
              }
              href={`/company/properties/${id}/location`}
              icon={MapPin}
              editDisabled={!canEditProperty}
            />
            <SectionCard
              title="건물 스펙"
              description="규모, 구조, 주차 등"
              status={completion?.specsStatus ?? "none"}
              summary={
                completion?.specsStatus !== "none"
                  ? "스펙 정보가 등록되었습니다"
                  : null
              }
              href={`/company/properties/${id}/specs`}
              icon={Building2}
              editDisabled={!canEditProperty}
            />
            <SectionCard
              title="일정"
              description="분양, 입주 등 주요 일정"
              status={completion?.timelineStatus ?? "none"}
              summary={
                completion?.timelineStatus !== "none"
                  ? "일정 정보가 등록되었습니다"
                  : null
              }
              href={`/company/properties/${id}/timeline`}
              icon={CalendarDays}
              editDisabled={!canEditProperty}
            />
            <SectionCard
              title="평면 타입"
              description="타입별 면적 및 구조"
              status={completion?.unitStatus ?? "none"}
              summary={
                completion?.unitStatus !== "none"
                  ? "유닛 정보가 등록되었습니다"
                  : null
              }
              href={`/company/properties/${id}/units`}
              icon={LayoutTemplate}
              editDisabled={!canEditProperty}
            />
            <SectionCard
              title="홍보시설"
              description="모델하우스 및 홍보관"
              status={completion?.facilityStatus ?? "none"}
              summary={
                completion?.facilityStatus !== "none"
                  ? "시설 정보가 등록되었습니다"
                  : null
              }
              href={`/company/properties/${id}/facilities`}
              icon={Landmark}
              editDisabled={!canEditProperty}
            />
            <SectionCard
              title="감정평가사 메모"
              description="감정평가사가 직접 평가한 메모"
              status={completion?.facilityStatus ?? "none"}
              summary={
                completion?.facilityStatus !== "none"
                  ? "메모가 등록되었습니다"
                  : null
              }
              href={`/company/properties/${id}/comment`}
              icon={Landmark}
              editDisabled={!canEditProperty}
            />
          </section>
        </div>
      </PageContainer>
    </main>
  );
}
