"use client";

import {
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Building2,
  CalendarDays,
  Landmark,
  LayoutTemplate,
  MapPin,
  Loader2,
} from "lucide-react";

import { updatePropertyBasicInfo } from "@/features/company/services/property.detail";
import { fetchUnitTypePriceRanges } from "@/features/company/services/unitTypes.service";
import { validateRequiredOrShowModal } from "@/shared/validationMessage";

import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import PageContainer from "@/components/shared/PageContainer";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import { showAlert } from "@/shared/alert";
import { useRequirePropertyEditAccess } from "@/features/company/hooks/useRequirePropertyEditAccess";
import { updatePropertyImage } from "@/features/company/services/property.create";
import LocationEditorCard from "@/features/company/components/property-editor/LocationEditorCard";
import SpecsEditorCard from "@/features/company/components/property-editor/SpecsEditorCard";
import TimelineEditorCard from "@/features/company/components/property-editor/TimelineEditorCard";
import CommentEditorCard from "@/features/company/components/property-editor/CommentEditorCard";
import UnitTypesEditorCard from "@/features/company/components/property-editor/UnitTypesEditorCard";
import FacilitiesEditorCard from "@/features/company/components/property-editor/FacilitiesEditorCard";
import BasicInfoCard from "@/features/company/components/property-detail/BasicInfoCard";
import PropertyGallerySection from "@/features/company/components/property-detail/PropertyGallerySection";
import { usePropertyGallery } from "@/features/company/hooks/usePropertyGallery";
import { usePropertyDetailPage } from "@/features/company/hooks/usePropertyDetailPage";
import type { SectionStatus } from "@/features/company/domain/propertyDetail.types";

/* ==================================================
   하위 컴포넌트
================================================== */

function IntegratedEditorCard({
  title,
  description,
  summary,
  status,
  icon: Icon,
  children,
  defaultOpen = false,
}: {
  title: string;
  description: string;
  summary?: string | null;
  status: SectionStatus;
  icon: ComponentType<{ className?: string }>;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const statusLabel =
    status === "full" ? "완료" : status === "partial" ? "입력중" : "미입력";

  return (
    <div className="rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
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
          <Button
            variant="secondary"
            size="sm"
            shape="pill"
            className="px-2"
            onClick={() => setOpen((prev) => !prev)}
          >
            {open ? "닫기" : "열기"}
          </Button>
        </div>
      </div>
      {!open ? (
        <div className="mb-4 rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle)/50 px-3 py-2 ob-typo-body text-(--oboon-text-muted)">
          {status !== "none" && summary ? summary : "아직 입력된 정보가 없어요"}
        </div>
      ) : null}
      {open ? children : null}
    </div>
  );
}

function sanitizeContractRatioPercentInput(value: string): string {
  const onlyAllowed = value.replace(/[^\d.]/g, "");
  const [head, ...tail] = onlyAllowed.split(".");
  const merged = tail.length > 0 ? `${head}.${tail.join("")}` : head;
  return merged;
}

function parseContractRatioPercentInput(value: string): number | null {
  const normalized = value.replaceAll(",", "").trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) return null;
  return parsed;
}

function formatContractRatioPercent(value: unknown): string {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return "10";
  }
  const percent = value <= 1 ? value * 100 : value;
  const rounded = Math.round(percent * 100) / 100;
  return String(rounded).replace(/\.0+$/, "").replace(/(\.\d*[1-9])0+$/, "$1");
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
  const isValidPropertyId = Number.isFinite(id) && id > 0;
  const { loading: accessLoading, allowed: canAccessProperty } =
    useRequirePropertyEditAccess(id);

  // 상태 관리
  const [saving, setSaving] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [imageFileName, setImageFileName] = useState<string | null>(null);
  const [validationContractRatioPercent, setValidationContractRatioPercent] =
    useState("10");
  const [validationTransferRestriction, setValidationTransferRestriction] =
    useState(false);
  const [validationTransferRestrictionPeriod, setValidationTransferRestrictionPeriod] =
    useState("없음");
  const [savedValidationContractRatioPercent, setSavedValidationContractRatioPercent] =
    useState("10");
  const [savedValidationTransferRestriction, setSavedValidationTransferRestriction] =
    useState(false);
  const [
    savedValidationTransferRestrictionPeriod,
    setSavedValidationTransferRestrictionPeriod,
  ] = useState("없음");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const {
    galleryInputRef,
    galleryImages,
    galleryUploading,
    galleryDeletingId,
    galleryReordering,
    draggingGalleryImageId,
    dragOverGalleryImageId,
    fetchGalleryImages,
    handleGallerySelect,
    handleGalleryDelete,
    handleGalleryDragStart,
    handleGalleryDragOver,
    handleGalleryDragEnd,
    handleGalleryDrop,
  } = usePropertyGallery({ propertyId: id, toast });
  const {
    data,
    form,
    setForm,
    loading,
    load,
    completion,
    progressPercent,
    incompleteSectionNames,
    statusLabel,
    canSeeCommentSection,
    currentUserRole,
    canDelete,
    hasPendingDeleteRequest,
    canEditProperty,
    propertyListHref,
    handleDelete,
  } = usePropertyDetailPage({
    id,
    isValidPropertyId,
    accessLoading,
    canAccessProperty,
    fetchGalleryImages,
  });

  useEffect(() => {
    if (!isValidPropertyId || loading) return;
    let isMounted = true;

    const loadValidationProfile = async () => {
      try {
        const response = await fetch(
          `/api/condition-validation/profiles/upsert?propertyId=${id}`,
        );
        const payload = (await response.json().catch(() => null)) as
          | {
              ok?: boolean;
              resolved?: {
                contract_ratio?: number | null;
                transfer_restriction?: boolean | null;
                transfer_restriction_period?: string | null;
              };
            }
          | null;

        if (!isMounted) return;

        const nextContractRatioPercent = formatContractRatioPercent(
          payload?.resolved?.contract_ratio,
        );
        const nextTransferRestriction = Boolean(
          payload?.resolved?.transfer_restriction,
        );
        const nextTransferRestrictionPeriod =
          typeof payload?.resolved?.transfer_restriction_period === "string" &&
          payload.resolved.transfer_restriction_period.trim().length > 0
            ? payload.resolved.transfer_restriction_period.trim()
            : nextTransferRestriction
              ? ""
              : "없음";

        setValidationContractRatioPercent(nextContractRatioPercent);
        setValidationTransferRestriction(nextTransferRestriction);
        setValidationTransferRestrictionPeriod(nextTransferRestrictionPeriod);
        setSavedValidationContractRatioPercent(nextContractRatioPercent);
        setSavedValidationTransferRestriction(nextTransferRestriction);
        setSavedValidationTransferRestrictionPeriod(nextTransferRestrictionPeriod);
      } catch {
        if (!isMounted) return;
        setValidationContractRatioPercent("10");
        setValidationTransferRestriction(false);
        setValidationTransferRestrictionPeriod("없음");
        setSavedValidationContractRatioPercent("10");
        setSavedValidationTransferRestriction(false);
        setSavedValidationTransferRestrictionPeriod("없음");
      }
    };

    void loadValidationProfile();

    return () => {
      isMounted = false;
    };
  }, [id, isValidPropertyId, loading]);

  // 기본 정보 저장
  async function saveBasicInfo() {
    if (!form) return;
    if (imageUploading) {
      showAlert("대표 이미지 업로드가 완료된 후 저장해주세요.");
      return;
    }
    if (!validateRequiredOrShowModal(form.name, "현장명")) return;
    const parsedContractRatioPercent = parseContractRatioPercentInput(
      validationContractRatioPercent,
    );
    if (parsedContractRatioPercent === null) {
      showAlert("계약금 비율은 0~100 사이 숫자로 입력해주세요. (예: 10)");
      return;
    }
    setSaving(true);
    const { data: updatedRow, error } = await updatePropertyBasicInfo(id, {
      name: form.name?.trim() ?? "",
      property_type: form.property_type?.trim() || null,
      status: form.status || null,
      description: form.description?.trim() || null,
    });
    setSaving(false);

    if (error) return showAlert("저장 실패: " + (error instanceof Error ? error.message : "알 수 없는 오류"));
    if (!updatedRow) return showAlert("저장 권한이 없거나 수정할 현장을 찾을 수 없습니다.");

    const nextImageUrl = form.image_url?.trim() || null;
    const prevImageUrl = data?.image_url?.trim() || null;
    if (nextImageUrl !== prevImageUrl) {
      const imageUpdateResult = await updatePropertyImage(id, nextImageUrl);
      if (imageUpdateResult.error) {
        return showAlert(
          "대표 이미지 저장 실패: " +
            (imageUpdateResult.error instanceof Error
              ? imageUpdateResult.error.message
              : "알 수 없는 오류"),
        );
      }
    }

    const { data: unitTypeRows } = await fetchUnitTypePriceRanges(id);

    const validationProfileResponse = await fetch(
      "/api/condition-validation/profiles/upsert",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: id,
          propertyType: form.property_type?.trim() || null,
          unitTypes: unitTypeRows ?? [],
          contractRatio: parsedContractRatioPercent / 100,
          transferRestriction: validationTransferRestriction,
          transferRestrictionPeriod: validationTransferRestriction
            ? validationTransferRestrictionPeriod.trim() || null
            : "없음",
        }),
      },
    );

    if (!validationProfileResponse.ok) {
      const payload = (await validationProfileResponse.json().catch(() => null)) as
        | { error?: string }
        | null;
      toast.error(
        payload?.error ?? "조건 검증 기준(전매 제한/계약금 비율) 저장에 실패했습니다.",
        "주의",
      );
    } else {
      setSavedValidationContractRatioPercent(validationContractRatioPercent);
      setSavedValidationTransferRestriction(validationTransferRestriction);
      setSavedValidationTransferRestrictionPeriod(
        validationTransferRestriction
          ? validationTransferRestrictionPeriod.trim() || ""
          : "없음",
      );
    }

    setLocalPreview(null);
    setImageFileName(null);
    setEditMode(false);
    load();
  }

  // 이미지 업로드
  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    const file = e.target.files?.[0];
    if (!file || !form) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      showAlert("대표 이미지는 jpg/png/webp 파일만 가능합니다.");
      input.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024)
      return showAlert("이미지는 5MB 이하만 가능합니다.");

    setLocalPreview(URL.createObjectURL(file));
    setImageFileName(file.name);
    setImageUploading(true);

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

      setForm((prev) => (prev ? { ...prev, image_url: result.url } : prev));
    } catch (err) {
      showAlert(
        "업로드 실패: " + (err instanceof Error ? (err instanceof Error ? err.message : "알 수 없는 오류") : "오류"),
      );
      setImageFileName(null);
      setLocalPreview(null);
    } finally {
      setImageUploading(false);
      input.value = "";
    }
  }

  if (accessLoading)
    return (
      <div className="flex h-40 items-center justify-center ob-typo-body text-(--oboon-text-muted)">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 권한 확인 중...
      </div>
    );
  if (!canAccessProperty) return null;
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

  function cancelBasicInfoEdit() {
    if (!data) return;
    setForm({
      id: data.id,
      name: data.name,
      property_type: data.property_type,
      status: data.status,
      description: data.description,
      image_url: data.image_url,
      confirmed_comment: data.confirmed_comment,
      estimated_comment: data.estimated_comment,
    });
    setValidationContractRatioPercent(savedValidationContractRatioPercent);
    setValidationTransferRestriction(savedValidationTransferRestriction);
    setValidationTransferRestrictionPeriod(
      savedValidationTransferRestrictionPeriod,
    );
    setEditMode(false);
    setLocalPreview(null);
    setImageFileName(null);
  }

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
                    onClick={() => router.push(propertyListHref)}
                  >
                    목록
                  </Button>
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
                  onClick={cancelBasicInfoEdit}
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
                        삭제 요청 처리 중이라 편집이 잠시 비활성화됩니다.
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
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 기본 정보 카드 */}
          <BasicInfoCard
            data={data}
            form={form}
            statusLabel={statusLabel}
            canEditProperty={canEditProperty}
            editMode={editMode}
            saving={saving}
            imageUploading={imageUploading}
            showFullDesc={showFullDesc}
            setShowFullDesc={setShowFullDesc}
            localPreview={localPreview}
            displayImageFileName={displayImageFileName}
            fileInputRef={fileInputRef}
            onStartEdit={() => setEditMode(true)}
            onCancelEdit={cancelBasicInfoEdit}
            onSave={saveBasicInfo}
            onImageUpload={handleImageUpload}
            onClearImage={() => {
              setForm((prev) =>
                prev ? { ...prev, image_url: null } : prev,
              );
              setLocalPreview(null);
              setImageFileName(null);
            }}
            onNameChange={(value) =>
              setForm((prev) => (prev ? { ...prev, name: value } : prev))
            }
            onPropertyTypeChange={(value) =>
              setForm((prev) =>
                prev ? { ...prev, property_type: value } : prev,
              )
            }
            onStatusChange={(value) =>
              setForm((prev) => (prev ? { ...prev, status: value } : prev))
            }
            onDescriptionChange={(value) =>
              setForm((prev) =>
                prev ? { ...prev, description: value } : prev,
              )
            }
            validationContractRatioPercent={validationContractRatioPercent}
            validationTransferRestriction={validationTransferRestriction}
            validationTransferRestrictionPeriod={validationTransferRestrictionPeriod}
            onValidationContractRatioChange={(value) =>
              setValidationContractRatioPercent(
                sanitizeContractRatioPercentInput(value),
              )
            }
            onValidationTransferRestrictionChange={(next) => {
              setValidationTransferRestriction(next);
              setValidationTransferRestrictionPeriod((prev) => {
                if (!next) return "없음";
                return prev === "없음" ? "" : prev;
              });
            }}
            onValidationTransferRestrictionPeriodChange={(value) =>
              setValidationTransferRestrictionPeriod(value)
            }
          >
            <PropertyGallerySection
              editMode={editMode}
              images={galleryImages}
              galleryInputRef={galleryInputRef}
              galleryUploading={galleryUploading}
              galleryDeletingId={galleryDeletingId}
              galleryReordering={galleryReordering}
              draggingGalleryImageId={draggingGalleryImageId}
              dragOverGalleryImageId={dragOverGalleryImageId}
              onSelect={handleGallerySelect}
              onDelete={handleGalleryDelete}
              onDragStart={handleGalleryDragStart}
              onDragOver={handleGalleryDragOver}
              onDrop={handleGalleryDrop}
              onDragEnd={handleGalleryDragEnd}
            />
          </BasicInfoCard>

          {canEditProperty ? (
            <section className="space-y-3">
              <IntegratedEditorCard
                title="현장 위치"
                description="주소 및 위치 정보"
                status={completion?.siteLocationStatus ?? "none"}
                summary={
                  completion?.siteLocationStatus !== "none"
                    ? "주소가 등록되었습니다"
                    : null
                }
                icon={MapPin}
              >
                <LocationEditorCard propertyId={id} />
              </IntegratedEditorCard>
              <IntegratedEditorCard
                title="건물 스펙"
                description="규모, 구조, 주차 등"
                status={completion?.specsStatus ?? "none"}
                summary={
                  completion?.specsStatus !== "none"
                    ? "스펙 정보가 등록되었습니다"
                    : null
                }
                icon={Building2}
              >
                <SpecsEditorCard propertyId={id} />
              </IntegratedEditorCard>
              <IntegratedEditorCard
                title="일정"
                description="분양, 입주 등 주요 일정"
                status={completion?.timelineStatus ?? "none"}
                summary={
                  completion?.timelineStatus !== "none"
                    ? "일정 정보가 등록되었습니다"
                    : null
                }
                icon={CalendarDays}
              >
                <TimelineEditorCard propertyId={id} />
              </IntegratedEditorCard>
              <IntegratedEditorCard
                title="평면 타입"
                description="타입별 면적 및 구조"
                status={completion?.unitStatus ?? "none"}
                summary={
                  completion?.unitStatus !== "none"
                    ? "유닛 정보가 등록되었습니다"
                    : null
                }
                icon={LayoutTemplate}
              >
                <UnitTypesEditorCard propertyId={id} />
              </IntegratedEditorCard>
              <IntegratedEditorCard
                title="홍보시설"
                description="모델하우스 및 홍보관"
                status={completion?.facilityStatus ?? "none"}
                summary={
                  completion?.facilityStatus !== "none"
                    ? "시설 정보가 등록되었습니다"
                    : null
                }
                icon={Landmark}
              >
                <FacilitiesEditorCard
                  propertyId={id}
                  embedded
                />
              </IntegratedEditorCard>
              {canSeeCommentSection ? (
                <IntegratedEditorCard
                  title="감정평가사 메모"
                  description="감정평가사가 직접 평가한 메모"
                  status={completion?.commentStatus ?? "none"}
                  summary={
                    completion?.commentStatus !== "none"
                      ? "메모가 등록되었습니다"
                      : null
                  }
                  icon={Landmark}
                >
                  <CommentEditorCard propertyId={id} />
                </IntegratedEditorCard>
              ) : null}
            </section>
          ) : null}
        </div>
      </PageContainer>
    </main>
  );
}
