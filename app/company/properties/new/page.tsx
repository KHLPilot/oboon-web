// app/company/properties/new/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Label from "@/components/ui/Label";
import PageContainer from "@/components/shared/PageContainer";

import { createSupabaseClient } from "@/lib/supabaseClient";

import PropertyStatusSelect from "@/app/company/properties/PropertyStatusSelect";
import {
  PROPERTY_STATUS_OPTIONS,
  type PropertyStatus,
} from "@/app/company/properties/propertyStatus";

type PropertyForm = {
  name: string;
  property_type: string;
  phone_number: string;
  status: PropertyStatus;
  description: string;
  confirmed_comment: string;
  estimated_comment: string;
  pending_comment: string;
};

function cn(...classes: Array<string | undefined | false | null>) {
  return classes.filter(Boolean).join(" ");
}

// textarea: 디자인시스템/토큰 기반으로 통일
const TEXTAREA_BASE = cn(
  "w-full rounded-xl border border-(--oboon-border-default)",
  "bg-(--oboon-bg-surface) px-4 py-3",
  "text-sm text-(--oboon-text-title) placeholder:text-(--oboon-text-muted)",
  "focus:outline-none focus:ring-2 focus:ring-(--oboon-primary)/25",
);

export default function PropertyCreatePage() {
  const supabase = createSupabaseClient();
  const router = useRouter();
  const defaultStatus = PROPERTY_STATUS_OPTIONS[0]?.value;

  const [form, setForm] = useState<PropertyForm>({
    name: "",
    property_type: "",
    phone_number: "",
    status: defaultStatus ?? PROPERTY_STATUS_OPTIONS[0].value,
    description: "",
    confirmed_comment: "",
    estimated_comment: "",
    pending_comment: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // 대표 이미지 파일 + 미리보기
  const [mainImageFile, setMainImageFile] = useState<File | null>(null);
  const [mainImagePreview, setMainImagePreview] = useState<string | null>(null);
  const [mainImageFileName, setMainImageFileName] = useState<string | null>(
    null,
  );
  const mainImageInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!mainImageFile) {
      setMainImagePreview(null);
      return;
    }
    const url = URL.createObjectURL(mainImageFile);
    setMainImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [mainImageFile]);

  // 로그인 유저 확인
  useEffect(() => {
    async function checkUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert("로그인이 필요합니다.");
        router.replace("/");
        return;
      }
      setUserId(user.id);
    }
    checkUser();
  }, [supabase, router]);

  const disabled = useMemo(() => loading, [loading]);

  async function handleSubmit() {
    if (loading) return;
    setError(null);

    if (!form.name.trim()) {
      setError("현장명은 필수 입력 항목입니다.");
      return;
    }

    if (!userId) {
      setError("사용자 정보를 확인할 수 없습니다. 다시 로그인해주세요.");
      return;
    }

    setLoading(true);

    const payload = {
      name: form.name.trim(),
      property_type: form.property_type.trim() || null,
      phone_number: form.phone_number.trim() || null,
      status: form.status || null,
      description: form.description.trim() || null,
      confirmed_comment: form.confirmed_comment.trim() || null,
      estimated_comment: form.estimated_comment.trim() || null,
      pending_comment: form.pending_comment.trim() || null,

      created_by: userId,
    };

    const { data, error } = await supabase
      .from("properties")
      .insert(payload)
      .select("id")
      .single();

    setLoading(false);

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
        throw new Error("대표 이미지 업로드에 실패했습니다.");
      }

      const { url } = (await res.json()) as { url?: string };
      if (!url) {
        throw new Error("대표 이미지 업로드 응답에 url이 없습니다.");
      }

      const { error: updateErr } = await supabase
        .from("properties")
        .update({ image_url: url })
        .eq("id", propertyId);

      if (updateErr) {
        throw new Error("대표 이미지 저장에 실패했습니다.");
      }
    }

    router.push(`/company/properties/${propertyId}`);
  }

  // 유저 확인 중
  if (userId === null) {
    return <div className="p-6 text-(--oboon-text-muted)">불러오는 중...</div>;
  }

  return (
    <main className="bg-(--oboon-bg-page)">
      <PageContainer>
        <div className="mx-auto w-full max-w-3xl space-y-6">
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

            <Badge variant="status">기본 정보</Badge>
          </div>

          {/* Form */}
          <Card className="space-y-4 p-5">
            <div className="ob-typo-h3 font-semibold text-(--oboon-text-title)">
              기본 정보
            </div>
            <Field label="현장명" required>
              <Input
                className="h-11"
                value={form.name}
                placeholder="예) 더샵 아르테 미사, 힐스테이트 광안"
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                autoFocus
                disabled={loading}
              />
            </Field>

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
                      <img
                        src={mainImagePreview}
                        alt="대표 이미지 미리보기"
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

            <Field label="분양 유형">
              <Input
                className="h-11"
                placeholder="예) 아파트 / 오피스텔 / 상업시설"
                value={form.property_type}
                onChange={(e) =>
                  setForm({ ...form, property_type: e.target.value })
                }
                disabled={loading}
              />
            </Field>

            <Field label="대표 연락처">
              <Input
                className="h-11"
                placeholder="예) 1661-0000"
                value={form.phone_number}
                onChange={(e) =>
                  setForm({ ...form, phone_number: e.target.value })
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

            <Field label="설명">
              <textarea
                className={cn(TEXTAREA_BASE, "min-h-25")}
                placeholder="현장의 주요 특장점과 간단 설명"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                disabled={loading}
              />
            </Field>

            {/* Error */}
            {error && (
              <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-500">
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
  children,
}: {
  label: string;
  required?: boolean;
  helper?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label className="text-(--oboon-text-title)">{label}</Label>
        {required ? (
          <span className="ob-typo-caption text-(--oboon-primary)">*</span>
        ) : null}
      </div>

      {children}

      {helper ? (
        <p className="ob-typo-caption text-(--oboon-text-muted)">{helper}</p>
      ) : null}
    </div>
  );
}
