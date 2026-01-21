// app/company/properties/[id]/comment/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Label from "@/components/ui/Label";
import FieldErrorBubble from "@/components/ui/FieldErrorBubble";
import PageContainer from "@/components/shared/PageContainer";
import { createSupabaseClient } from "@/lib/supabaseClient";

type commentForm = {
  confirmed_comment: string;
  estimated_comment: string;
  pending_comment: string;
};

const EMPTY_FORM: commentForm = {
  confirmed_comment: "",
  estimated_comment: "",
  pending_comment: "",
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

export default function PropertycommentPage() {
  const supabase = createSupabaseClient();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const propertyId = Number(params?.id);

  const [form, setForm] = useState<commentForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    async function load() {
      if (!Number.isFinite(propertyId)) return;

      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("properties")
        .select("confirmed_comment, estimated_comment, pending_comment")
        .eq("id", propertyId)
        .maybeSingle();

      if (!alive) return;

      if (error) {
        setError(error.message);
        setForm(EMPTY_FORM);
      } else {
        setForm({
          confirmed_comment: data?.confirmed_comment ?? "",
          estimated_comment: data?.estimated_comment ?? "",
          pending_comment: data?.pending_comment ?? "",
        });
      }

      setLoading(false);
    }

    load();
    return () => {
      alive = false;
    };
  }, [propertyId, supabase]);

  async function handleSave() {
    if (!Number.isFinite(propertyId)) return;

    setSaving(true);
    setError(null);

    const payload = {
      confirmed_comment: form.confirmed_comment.trim() || null,
      estimated_comment: form.estimated_comment.trim() || null,
      pending_comment: form.pending_comment.trim() || null,
    };

    const { error } = await supabase
      .from("properties")
      .update(payload)
      .eq("id", propertyId);

    setSaving(false);

    if (error) {
      setError(error.message);
      return;
    }

    router.push(`/company/properties/${propertyId}`);
  }

  if (loading) {
    return (
      <div className="px-4 py-8 ob-typo-body text-(--oboon-text-muted)">
        불러오는 중...
      </div>
    );
  }

  return (
    <main className="bg-(--oboon-bg-page)">
      <PageContainer>
        <div className="flex w-full flex-col gap-6">
          <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <div className="ob-typo-h1 text-(--oboon-text-title)">
                감정평가사 메모
              </div>
              <p className="ob-typo-body text-(--oboon-text-muted)">
                확정/추정/미정 메모를 분리해 입력합니다.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                shape="pill"
                onClick={() => router.push(`/company/properties/${propertyId}`)}
              >
                취소
              </Button>
              <Button
                variant="primary"
                size="sm"
                shape="pill"
                onClick={handleSave}
                loading={saving}
              >
                저장
              </Button>
            </div>
          </header>

          <Card className="space-y-5 p-5">
            <section>
              <div className="ob-typo-h3 mb-1">확정 내용</div>
              <p className="ob-typo-body text-(--oboon-text-muted) mb-3">
                검증된 정보(공식 문서/공고/확정 일정 등)를 기록합니다.
              </p>
              <textarea
                className={cn(TEXTAREA_BASE, "min-h-[120px]")}
                placeholder="확정된 사실 기반으로 작성하세요."
                value={form.confirmed_comment}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    confirmed_comment: e.target.value,
                  }))
                }
              />
            </section>

            <section>
              <div className="ob-typo-h3 mb-1">추정 내용</div>
              <p className="ob-typo-body text-(--oboon-text-muted) mb-3">
                추정은 근거를 같이 남기면 좋습니다.
              </p>
              <textarea
                className={cn(TEXTAREA_BASE, "min-h-[120px]")}
                placeholder="합리적 추정/정황 기반 내용을 작성하세요."
                value={form.estimated_comment}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    estimated_comment: e.target.value,
                  }))
                }
              />
            </section>

            <section>
              <div className="ob-typo-h3 mb-1">미정 내용</div>
              <p className="ob-typo-body text-(--oboon-text-muted) mb-3">
                확인 필요/추적 중인 항목을 리스트업합니다.
              </p>
              <textarea
                className={cn(TEXTAREA_BASE, "min-h-[120px]")}
                placeholder="아직 확인이 필요한 항목을 기록하세요."
                value={form.pending_comment}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    pending_comment: e.target.value,
                  }))
                }
              />
            </section>

            {error ? (
              <div className="mt-2 rounded-xl border border-(--oboon-danger-border) bg-(--oboon-bg-surface) px-4 py-3">
                <div className="ob-typo-body text-(--oboon-text-title)">
                  저장 실패
                </div>
                <div className="mt-1 ob-typo-caption text-(--oboon-text-muted)">
                  {error}
                </div>
              </div>
            ) : null}
          </Card>
        </div>
      </PageContainer>
    </main>
  );
}
