// app/company/properties/[id]/timeline/page.tsx
"use client";

import { forwardRef, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CalendarDays } from "lucide-react";

import Button, { type ButtonProps } from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import PageContainer from "@/components/shared/PageContainer";

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
  policy: "day" | "month" | "both";
}[] = [
  {
    key: "announcement_date",
    label: "분양/청약 모집공고",
    placeholder: "예) 2025-07-01",
    policy: "day",
  },
  {
    key: "application_start",
    label: "청약 접수 시작",
    placeholder: "예) 2025-07-12",
    policy: "day",
  },
  {
    key: "application_end",
    label: "청약 접수 종료",
    placeholder: "예) 2025-07-14",
    policy: "day",
  },
  {
    key: "winner_announce",
    label: "당첨자 발표",
    placeholder: "예) 2025-07-21",
    policy: "day",
  },
  {
    key: "contract_start",
    label: "계약 시작",
    placeholder: "예) 2025-07-25",
    policy: "day",
  },
  {
    key: "contract_end",
    label: "계약 종료",
    placeholder: "예) 2025-07-28",
    policy: "day",
  },
  {
    key: "move_in_date",
    label: "입주 예정일",
    placeholder: "예) 2026-03 또는 2026-03-01",
    policy: "both",
  },
];

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
      className={[
        "p-0 h-10 w-10 inline-flex items-center justify-center shrink-0",
        className,
      ].join(" ")}
      {...rest}
    >
      <CalendarDays className="h-4 w-4" />
      <span className="sr-only">날짜 선택</span>
    </Button>
  ),
);
TimelineDateTrigger.displayName = "TimelineDateTrigger";

export default function PropertyTimelinePage() {
  const supabase = createSupabaseClient();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const propertyId = Number(params?.id);

  const [form, setForm] = useState<TimelineForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [moveInPrecision, setMoveInPrecision] = useState<"day" | "month">(
    "day",
  );
  const [timelineId, setTimelineId] = useState<number | null>(null);

  // Input.tsx 룩에 맞춘 토큰 기반 입력 스타일 (DatePicker/PrecisionDateInput 용)
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
      if (!Number.isFinite(propertyId)) return;

      setLoading(true);

      const { data, error } = await supabase
        .from("property_timeline")
        .select("*")
        .eq("properties_id", propertyId)
        .maybeSingle();

      if (!alive) return;

      if (!error && data) {
        setTimelineId(data.id);

        let moveInDate = data.move_in_date;
        let precision: "day" | "month" = "day";

        if (moveInDate && typeof moveInDate === "string") {
          if (moveInDate.endsWith("-01")) {
            precision = "month";
            moveInDate = moveInDate.substring(0, 7);
          } else {
            precision = "day";
          }
        }

        setMoveInPrecision(precision);
        setForm({
          announcement_date: data.announcement_date,
          application_start: data.application_start,
          application_end: data.application_end,
          winner_announce: data.winner_announce,
          contract_start: data.contract_start,
          contract_end: data.contract_end,
          move_in_date: moveInDate,
        });
      } else {
        setTimelineId(null);
        setForm(EMPTY_FORM);
      }

      setLoading(false);
    }

    load();
    return () => {
      alive = false;
    };
  }, [propertyId, supabase]);

  const handlePrecisionChange = (newPrecision: "day" | "month") => {
    setMoveInPrecision(newPrecision);

    if (newPrecision === "month" && form.move_in_date) {
      const currentValue = form.move_in_date;
      if (/^\d{4}-\d{2}-\d{2}$/.test(currentValue)) {
        const yearMonth = currentValue.substring(0, 7);
        setForm((prev) => ({ ...prev, move_in_date: yearMonth }));
      }
    }
  };

  async function handleSave() {
    setSaving(true);

    const payload = {
      ...form,
      move_in_date: form.move_in_date
        ? moveInPrecision === "month"
          ? `${form.move_in_date}-01`
          : form.move_in_date
        : null,
    };

    let error;
    if (timelineId) {
      const { error: updateError } = await supabase
        .from("property_timeline")
        .update(payload)
        .eq("id", timelineId);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from("property_timeline")
        .insert({ properties_id: propertyId, ...payload });
      error = insertError;
    }

    setSaving(false);

    if (!error) {
      router.push(`/company/properties/${propertyId}`);
    } else {
      alert(`저장 실패: ${error.message}`);
    }
  }

  const handleDateChange = (key: keyof TimelineForm, date: Date | null) => {
    const dateStr = formatLocalDateToYmd(date);
    setForm((prev) => ({ ...prev, [key]: dateStr }));
  };

  if (loading) {
    return (
      <main className="bg-(--oboon-bg-default)">
        <PageContainer noHeaderOffset>
          <div className="py-8">
            <div className="ob-typo-body text-(--oboon-text-muted)">
              불러오는 중..
            </div>
          </div>
        </PageContainer>
      </main>
    );
  }

  return (
    <main className="bg-(--oboon-bg-default)">
      <PageContainer noHeaderOffset>
        <div className="py-8 md:py-0">
          <div className="flex w-full flex-col gap-6">
            {/* Header */}
            <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1 pt-1">
                <p className="ob-typo-h1 text-(--oboon-text-title)">
                  분양 일정
                </p>
                <p className="ob-typo-body text-(--oboon-text-muted)">
                  청약·계약·입주 주요 일정을 입력하세요.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  shape="pill"
                  onClick={() =>
                    router.push(`/company/properties/${propertyId}`)
                  }
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

            {/* Form Card */}
            <Card className="p-6">
              <h2 className="ob-typo-h3 text-(--oboon-text-title)">
                일정 입력
              </h2>

              <div className="mt-4 grid grid-cols-1 gap-4">
                {FIELDS.map((field) => {
                  const isMoveIn = field.key === "move_in_date";

                  return (
                    <div key={field.key} className="space-y-2">
                      <label className="ob-typo-body text-(--oboon-text-title)">
                        {field.label}
                      </label>

                      {isMoveIn ? (
                        <>
                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              variant={
                                moveInPrecision === "month"
                                  ? "primary"
                                  : "secondary"
                              }
                              size="sm"
                              shape="pill"
                              onClick={() => handlePrecisionChange("month")}
                            >
                              월(YYYY-MM)
                            </Button>
                            <Button
                              variant={
                                moveInPrecision === "day"
                                  ? "primary"
                                  : "secondary"
                              }
                              size="sm"
                              shape="pill"
                              onClick={() => handlePrecisionChange("day")}
                            >
                              일(YYYY-MM-DD)
                            </Button>
                          </div>

                          <PrecisionDateInput
                            value={form.move_in_date}
                            onChange={(next) =>
                              setForm((prev) => ({
                                ...prev,
                                move_in_date: next,
                              }))
                            }
                            policy="both"
                            defaultPrecision={moveInPrecision}
                            inputClassName={INPUT_LIKE}
                            placeholder={
                              moveInPrecision === "month"
                                ? "예) 2026-03"
                                : "예) 2026-03-01"
                            }
                          />
                        </>
                      ) : (
                        <div className="flex w-full items-center gap-2">
                          <div className="flex-1 min-w-0">
                            <OboonDatePicker
                              selected={parseYmdToLocalDate(form[field.key])}
                              onChange={(date: Date | null) =>
                                handleDateChange(field.key, date)
                              }
                              dateFormat="yyyy-MM-dd"
                              textFormat="yyyy-MM-dd"
                              inputClassName={INPUT_LIKE}
                              placeholder={field.placeholder}
                              customTrigger={(props) => (
                                <TimelineDateTrigger {...props} />
                              )}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <p className="mt-4 ob-typo-caption text-(--oboon-text-muted)">
                대부분의 일정은 YYYY-MM-DD 형식으로 입력합니다. 단, 입주
                예정일은 월 또는 일 단위를 선택할 수 있습니다.
              </p>
            </Card>
          </div>
        </div>
      </PageContainer>
    </main>
  );
}
