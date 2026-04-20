"use client";

import { forwardRef, useEffect, useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";

import Button, { type ButtonProps } from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Loader from "@/components/ui/Loader";
import OboonDatePicker from "@/components/ui/DatePicker";
import { fetchPropertyTimeline, savePropertyTimeline } from "@/features/company/services/property.timeline";
import { showAlert } from "@/shared/alert";
import { toKoreanErrorMessage } from "@/shared/errorMessage";

type TimelineForm = {
  announcement_date: string | null;
  application_start: string | null;
  application_end: string | null;
  winner_announce: string | null;
  contract_start: string | null;
  contract_end: string | null;
  move_in_text: string | null;
};

const EMPTY_FORM: TimelineForm = {
  announcement_date: null,
  application_start: null,
  application_end: null,
  winner_announce: null,
  contract_start: null,
  contract_end: null,
  move_in_text: null,
};

const FIELDS: {
  key: keyof TimelineForm;
  label: string;
  placeholder?: string;
}[] = [
  { key: "announcement_date", label: "분양/청약 모집공고", placeholder: "예) 2025-07-01" },
  { key: "application_start", label: "청약 접수 시작", placeholder: "예) 2025-07-12" },
  { key: "application_end", label: "청약 접수 종료", placeholder: "예) 2025-07-14" },
  { key: "winner_announce", label: "당첨자 발표", placeholder: "예) 2025-07-21" },
  { key: "contract_start", label: "계약 시작", placeholder: "예) 2025-07-25" },
  { key: "contract_end", label: "계약 종료", placeholder: "예) 2025-07-28" },
];

function parseYmdToLocalDate(ymd: string | null | undefined): Date | null {
  if (!ymd) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function formatLocalDateToYmd(date: Date | null): string | null {
  if (!date) return null;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const TimelineDateTrigger = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ onClick, className = "", disabled, ...rest }, ref) => (
    <Button
      ref={ref}
      type="button"
      variant="secondary"
      size="sm"
      shape="pill"
      onClick={onClick}
      disabled={disabled}
      className={["p-0 h-10 w-10 inline-flex items-center justify-center shrink-0", className].join(" ")}
      {...rest}
    >
      <CalendarDays className="h-4 w-4" />
      <span className="sr-only">날짜 선택</span>
    </Button>
  ),
);
TimelineDateTrigger.displayName = "TimelineDateTrigger";

export default function TimelineEditorCard({
  propertyId,
  onAfterSave,
}: {
  propertyId: number;
  onAfterSave?: () => void;
}) {
  const [form, setForm] = useState<TimelineForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [timelineId, setTimelineId] = useState<number | null>(null);

  const INPUT_LIKE = useMemo(
    () =>
      [
        "w-full",
        "rounded-xl",
        "border border-(--oboon-border-default)",
        "bg-(--oboon-bg-surface)",
        "px-4 py-3",
        "ob-typo-body text-(--oboon-text-title)",
        "placeholder:text-(--oboon-text-muted)",
        "transition",
        "focus:outline-none focus:ring-2 focus:ring-(--oboon-accent)/40 focus:border-(--oboon-accent)",
      ].join(" "),
    [],
  );

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      const { data, error } = await fetchPropertyTimeline(propertyId);
      if (!alive) return;
      if (!error && data) {
        setTimelineId(data.id);
        setForm({
          announcement_date: data.announcement_date,
          application_start: data.application_start,
          application_end: data.application_end,
          winner_announce: data.winner_announce,
          contract_start: data.contract_start,
          contract_end: data.contract_end,
          move_in_text: data.move_in_text ?? data.move_in_date,
        });
      } else {
        setTimelineId(null);
        setForm(EMPTY_FORM);
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
    const payload = {
      ...form,
      move_in_text: form.move_in_text?.trim() || null,
      move_in_date: null,
    };

    const { data, error } = await savePropertyTimeline(propertyId, payload, timelineId);
    setSaving(false);
    if (error) {
      showAlert(toKoreanErrorMessage(error, "저장에 실패했습니다."));
      return;
    }
    if (!data) {
      showAlert("저장 권한이 없거나 수정할 분양 일정을 찾을 수 없습니다.");
      return;
    }
    showAlert("저장되었습니다.");
    onAfterSave?.();
  }

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex justify-center py-12">
          <Loader size="medium" type="primary" />
        </div>
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
      <Card className="p-6">
        <h2 className="ob-typo-h3 text-(--oboon-text-title)">일정 입력</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          {FIELDS.map((field) => {
            return (
              <div key={field.key}>
                <label className="mb-2 block ob-typo-subtitle text-(--oboon-text-title)">{field.label}</label>
                <OboonDatePicker
                  selected={parseYmdToLocalDate(form[field.key])}
                  onChange={(date: Date | null) => {
                    const dateStr = formatLocalDateToYmd(date);
                    setForm((prev) => ({ ...prev, [field.key]: dateStr }));
                  }}
                  dateFormat="yyyy-MM-dd"
                  textFormat="yyyy-MM-dd"
                  inputClassName={INPUT_LIKE}
                  placeholder={field.placeholder}
                  customTrigger={(props) => <TimelineDateTrigger {...props} />}
                />
              </div>
            );
          })}
          <div className="md:col-span-2">
            <label className="mb-2 block ob-typo-subtitle text-(--oboon-text-title)">입주 예정</label>
            <Input
              className={INPUT_LIKE}
              value={form.move_in_text ?? ""}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, move_in_text: e.target.value }))
              }
              placeholder="예) '2026년 3월 1일' 또는 '2026년 3월 입주 예정'"
            />
          </div>
        </div>
      </Card>
    </div>
  );
}
