// app/company/properties/new/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
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
  image_url: string;

  confirmed_comment: string;
  estimated_comment: string;
  pending_comment: string;
};

function cn(...classes: Array<string | undefined | false | null>) {
  return classes.filter(Boolean).join(" ");
}

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
    image_url: "",
    confirmed_comment: "",
    estimated_comment: "",
    pending_comment: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const textareaClass = useMemo(
    () =>
      cn(
        "w-full rounded-xl border border-(--oboon-border-default)",
        "bg-(--oboon-bg-surface) px-4 py-3 text-sm",
        "placeholder:text-(--oboon-text-muted)",
        "focus:outline-none focus:ring-2 focus:ring-(--oboon-primary)/25"
      ),
    []
  );

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
      image_url: form.image_url.trim() || null,

      confirmed_comment: form.confirmed_comment.trim() || null,
      estimated_comment: form.estimated_comment.trim() || null,
      pending_comment: form.pending_comment.trim() || null,

      created_by: userId, // 🔥 핵심!
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
        "등록은 되었지만 id가 돌아오지 않았습니다. 잠시 뒤 다시 시도해주세요."
      );
      return;
    }

    router.push(`/company/properties/${data.id}`);
  }

  // 유저 확인 중
  if (userId === null) {
    return (
      <div className="p-6" style={{ color: "var(--oboon-text-muted)" }}>
        불러오는 중...
      </div>
    );
  }

  return (
    <main style={{ backgroundColor: "var(--oboon-bg-page)" }}>
      <PageContainer className="pt-10 pb-10">
        <div className="mx-auto w-full max-w-3xl space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1
                className="text-2xl font-bold"
                style={{ color: "var(--oboon-text-title)" }}
              >
                새 현장 등록
              </h1>
              <p
                className="text-sm"
                style={{ color: "var(--oboon-text-muted)" }}
              >
                기본 정보만 입력하면 나머지 세부 정보는 단계별로 채울 수
                있습니다.
              </p>
            </div>

            <Badge variant="status" className="text-[12px]">
              기본 정보
            </Badge>
          </div>

          <Card className="space-y-4">
            <Field
              label="현장명"
              required
              helper="예) 더샵 아르테 미사, 힐스테이트 광안"
            >
              <Input
                className="h-11"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                autoFocus
              />
            </Field>

            <Field label="분양 유형" helper="예) 아파트 / 오피스텔 / 상업시설">
              <Input
                className="h-11"
                value={form.property_type}
                onChange={(e) =>
                  setForm({ ...form, property_type: e.target.value })
                }
              />
            </Field>

            <Field label="대표 연락처" helper="예) 1661-0000">
              <Input
                className="h-11"
                value={form.phone_number}
                onChange={(e) =>
                  setForm({ ...form, phone_number: e.target.value })
                }
              />
            </Field>

            <Field label="상태">
              <PropertyStatusSelect
                value={form.status}
                onChange={(v) => setForm({ ...form, status: v })}
                disabled={loading}
              />
            </Field>

            <Field label="설명" helper="현장의 주요 특장점과 간단 설명">
              <textarea
                className={cn(textareaClass, "min-h-[100px]")}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </Field>

            <div className="pt-2">
              <div
                className="text-sm font-semibold"
                style={{ color: "var(--oboon-text-title)" }}
              >
                감정평가사 메모
              </div>

              <div className="mt-3 space-y-4">
                <Field label="확정 내용">
                  <textarea
                    className={cn(textareaClass, "min-h-[90px]")}
                    value={form.confirmed_comment}
                    onChange={(e) =>
                      setForm({ ...form, confirmed_comment: e.target.value })
                    }
                  />
                </Field>

                <Field label="추정 내용">
                  <textarea
                    className={cn(textareaClass, "min-h-[90px]")}
                    value={form.estimated_comment}
                    onChange={(e) =>
                      setForm({ ...form, estimated_comment: e.target.value })
                    }
                  />
                </Field>

                <Field label="미정 내용">
                  <textarea
                    className={cn(textareaClass, "min-h-[90px]")}
                    value={form.pending_comment}
                    onChange={(e) =>
                      setForm({ ...form, pending_comment: e.target.value })
                    }
                  />
                </Field>
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-500">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
              <Button
                variant="secondary"
                size="md"
                shape="pill"
                onClick={() => router.push("/company/properties")}
                disabled={loading}
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
        <Label>{label}</Label>
        {required && (
          <span style={{ color: "var(--oboon-primary)" }}>*</span>
        )}
      </div>
      {children}
      {helper && (
        <p className="text-xs" style={{ color: "var(--oboon-text-muted)" }}>
          {helper}
        </p>
      )}
    </div>
  );
}