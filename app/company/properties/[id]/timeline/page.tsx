// /app/company/properties/%5Bid%5D/timeline/page.tsx

"use client";

import { forwardRef, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { createSupabaseClient } from "@/lib/supabaseClient";
import DatePicker, { registerLocale } from "react-datepicker";
import { ko } from "date-fns/locale";
import "react-datepicker/dist/react-datepicker.css";
import { CalendarDays } from "lucide-react";

registerLocale("ko", ko);

type TimelineForm = {
  announcement_date: string | null;
  application_start: string | null;
  application_end: string | null;
  winner_announce: string | null;
  contract_start: string | null;
  contract_end: string | null;
  move_in_date: string | null;
};

const EMPTY_FORM: TimelineForm = {
  announcement_date: null,
  application_start: null,
  application_end: null,
  winner_announce: null,
  contract_start: null,
  contract_end: null,
  move_in_date: null,
};

const FIELDS: {
  key: keyof TimelineForm;
  label: string;
  placeholder?: string;
}[] = [
  {
    key: "announcement_date",
    label: "분양/청약 모집공고",
    placeholder: "예) 2025-07-01",
  },
  {
    key: "application_start",
    label: "청약 접수 시작",
    placeholder: "예) 2025-07-12",
  },
  {
    key: "application_end",
    label: "청약 접수 종료",
    placeholder: "예) 2025-07-14",
  },
  {
    key: "winner_announce",
    label: "당첨자 발표",
    placeholder: "예) 2025-07-21",
  },
  { key: "contract_start", label: "계약 시작", placeholder: "예) 2025-07-25" },
  { key: "contract_end", label: "계약 종료", placeholder: "예) 2025-07-28" },
  { key: "move_in_date", label: "입주 예정일", placeholder: "예) 2026-03-01" },
];

const CalendarButton = forwardRef<HTMLButtonElement, any>(
  ({ value, onClick, disabled }, ref) => (
    <Button
      ref={ref as any}
      type="button"
      variant="secondary"
      size="sm"
      shape="pill"
      className="whitespace-nowrap px-3"
      onClick={onClick}
      disabled={disabled}
    >
      <CalendarDays className="h-4 w-4" />
      <span className="sr-only">달력 열기</span>
    </Button>
  )
);
CalendarButton.displayName = "CalendarButton";

export default function PropertyTimelinePage() {
  const supabase = createSupabaseClient();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const propertyId = Number(params?.id);

  const [form, setForm] = useState<TimelineForm>(EMPTY_FORM);
  const [baseForm, setBaseForm] = useState<TimelineForm | null>(null);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    let alive = true;
    async function load() {
      if (!Number.isFinite(propertyId)) return;
      setLoading(true);
      const { data, error } = await supabase
        .from("property_timeline")
        .select("*")
        .eq("properties_id", propertyId)
        .maybeSingle();

      if (!alive) return;

      if (!error && data) {
        const next: TimelineForm = {
          announcement_date: data.announcement_date,
          application_start: data.application_start,
          application_end: data.application_end,
          winner_announce: data.winner_announce,
          contract_start: data.contract_start,
          contract_end: data.contract_end,
          move_in_date: data.move_in_date,
        };
        setForm(next);
        setBaseForm(next);
      } else {
        setForm(EMPTY_FORM);
        setBaseForm(EMPTY_FORM);
      }

      setLoading(false);
    }

    load();
    return () => {
      alive = false;
    };
  }, [propertyId, supabase]);

  const handleInputChange = (key: keyof TimelineForm, value: string) => {
    const formatted = formatDateInput(value);
    setForm((prev) => ({ ...prev, [key]: formatted || null }));
  };

  const handleDateChange = (
    key: keyof TimelineForm,
    date: Date | null,
    index: number
  ) => {
    let dateStr: string | null = null;
    if (date) {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      dateStr = `${y}-${m}-${d}`;
    }

    setForm((prev) => {
      const next = { ...prev, [key]: dateStr };
      const nextIndex = FIELDS.findIndex((f, i) => i > index && !next[f.key]);
      if (nextIndex !== -1 && dateStr) {
        setTimeout(() => setOpenIndex(nextIndex), 10);
      } else {
        setOpenIndex(null);
      }
      return next;
    });
  };

  const safeDate = (value: string | null | undefined) => {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  };

  const formatDateInput = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 8);
    if (digits.length <= 4) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
    return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
  };

  const hasDirty = useMemo(() => {
    if (!baseForm) return false;
    return FIELDS.some(({ key }) => form[key] !== baseForm[key]);
  }, [baseForm, form]);

  async function handleSave() {
    setSaving(true);
    const { error } = await supabase
      .from("property_timeline")
      .upsert(
        { properties_id: propertyId, ...form },
        { onConflict: "properties_id" }
      );

    setSaving(false);
    if (!error) {
      setBaseForm(form);
      setEditing(false);
      setOpenIndex(null);
    } else {
      alert(`저장 실패: ${error.message}`);
    }
  }

  const handleCancel = () => {
    if (baseForm) setForm(baseForm);
    setEditing(false);
    setOpenIndex(null);
  };

  const handleClear = () => {
    if (!confirm("일정 정보를 모두 삭제할까요? (되돌릴 수 없습니다)")) return;
    setForm(EMPTY_FORM);
    setEditing(true);
    setOpenIndex(null);
  };

  if (loading) {
    return (
      <div className="px-4 py-8 text-sm text-(--oboon-text-muted)">
        불러오는 중..
      </div>
    );
  }

  return (
    <div className="bg-(--oboon-bg-page) px-4 py-8 md:px-6 md:py-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-2">
            <div className="space-y-1 pt-1">
              <p className="text-2xl font-bold text-(--oboon-text-title)">
                분양 일정
              </p>
              <p className="text-sm text-(--oboon-text-muted)">
                청약·계약·입주 주요 일정을 입력하거나 달력에서 바로 선택하세요.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              shape="pill"
              className="text-red-500"
              onClick={() => router.push(`/company/properties/${propertyId}`)}
            >
              취소
            </Button>
          </div>
        </header>

        <section className="space-y-3 rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) px-6 py-5 shadow-(--oboon-shadow-card)/30">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-(--oboon-text-title)">
              일정 입력
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {FIELDS.map((field, index) => (
              <div key={field.key} className="space-y-2">
                <label className="text-sm font-medium text-(--oboon-text-title)">
                  {field.label}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="input-basic flex-1 rounded-md border border-(--oboon-border-default) bg-(--oboon-bg-subtle)/70 px-3 py-2 transition focus:border-(--oboon-accent) focus:outline-none focus:ring-2 focus:ring-(--oboon-accent)/50"
                    value={form[field.key] ?? ""}
                    onChange={(e) =>
                      handleInputChange(field.key, e.target.value)
                    }
                    placeholder={field.placeholder}
                    disabled={!editing}
                  />
                  <DatePicker
                    locale="ko"
                    selected={safeDate(form[field.key])}
                    open={editing && openIndex === index}
                    onClickOutside={() => setOpenIndex(null)}
                    dateFormat="yyyy-MM-dd"
                    customInput={<CalendarButton disabled={!editing} />}
                    showMonthDropdown
                    showYearDropdown
                    dropdownMode="select"
                    calendarClassName="oboon-datepicker"
                    popperClassName="oboon-datepicker-popper"
                    onChange={(date: Date | null) =>
                      handleDateChange(field.key, date, index)
                    }
                    onInputClick={() => editing && setOpenIndex(index)}
                    popperPlacement="bottom-start"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-(--oboon-text-muted)">
              YYYY-MM-DD 형식으로 직접 입력하거나 달력 버튼을 눌러 선택할 수
              있습니다.
            </p>
            <div className="flex gap-2">
              {!editing ? (
                <Button
                  variant="secondary"
                  size="sm"
                  shape="pill"
                  onClick={() => setEditing(true)}
                >
                  편집
                </Button>
              ) : (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    shape="pill"
                    onClick={handleClear}
                    disabled={saving}
                  >
                    초기화
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    shape="pill"
                    onClick={handleSave}
                    loading={saving}
                    disabled={!hasDirty}
                  >
                    저장
                  </Button>
                </>
              )}
            </div>
          </div>
        </section>
      </div>

      <style jsx global>{`
        .react-datepicker-wrapper {
          width: auto !important;
        }
        .react-datepicker__input-container {
          width: auto !important;
        }
        .oboon-datepicker {
          background: var(--oboon-bg-surface);
          border: 1px solid var(--oboon-border-default);
          box-shadow: var(--card-shadow, 0 12px 24px rgba(15, 23, 42, 0.12));
          border-radius: 16px;
          color: var(--oboon-text-body);
          padding: 8px;
        }
        .oboon-datepicker .react-datepicker__header {
          background: var(--oboon-bg-surface);
          border-bottom: 1px solid var(--oboon-border-default);
        }
        .oboon-datepicker .react-datepicker__current-month,
        .oboon-datepicker .react-datepicker-year-header {
          color: var(--oboon-text-title);
          font-weight: 600;
        }
        .oboon-datepicker .react-datepicker__day-name,
        .oboon-datepicker .react-datepicker__day,
        .oboon-datepicker .react-datepicker__time-name {
          color: var(--oboon-text-body);
        }
        .oboon-datepicker .react-datepicker__day:hover {
          background: var(--oboon-bg-subtle);
          border-radius: 8px;
        }
        .oboon-datepicker .react-datepicker__day--selected,
        .oboon-datepicker .react-datepicker__day--keyboard-selected {
          background: var(--oboon-primary);
          color: #fff;
          border-radius: 8px;
        }
        .oboon-datepicker .react-datepicker__day--today {
          border: 1px solid var(--oboon-primary);
          border-radius: 8px;
        }
        .oboon-datepicker .react-datepicker__triangle {
          display: none;
        }
        .oboon-datepicker-popper {
          z-index: 50;
        }
      `}</style>
    </div>
  );
}
