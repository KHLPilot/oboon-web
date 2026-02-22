"use client";

import { useEffect, useState } from "react";

import Card from "@/components/ui/Card";
import Textarea from "@/components/ui/Textarea";
import Button from "@/components/ui/Button";
import { fetchPropertyComments, updatePropertyComments } from "@/features/company/services/property.comment";
import { toKoreanErrorMessage } from "@/shared/errorMessage";
import { showAlert } from "@/shared/alert";

type CommentForm = {
  confirmed_comment: string;
  estimated_comment: string;
};

const EMPTY_FORM: CommentForm = {
  confirmed_comment: "",
  estimated_comment: "",
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

export default function CommentEditorCard({
  propertyId,
  onAfterSave,
}: {
  propertyId: number;
  onAfterSave?: () => void;
}) {
  const [form, setForm] = useState<CommentForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      setError(null);
      const { data, error } = await fetchPropertyComments(propertyId);
      if (!alive) return;
      if (error) {
        setError(toKoreanErrorMessage(error));
        setForm(EMPTY_FORM);
      } else {
        setForm({
          confirmed_comment: data?.confirmed_comment ?? "",
          estimated_comment: data?.estimated_comment ?? "",
        });
      }
      setLoading(false);
    }
    void load();
    return () => {
      alive = false;
    };
  }, [propertyId]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    const payload = {
      confirmed_comment: form.confirmed_comment.trim() || null,
      estimated_comment: form.estimated_comment.trim() || null,
    };
    const { data, error } = await updatePropertyComments(propertyId, payload);
    setSaving(false);
    if (error) {
      setError(toKoreanErrorMessage(error));
      return;
    }
    if (!data) {
      setError("저장 권한이 없거나 수정할 현장을 찾을 수 없습니다.");
      return;
    }
    showAlert("저장되었습니다.");
    onAfterSave?.();
  }

  if (loading) {
    return (
      <Card className="p-5">
        <div className="ob-typo-body text-(--oboon-text-muted)">불러오는 중...</div>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button variant="primary" size="sm" shape="pill" onClick={handleSave} loading={saving}>
          저장
        </Button>
      </div>

      <Card className="space-y-5 p-5">
        <section>
          <div className="ob-typo-h3 mb-1">확정 내용</div>
          <p className="ob-typo-body text-(--oboon-text-muted) mb-3">
            검증된 정보(공식 문서/공고/확정 일정 등)를 기록합니다.
          </p>
          <Textarea
            className={cn(TEXTAREA_BASE, "min-h-[120px]")}
            placeholder="확정된 사실 기반으로 작성하세요."
            value={form.confirmed_comment}
            onChange={(e) => setForm((prev) => ({ ...prev, confirmed_comment: e.target.value }))}
          />
        </section>

        <section>
          <div className="ob-typo-h3 mb-1">추정 내용</div>
          <p className="ob-typo-body text-(--oboon-text-muted) mb-3">
            추정은 근거를 같이 남기면 좋습니다.
          </p>
          <Textarea
            className={cn(TEXTAREA_BASE, "min-h-[120px]")}
            placeholder="합리적 추정/정황 기반 내용을 작성하세요."
            value={form.estimated_comment}
            onChange={(e) => setForm((prev) => ({ ...prev, estimated_comment: e.target.value }))}
          />
        </section>

        {error ? (
          <div className="mt-2 rounded-xl border border-(--oboon-danger-border) bg-(--oboon-bg-surface) px-4 py-3">
            <div className="ob-typo-body text-(--oboon-text-title)">저장 실패</div>
            <div className="mt-1 ob-typo-caption text-(--oboon-text-muted)">{error}</div>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
