// app/company/properties/new/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { X } from "lucide-react";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Label from "@/components/ui/Label";
import Textarea from "@/components/ui/Textarea";
import PageContainer from "@/components/shared/PageContainer";

import { fetchCompanyUserId } from "@/features/company/services/company.auth";
import { createProperty, updatePropertyImage } from "@/features/company/services/property.create";
import { validateRequiredOrShowModal } from "@/shared/validationMessage";
import { showAlert } from "@/shared/alert";
import { toKoreanErrorMessage } from "@/shared/errorMessage";

import PropertyStatusSelect from "@/app/company/properties/PropertyStatusSelect";
import {
  PROPERTY_STATUS_OPTIONS,
  type PropertyStatus,
} from "@/features/property/domain/propertyStatus";
import { createSupabaseClient } from "@/lib/supabaseClient";

type PropertyForm = {
  name: string;
  property_type: string;
  status: PropertyStatus;
  description: string;
  confirmed_comment: string;
  estimated_comment: string;
};

type PendingGalleryImage = {
  id: string;
  file: File;
  previewUrl: string;
};

type DuplicatePropertyCandidate = {
  id: number;
  name: string | null;
  property_type: string | null;
  image_url: string | null;
  status: string | null;
};

type AffiliationStatus = "pending" | "approved" | "rejected" | "withdrawn" | null;

function normalizePropertyName(value: string) {
  return value.replace(/\s+/g, "").toLowerCase();
}

function cn(...classes: Array<string | undefined | false | null>) {
  return classes.filter(Boolean).join(" ");
}

const TEXTAREA_BASE = cn(
  "w-full rounded-xl border border-(--oboon-border-default)",
  "bg-(--oboon-bg-surface) px-4 py-3",
  "ob-typo-body text-(--oboon-text-title) placeholder:text-(--oboon-text-muted)",
  "focus:outline-none focus:ring-2 focus:ring-(--oboon-primary)/25",
);

export default function PropertyCreatePage() {
  const router = useRouter();
  const defaultStatus = PROPERTY_STATUS_OPTIONS[0]?.value;

  const [form, setForm] = useState<PropertyForm>({
    name: "",
    property_type: "",
    status: defaultStatus ?? PROPERTY_STATUS_OPTIONS[0].value,
    description: "",
    confirmed_comment: "",
    estimated_comment: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicateCandidates, setDuplicateCandidates] = useState<
    DuplicatePropertyCandidate[]
  >([]);
  const [hasExactDuplicate, setHasExactDuplicate] = useState(false);
  const [affiliationStatusMap, setAffiliationStatusMap] = useState<
    Record<number, AffiliationStatus>
  >({});
  const [isNameComposing, setIsNameComposing] = useState(false);
  const [applyingAffiliationPropertyId, setApplyingAffiliationPropertyId] =
    useState<number | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  const cancelHref = useMemo(() => {
    if (userRole === "agent") return "/agent/profile#property-register";
    if (userRole === "admin") return "/admin?tab=properties";
    return "/";
  }, [userRole]);

  // 대표 이미지 파일 + 미리보기
  const [mainImageFile, setMainImageFile] = useState<File | null>(null);
  const [mainImageFileName, setMainImageFileName] = useState<string | null>(
    null,
  );
  const mainImageInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const [galleryImages, setGalleryImages] = useState<PendingGalleryImage[]>([]);
  const galleryImagesRef = useRef<PendingGalleryImage[]>([]);
  const submitLockRef = useRef(false);
  const duplicateCheckTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const duplicateCheckRequestIdRef = useRef(0);
  const [draggingGalleryImageId, setDraggingGalleryImageId] = useState<
    string | null
  >(null);
  const [dragOverGalleryImageId, setDragOverGalleryImageId] = useState<
    string | null
  >(null);

  const mainImagePreview = useMemo(
    () => (mainImageFile ? URL.createObjectURL(mainImageFile) : null),
    [mainImageFile],
  );

  useEffect(() => {
    return () => {
      if (mainImagePreview) URL.revokeObjectURL(mainImagePreview);
    };
  }, [mainImagePreview]);

  useEffect(() => {
    galleryImagesRef.current = galleryImages;
  }, [galleryImages]);

  useEffect(() => {
    return () => {
      galleryImagesRef.current.forEach((item) => {
        URL.revokeObjectURL(item.previewUrl);
      });
    };
  }, []);

  // 로그인 유저 확인
  useEffect(() => {
    async function checkUser() {
      const userId = await fetchCompanyUserId();

      if (!userId) {
        showAlert("로그인이 필요합니다");
        router.replace("/");
        return;
      }
      setUserId(userId);

      const supabase = createSupabaseClient();
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();
      setUserRole(profile?.role ?? null);
    }
    checkUser();
  }, [router]);

  const disabled = useMemo(() => loading, [loading]);

  const handleGallerySelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.currentTarget.value = "";
    if (files.length === 0) return;

    if (galleryImages.length + files.length > 10) {
      showAlert("추가 사진은 최대 10장까지 등록할 수 있어요.");
      return;
    }

    for (const file of files) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        showAlert(
          "지원 형식이 아니에요. JPG, PNG, WEBP 파일만 업로드할 수 있어요.",
        );
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        showAlert("사진이 너무 커요. 한 장당 5MB 이하로 올려주세요.");
        return;
      }
    }

    const nextItems = files.map((file) => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    setGalleryImages((prev) => [...prev, ...nextItems]);
  };

  const removeGalleryImage = (imageId: string) => {
    setGalleryImages((prev) => {
      const target = prev.find((item) => item.id === imageId);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((item) => item.id !== imageId);
    });
  };

  const handleGalleryDragStart = (
    event: DragEvent<HTMLDivElement>,
    imageId: string,
  ) => {
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

  const handleGalleryDrop = (
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

    const sourceIndex = galleryImages.findIndex((item) => item.id === sourceImageId);
    const targetIndex = galleryImages.findIndex((item) => item.id === targetImageId);
    if (sourceIndex < 0 || targetIndex < 0) {
      handleGalleryDragEnd();
      return;
    }

    const reordered = [...galleryImages];
    const [moved] = reordered.splice(sourceIndex, 1);
    reordered.splice(targetIndex, 0, moved);
    setGalleryImages(reordered);
    handleGalleryDragEnd();
  };

  const loadAffiliationStatuses = useCallback(async (propertyIds: number[]) => {
    if (!userId || userRole !== "agent" || propertyIds.length === 0) {
      setAffiliationStatusMap({});
      return;
    }

    const supabase = createSupabaseClient();
    const { data, error } = await supabase
      .from("property_agents")
      .select("property_id, status, requested_at")
      .eq("agent_id", userId)
      .in("property_id", propertyIds)
      .order("requested_at", { ascending: false });

    if (error) {
      console.error("소속 상태 조회 오류:", error);
      setAffiliationStatusMap({});
      return;
    }

    const latestStatusMap: Record<number, AffiliationStatus> = {};
    for (const item of data ?? []) {
      if (latestStatusMap[item.property_id] !== undefined) continue;
      latestStatusMap[item.property_id] = (item.status ?? null) as AffiliationStatus;
    }
    setAffiliationStatusMap(latestStatusMap);
  }, [userId, userRole]);

  const checkDuplicatePropertyName = useCallback(async (rawName: string) => {
    const requestId = ++duplicateCheckRequestIdRef.current;
    const isStale = () => requestId !== duplicateCheckRequestIdRef.current;
    const trimmedName = rawName.trim();
    if (!trimmedName) {
      if (!isStale()) {
        setHasExactDuplicate(false);
        setDuplicateCandidates([]);
      }
      return false;
    }

    const supabase = createSupabaseClient();
    const tokenPattern = `%${trimmedName.split(/\s+/).filter(Boolean).join("%")}%`;
    const compactName = trimmedName.replace(/\s+/g, "");
    const charPattern = `%${compactName.split("").join("%")}%`;

      const { data: tokenData, error: tokenError } = await supabase
        .from("properties")
        .select("id, name, property_type, image_url, status")
        .ilike("name", tokenPattern)
        .limit(30);

      if (tokenError) {
        console.error("현장명 중복 확인 오류(토큰):", tokenError);
        return false;
      }
      if (isStale()) return false;

      let candidates = tokenData ?? [];

      if (charPattern !== tokenPattern) {
        const { data: charData, error: charError } = await supabase
          .from("properties")
          .select("id, name, property_type, image_url, status")
          .ilike("name", charPattern)
          .limit(30);

        if (charError) {
          console.error("현장명 중복 확인 오류(문자):", charError);
          return false;
        }
        if (isStale()) return false;

        if (charData?.length) {
          const merged = new Map<number, DuplicatePropertyCandidate>();
          for (const item of candidates) merged.set(item.id, item);
          for (const item of charData) merged.set(item.id, item);
          candidates = Array.from(merged.values());
        }
      }

      const normalizedInput = normalizePropertyName(trimmedName);
      const exactMatches = candidates.filter(
        (item) => normalizePropertyName(item.name ?? "") === normalizedInput,
      );
      const isDuplicate = exactMatches.length > 0;

      const suggestionMatches = candidates
        .map((item) => ({
          ...item,
          normalizedName: normalizePropertyName(item.name ?? ""),
        }))
        .filter((item) => item.normalizedName.includes(normalizedInput))
        .sort((a, b) => {
          const aStartsWith = a.normalizedName.startsWith(normalizedInput) ? 1 : 0;
          const bStartsWith = b.normalizedName.startsWith(normalizedInput) ? 1 : 0;
          if (aStartsWith !== bStartsWith) return bStartsWith - aStartsWith;
          return a.normalizedName.length - b.normalizedName.length;
        });

      const nextCandidates = suggestionMatches.slice(0, 3).map((item) => ({
        id: item.id,
        name: item.name,
        property_type: item.property_type ?? null,
        image_url: item.image_url ?? null,
        status: item.status ?? null,
      }));

      if (isStale()) return false;
      setHasExactDuplicate(isDuplicate);
      setDuplicateCandidates(nextCandidates);
      await loadAffiliationStatuses(nextCandidates.map((item) => item.id));
      if (isStale()) return false;
    return isDuplicate;
  }, [loadAffiliationStatuses]);

  useEffect(() => {
    if (duplicateCheckTimerRef.current) {
      clearTimeout(duplicateCheckTimerRef.current);
      duplicateCheckTimerRef.current = null;
    }

    if (isNameComposing) return;

    const trimmedName = form.name.trim();
    if (!trimmedName || trimmedName.length < 2) {
      duplicateCheckRequestIdRef.current += 1;
      setHasExactDuplicate(false);
      setDuplicateCandidates([]);
      return;
    }

    duplicateCheckTimerRef.current = setTimeout(() => {
      void checkDuplicatePropertyName(trimmedName);
    }, 400);

    return () => {
      if (duplicateCheckTimerRef.current) {
        clearTimeout(duplicateCheckTimerRef.current);
        duplicateCheckTimerRef.current = null;
      }
    };
  }, [form.name, isNameComposing, checkDuplicatePropertyName]);

  const handleApplyAffiliation = async (propertyId: number) => {
    if (userRole !== "agent") {
      showAlert("상담사 계정만 소속 신청을 할 수 있습니다.");
      return;
    }

    setApplyingAffiliationPropertyId(propertyId);
    try {
      const response = await fetch("/api/property-agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ property_id: propertyId }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        showAlert(data?.error || "소속 신청에 실패했습니다.");
        return;
      }

      showAlert(data?.message || "소속 신청이 완료되었습니다.");
      const nextStatus = (data?.propertyAgent?.status ?? "approved") as AffiliationStatus;
      setAffiliationStatusMap((prev) => ({ ...prev, [propertyId]: nextStatus }));
      router.push("/agent/profile#affiliation-section");
    } catch (affiliationError) {
      console.error("소속 신청 오류:", affiliationError);
      showAlert("소속 신청 중 오류가 발생했습니다.");
    } finally {
      setApplyingAffiliationPropertyId(null);
    }
  };

  const getAffiliationButtonLabel = (propertyId: number) => {
    const status = affiliationStatusMap[propertyId] ?? null;
    if (status === "approved") return "소속됨";
    if (status === "pending") return "처리 중";
    return "소속 신청";
  };

  const isAffiliationButtonDisabled = (propertyId: number) => {
    if (userRole !== "agent") return true;
    const status = affiliationStatusMap[propertyId] ?? null;
    if (status === "approved" || status === "pending") return true;
    return applyingAffiliationPropertyId === propertyId;
  };

  async function handleSubmit() {
    if (loading || submitLockRef.current) return;
    setError(null);

    if (!validateRequiredOrShowModal(form.name, "현장명")) return;
    const isDuplicateName = await checkDuplicatePropertyName(form.name);
    if (isDuplicateName) return;

    if (!userId) {
      setError("사용자 정보를 확인할 수 없습니다. 다시 로그인해주세요.");
      return;
    }

    submitLockRef.current = true;
    setLoading(true);

    try {
      const payload = {
        name: form.name.trim(),
        property_type: form.property_type.trim() || null,
        status: form.status || null,
        description: form.description.trim() || null,
        confirmed_comment: form.confirmed_comment.trim() || null,
        estimated_comment: form.estimated_comment.trim() || null,

        created_by: userId,
      };

      const { data, error } = await createProperty(payload);

      if (error) {
        setError(toKoreanErrorMessage(error));
        return;
      }

      if (!data?.id) {
        setError(
          "등록은 되었지만 id가 돌아오지 않았습니다. 잠시 뒤 다시 시도해주세요.",
        );
        return;
      }

      const propertyId = data.id as number;

      // 상담사 계정인 경우에만: 새 현장 등록 직후 자동 소속 시도
      if (userRole === "agent") {
        try {
          const affiliationResponse = await fetch("/api/property-agents", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              property_id: propertyId,
            }),
          });
          if (!affiliationResponse.ok) {
            const affiliationData = await affiliationResponse
              .json()
              .catch(() => null);
            console.error("자동 소속 처리 실패:", affiliationData);
          }
        } catch (affiliationError) {
          console.error("자동 소속 API 호출 오류:", affiliationError);
        }
      }

      // 대표 이미지 업로드 (선택)
      if (mainImageFile) {
        const fd = new FormData();
        fd.append("file", mainImageFile);
        fd.append("propertyId", String(propertyId));
        fd.append("mode", "property_main");

        const res = await fetch("/api/r2/upload", {
          method: "POST",
          body: fd,
        });

        if (!res.ok) {
          setError("대표 이미지 업로드에 실패했습니다.");
          return;
        }

        const { url } = (await res.json()) as { url?: string };
        if (!url) {
          setError("대표 이미지 업로드 응답에 url이 없습니다.");
          return;
        }

        const { data: updateData, error: updateErr } = await updatePropertyImage(
          propertyId,
          url,
        );

        if (updateErr) {
          setError("대표 이미지 저장에 실패했습니다.");
          return;
        }
        if (!updateData) {
          setError("대표 이미지 저장 권한이 없거나 대상을 찾을 수 없습니다.");
          return;
        }
      }

      // 추가 사진 업로드 (선택)
      if (galleryImages.length > 0) {
        const fd = new FormData();
        fd.append("propertyId", String(propertyId));
        galleryImages.forEach((item) => fd.append("files", item.file));

        const res = await fetch("/api/property/gallery", {
          method: "POST",
          body: fd,
        });
        const payload = await res.json().catch(() => null);
        if (!res.ok) {
          setError(
            payload?.error || "업로드 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요.",
          );
          return;
        }
      }

      router.push(`/company/properties/${propertyId}`);
    } finally {
      submitLockRef.current = false;
      setLoading(false);
    }
  }

  // 유저 확인 중
  if (userId === null) {
    return <div className="p-6 text-(--oboon-text-muted)">불러오는 중...</div>;
  }

  return (
    <main className="bg-(--oboon-bg-page)">
      <PageContainer>
        <div className="w-full space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="ob-typo-h1 text-(--oboon-text-title)">
                새 현장 등록
              </div>
              <p className="ob-typo-body text-(--oboon-text-muted)">
                기본 정보만 입력하면 나머지 세부 정보는 단계별로 채울 수
                있습니다.
              </p>
            </div>
          </div>

          {/* Form */}
          <Card className="space-y-4 p-5">
            <div className="ob-typo-h3 font-semibold text-(--oboon-text-title)">
              기본 정보
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:items-start">
              <div className="space-y-4">
                <Field label="현장명" required>
                  <Input
                    value={form.name}
                    placeholder="예) 더샵 아르테 미사, 힐스테이트 광안"
                    onChange={(e) => {
                      const nextName = e.target.value;
                      setForm({ ...form, name: nextName });
                    }}
                    onBlur={() => {
                      void checkDuplicatePropertyName(form.name);
                    }}
                    onCompositionStart={() => setIsNameComposing(true)}
                    onCompositionEnd={() => setIsNameComposing(false)}
                    autoFocus
                    disabled={loading}
                  />
                  {duplicateCandidates.length > 0 ? (
                    <div className="mt-3 space-y-2 rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle) p-3">
                      <p className="ob-typo-subtitle text-(--oboon-text-title)">
                        {hasExactDuplicate ? "혹시 이 현장인가요?" : "이런 현장이 있어요"}
                      </p>
                      <p className="ob-typo-caption text-(--oboon-text-muted)">
                        {hasExactDuplicate
                          ? "이미 등록된 현장이면 새 등록 대신 소속 신청을 진행해주세요."
                          : "입력하신 이름과 비슷한 현장입니다. 해당 현장이 맞다면 소속 신청을 진행해주세요."}
                      </p>
                      <div className="space-y-2">
                        {duplicateCandidates.map((candidate) => (
                          <div
                            key={candidate.id}
                            className="flex items-center gap-3 rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-3"
                          >
                            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-(--oboon-bg-subtle)">
                              {candidate.image_url ? (
                                <Image
                                  src={candidate.image_url}
                                  alt={`${candidate.name ?? "현장"} 대표 이미지`}
                                  width={56}
                                  height={56}
                                  className="h-full w-full object-cover"
                                />
                              ) : null}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate ob-typo-body text-(--oboon-text-title)">
                                {candidate.name ?? "이름 없는 현장"}
                              </p>
                              <p className="truncate ob-typo-caption text-(--oboon-text-muted)">
                                {candidate.property_type || "분양 유형 미설정"}
                              </p>
                            </div>
                            <Button
                              variant="primary"
                              size="sm"
                              shape="pill"
                              disabled={isAffiliationButtonDisabled(candidate.id)}
                              loading={applyingAffiliationPropertyId === candidate.id}
                              onClick={() => handleApplyAffiliation(candidate.id)}
                            >
                              {getAffiliationButtonLabel(candidate.id)}
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </Field>

                <Field label="분양 유형">
                  <Input
                    
                    placeholder="예) 아파트 / 오피스텔 / 상업시설"
                    value={form.property_type}
                    onChange={(e) =>
                      setForm({ ...form, property_type: e.target.value })
                    }
                    disabled={loading}
                  />
                </Field>

                <Field label="상태">
                  <PropertyStatusSelect
                    value={form.status}
                    onChange={(v) => setForm({ ...form, status: v })}
                    disabled={loading}
                  />
                </Field>
              </div>

              {/* 대표 이미지 업로드 */}
              <Field label="대표 이미지" helper="">
                <div className="space-y-2">
                  {/* 실제 file input은 숨김 (브라우저 기본 '선택된 파일 없음' UI 제거) */}
                  <input
                    ref={mainImageInputRef}
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    disabled={disabled}
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null;
                      // 같은 파일 재선택 가능하도록 초기화
                      e.currentTarget.value = "";
                      if (f) {
                        if (
                          !["image/jpeg", "image/png", "image/webp"].includes(
                            f.type,
                          )
                        ) {
                          showAlert(
                            "대표 이미지는 jpg/png/webp 파일만 가능합니다.",
                          );
                          return;
                        }
                        if (f.size > 5 * 1024 * 1024) {
                          showAlert("대표 이미지는 5MB 이하만 가능합니다.");
                          return;
                        }
                      }
                      setMainImageFile(f);
                      setMainImageFileName(f ? f.name : null);
                    }}
                  />

                  {/* 트리거 + 파일명 */}
                  <div className="flex items-center gap-3">
                    <Button
                      variant="secondary"
                      size="sm"
                      shape="pill"
                      disabled={disabled}
                      onClick={() => mainImageInputRef.current?.click()}
                    >
                      파일 선택
                    </Button>

                    <p className="ob-typo-caption text-(--oboon-text-muted) truncate">
                      {mainImageFileName ? (
                        <>
                          선택된 파일:{" "}
                          <span className="text-(--oboon-text-title)">
                            {mainImageFileName}
                          </span>
                        </>
                      ) : (
                        "선택된 파일 없음"
                      )}
                    </p>
                  </div>

                  {mainImagePreview ? (
                    <div className="space-y-2">
                      {/* 이미지 카드 */}
                      <div className="overflow-hidden rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface)">
                        <Image
                          src={mainImagePreview}
                          alt="대표 이미지 미리보기"
                          width={640}
                          height={360}
                          className="h-auto w-full object-cover"
                        />
                      </div>

                      {/* 액션 영역 (카드 외부) */}
                      <div className="flex justify-between items-center">
                        <div className="ob-typo-caption text-(--oboon-text-muted)">
                          이미지를 선택하면 등록 시 자동으로 업로드됩니다.
                        </div>
                        <Button
                          variant="secondary"
                          size="sm"
                          shape="pill"
                          disabled={disabled}
                          onClick={() => {
                            setMainImageFile(null);
                            setMainImageFileName(null);
                          }}
                        >
                          선택 해제
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </Field>
            </div>

            <Field label="설명">
              <Textarea
                className={cn(TEXTAREA_BASE, "min-h-25")}
                placeholder="현장의 주요 특장점과 간단 설명"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                disabled={loading}
              />
            </Field>

            <Field
              label="추가 사진 (선택)"
              rightMeta={
                <span className="ob-typo-body text-(--oboon-text-muted)">
                  {galleryImages.length}/10
                </span>
              }
            >
              <div className="space-y-2">
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="hidden"
                  disabled={disabled || galleryImages.length >= 10}
                  onChange={handleGallerySelect}
                />
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  disabled={disabled || galleryImages.length >= 10}
                  onClick={() => galleryInputRef.current?.click()}
                >
                  이미지 업로드
                </Button>
                <p className="ob-typo-caption text-(--oboon-text-muted)">
                  JPG, PNG, WEBP · 한 장당 5MB 이하 · 최대 10장
                </p>

                {galleryImages.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-(--oboon-border-default) p-4 text-center ob-typo-caption text-(--oboon-text-muted)">
                    등록된 추가 사진이 없습니다.
                  </div>
                ) : (
                  <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 md:grid md:grid-cols-5 md:overflow-visible">
                    {galleryImages.map((image, index) => (
                      <div
                        key={image.id}
                        draggable={!disabled}
                        onDragStart={(event) =>
                          handleGalleryDragStart(event, image.id)
                        }
                        onDragOver={(event) =>
                          handleGalleryDragOver(event, image.id)
                        }
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
                          <Image
                            src={image.previewUrl}
                            alt={`추가 사진 ${index + 1}`}
                            width={320}
                            height={320}
                            className="h-full w-full object-cover"
                          />
                          <div className="pointer-events-none absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-(--oboon-overlay) ob-typo-caption font-medium text-(--oboon-on-primary)">
                            {index + 1}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="absolute right-2 top-1 h-6 w-6 min-w-0 rounded-full p-0 !bg-transparent text-(--oboon-on-primary) hover:!bg-transparent hover:text-(--oboon-on-primary)"
                            disabled={disabled}
                            onClick={() => removeGalleryImage(image.id)}
                          >
                            <X className="h-4 w-4 text-(--oboon-danger)" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Field>

            {/* Error */}
            {error && (
              <div className="rounded-xl border border-(--oboon-danger-border) bg-(--oboon-danger-bg) px-4 py-3 ob-typo-body text-(--oboon-danger)">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
              <Button
                variant="secondary"
                size="md"
                shape="pill"
                onClick={() => router.push(cancelHref)}
                disabled={disabled}
                className="w-full justify-center sm:w-auto"
              >
                취소
              </Button>

              <Button
                variant="primary"
                size="md"
                shape="pill"
                onClick={handleSubmit}
                loading={loading}
                className="w-full justify-center sm:w-auto"
              >
                등록하기
              </Button>
            </div>
          </Card>
        </div>
      </PageContainer>
    </main>
  );
}

function Field({
  label,
  required,
  helper,
  rightMeta,
  children,
}: {
  label: string;
  required?: boolean;
  helper?: string;
  rightMeta?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Label className="text-(--oboon-text-title)">{label}</Label>
          {required ? (
            <span className="ob-typo-caption text-(--oboon-primary)">*</span>
          ) : null}
        </div>
        {rightMeta ?? null}
      </div>

      {children}

      {helper ? (
        <p className="ob-typo-caption text-(--oboon-text-muted)">{helper}</p>
      ) : null}
    </div>
  );
}
