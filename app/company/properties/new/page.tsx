// app/company/properties/new/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
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
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

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

    if (galleryImages.length + files.length > 5) {
      showAlert("추가 사진은 최대 5장까지 선택할 수 있습니다.");
      return;
    }

    for (const file of files) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        showAlert("추가 사진은 jpg/png/webp 파일만 가능합니다.");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        showAlert("추가 사진은 파일당 5MB 이하만 가능합니다.");
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

  async function handleSubmit() {
    if (loading || submitLockRef.current) return;
    setError(null);

    if (!validateRequiredOrShowModal(form.name, "현장명")) return;

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
        setError(error.message);
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

        const { error: updateErr } = await updatePropertyImage(propertyId, url);

        if (updateErr) {
          setError("대표 이미지 저장에 실패했습니다.");
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
          setError(payload?.error || "추가 사진 업로드에 실패했습니다.");
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
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    autoFocus
                    disabled={loading}
                  />
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
                  {galleryImages.length}/5
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
                  disabled={disabled || galleryImages.length >= 5}
                  onChange={handleGallerySelect}
                />
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  disabled={disabled || galleryImages.length >= 5}
                  onClick={() => galleryInputRef.current?.click()}
                >
                  이미지 업로드
                </Button>
                <p className="ob-typo-caption text-(--oboon-text-muted)">
                  jpg/png/webp, 파일당 5MB, 최대 5장까지 등록할 수 있습니다.
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
                          <div className="pointer-events-none absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/55 ob-typo-caption font-medium text-white">
                            {index + 1}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="absolute right-2 top-1 h-6 w-6 min-w-0 rounded-full p-0 !bg-transparent text-white hover:!bg-transparent hover:text-white"
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
                onClick={() => router.push("/company/properties")}
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
