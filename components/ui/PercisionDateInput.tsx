// components/ui/PrecisionDateInput.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import OboonDatePicker from "@/components/ui/DatePicker";
import type { DatePrecision, DatePrecisionPolicy } from "./datePrecision";
import {
  dateFormatFor,
  formatLocalDate,
  inferPrecision,
  parseYmOrYmdToLocalDate,
  placeholderFor,
} from "./datePrecision";

type Props = {
  value: string | null;
  onChange: (next: string | null) => void;

  disabled?: boolean;

  /** monthOnly / dayOnly / both */
  policy: DatePrecisionPolicy;

  /** both 정책일 때, 초기 모드 강제. 미지정 시 value로 추론 */
  defaultPrecision?: DatePrecision;

  /** input 스타일 */
  inputClassName?: string;

  /** placeholder 커스텀 */
  placeholder?: string;
};

/**
 * 문자열 값(YYYY-MM 또는 YYYY-MM-DD)을 직접 저장하는 입력 컴포넌트.
 * - trigger prop 없음: 아이콘 트리거는 DatePicker 컴포넌트(OboonDatePicker)에서만 책임짐.
 */
export default function PrecisionDateInput({
  value,
  onChange,
  disabled,
  policy,
  defaultPrecision,
  inputClassName,
  placeholder,
}: Props) {
  const fixedPrecision: DatePrecision | null =
    policy === "monthOnly" ? "month" : policy === "dayOnly" ? "day" : null;

  const inferred = useMemo<DatePrecision>(() => {
    if (fixedPrecision) return fixedPrecision;
    if (defaultPrecision) return defaultPrecision;
    return inferPrecision(value);
  }, [fixedPrecision, defaultPrecision, value]);

  const [precision, setPrecision] = useState<DatePrecision>(inferred);

  // value가 바뀌면(서버 fetch 등) both 정책에서만 모드 동기화
  useEffect(() => {
    if (policy !== "both") return;
    if (!value) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- value change should sync precision mode when policy=both.
    setPrecision(inferPrecision(value));
  }, [policy, value]);

  const effectivePrecision = fixedPrecision ?? precision;
  const dateFormat = dateFormatFor(effectivePrecision);

  return (
    <div className="w-full">
      {policy === "both" && (
        <div className="mb-2 flex items-center gap-2">
          <span className="text-xs text-(--oboon-text-muted)">입력 단위</span>

          <div className="inline-flex overflow-hidden rounded-full border border-(--oboon-border-default)">
            <button
              type="button"
              disabled={disabled}
              onClick={() => setPrecision("month")}
              className={[
                "px-3 py-1 text-xs transition",
                effectivePrecision === "month"
                  ? "bg-(--oboon-primary)/10 text-(--oboon-text-title)"
                  : "text-(--oboon-text-muted) hover:bg-(--oboon-bg-subtle)",
                disabled ? "opacity-60" : "",
              ].join(" ")}
            >
              월(YYYY-MM)
            </button>

            <button
              type="button"
              disabled={disabled}
              onClick={() => setPrecision("day")}
              className={[
                "px-3 py-1 text-xs transition",
                effectivePrecision === "day"
                  ? "bg-(--oboon-primary)/10 text-(--oboon-text-title)"
                  : "text-(--oboon-text-muted) hover:bg-(--oboon-bg-subtle)",
                disabled ? "opacity-60" : "",
              ].join(" ")}
            >
              일(YYYY-MM-DD)
            </button>
          </div>
        </div>
      )}

      <OboonDatePicker
        selected={parseYmOrYmdToLocalDate(value)}
        onChange={(d) => onChange(formatLocalDate(d, effectivePrecision))}
        disabled={disabled}
        showMonthYearPicker={effectivePrecision === "month"}
        dateFormat={dateFormat}
        textFormat={dateFormat}
        inputClassName={inputClassName}
        placeholder={placeholder ?? placeholderFor(effectivePrecision)}
      />
    </div>
  );
}
