"use client";

import { forwardRef, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CalendarDays } from "lucide-react";

import Button from "@/components/ui/Button";
import { createSupabaseClient } from "@/lib/supabaseClient";
import OboonDatePicker from "@/components/ui/DatePicker";
import PrecisionDateInput from "@/components/ui/PercisionDateInput";

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

// YYYY-MM-DD <-> Date (로컬 기준) 유틸: timezone로 하루 밀림 방지
function parseYmdToLocalDate(ymd: string | null | undefined): Date | null {
  if (!ymd) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!y || !mo || !d) return null;
  return new Date(y, mo - 1, d);
}

function formatLocalDateToYmd(date: Date | null): string | null {
  if (!date) return null;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * 이 페이지용 정사각 달력 버튼 (w=h)
 * - OboonDatePicker의 trigger 슬롯으로 주입됨
 */
const TimelineDateTrigger = forwardRef<HTMLButtonElement, any>(
  ({ onClick, className = "", disabled, ...rest }, ref) => (
    <Button
      ref={ref as any}
      type="button"
      variant="secondary"
      size="sm"
      shape="pill"
      onClick={onClick}
      disabled={disabled}
      className={[
        "p-0 h-10 w-10 inline-flex items-center justify-center shrink-0",
        className,
      ].join(" ")}
      {...rest}
    >
      <CalendarDays className="h-4 w-4" />
      <span className="sr-only">날짜 선택</span>
    </Button>
  )
);
TimelineDateTrigger.displayName = "TimelineDateTrigger";

export default function PropertyTimelinePage() {
  const supabase = createSupabaseClient();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const propertyId = Number(params?.id);

  const [form, setForm] = useState<TimelineForm>(EMPTY_FORM);
  const [baseForm, setBaseForm] = useState<TimelineForm | null>(null);

  // (유지) 다음 필드 자동 오픈용 인덱스: 현재 OboonDatePicker가 외부 open 제어를 지원하지 않으면 시각적 오픈까지는 못하지만,
  // 값 설정 후 다음 필드로 UX 확장 시 쓰기 좋습니다.
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

  const handleClear = () => {
    if (!confirm("일정 정보를 모두 삭제할까요? (되돌릴 수 없습니다)")) return;
    setForm(EMPTY_FORM);
    setEditing(true);
    setOpenIndex(null);
  };

  const handleDateChange = (
    key: keyof TimelineForm,
    date: Date | null,
    index: number
  ) => {
    const dateStr = formatLocalDateToYmd(date);

    setForm((prev) => {
      const next = { ...prev, [key]: dateStr };

      // 다음 빈 필드 인덱스 계산(필요 시 확장)
      const nextIndex = FIELDS.findIndex((f, i) => i > index && !next[f.key]);
      if (nextIndex !== -1 && dateStr) {
        setTimeout(() => setOpenIndex(nextIndex), 10);
      } else {
        setOpenIndex(null);
      }

      return next;
    });
  };

  if (loading) {
    return (
      <div className="px-4 py-8 text-sm text-(--oboon-text-muted)">
        불러오는 중..
      </div>
    );
  }

  // ✅ 입력 스타일: 버튼이 줄어든 만큼 input이 길어지도록 flex 관련 클래스 포함
  const inputClassName = [
    "input-basic rounded-md border border-(--oboon-border-default)",
    "bg-(--oboon-bg-subtle)/70 px-3 py-2 transition",
    "focus:border-(--oboon-accent) focus:outline-none focus:ring-2 focus:ring-(--oboon-accent)/50",
    // 핵심: flex 레이아웃에서 input이 남는 폭을 다 먹도록
    "w-full flex-1 min-w-0",
  ].join(" ");

  return (
    <div className="bg-(--oboon-bg-page) px-4 py-8 md:px-6 md:py-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1 pt-1">
            <p className="text-2xl font-bold text-(--oboon-text-title)">
              분양 일정
            </p>
            <p className="text-sm text-(--oboon-text-muted)">
              청약·계약·입주 주요 일정을 입력하거나 달력에서 바로 선택하세요.
            </p>
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
            {FIELDS.map((field, index) => {
              const isMoveIn = field.key === "move_in_date";

              return (
                <div key={field.key} className="space-y-2">
                  <label className="text-sm font-medium text-(--oboon-text-title)">
                    {field.label}
                  </label>

                  <div className="flex w-full items-center gap-2">
                    <div className="flex-1 min-w-0">
                      {isMoveIn ? (
                        <PrecisionDateInput
                          value={form.move_in_date}
                          onChange={(next) =>
                            setForm((prev) => ({ ...prev, move_in_date: next }))
                          }
                          disabled={!editing}
                          policy="both" // ✅ YYYY-MM / YYYY-MM-DD 모두 허용
                          defaultPrecision="day" // ✅ 기본은 일(원하면 "month"로)
                          inputClassName={inputClassName}
                          placeholder="예) 2026-03 또는 2026-03-01"
                        />
                      ) : (
                        <OboonDatePicker
                          selected={parseYmdToLocalDate(form[field.key])}
                          onChange={(date: Date | null) =>
                            handleDateChange(field.key, date, index)
                          }
                          disabled={!editing}
                          dateFormat="yyyy-MM-dd"
                          textFormat="yyyy-MM-dd"
                          inputClassName={inputClassName}
                          placeholder={field.placeholder}
                        />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-(--oboon-text-muted)">
              대부분의 일정은 YYYY-MM-DD 형식으로 입력합니다. 단, 입주 예정일은
              YYYY-MM 또는 YYYY-MM-DD 둘 다 입력 가능합니다.
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
    </div>
  );
}
