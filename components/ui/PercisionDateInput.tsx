// components/ui/PercisionDateInput.tsx

"use client";

import { useRef, useState } from "react";

type Policy = "day" | "month" | "both";
type Precision = "day" | "month";

type Props = {
  value: string | null;
  onChange: (value: string | null) => void;
  policy: Policy;
  defaultPrecision?: Precision;
  disabled?: boolean;
  inputClassName?: string;
  placeholder?: string;
};

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export default function PrecisionDateInput({
  value,
  onChange,
  policy,
  defaultPrecision = "day",
  disabled = false,
  inputClassName = "h-11",
  placeholder,
}: Props) {
  const [displayValue, setDisplayValue] = useState(value || "");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const digitsOnly = raw.replace(/[^\d]/g, "");

    let formatted = "";
    let shouldMoveToNext = false;

    // ✅ 정밀도에 따라 최대 길이 제한
    const maxLength = defaultPrecision === "month" ? 6 : 8; // YYYYMM vs YYYYMMDD

    if (digitsOnly.length <= 4) {
      // YYYY
      formatted = digitsOnly;
    } else if (digitsOnly.length <= 6) {
      // YYYY-MM
      const year = digitsOnly.slice(0, 4);
      let month = digitsOnly.slice(4, 6);

      if (month.length === 1) {
        const firstDigit = parseInt(month[0], 10);
        if (firstDigit > 1) {
          month = `0${firstDigit}`;
        }
      } else if (month.length === 2) {
        const monthNum = parseInt(month, 10);
        if (monthNum > 12) month = "12";
        else if (monthNum < 1) month = "01";
      }

      formatted = `${year}-${month}`;

      // ✅ 월 정밀도이고 YYYY-MM 완성 시
      if (defaultPrecision === "month" && month.length === 2) {
        shouldMoveToNext = true;
      }
    } else if (defaultPrecision === "day" && digitsOnly.length <= maxLength) {
      // ✅ 일 정밀도일 때만 YYYY-MM-DD 입력 가능
      const year = digitsOnly.slice(0, 4);
      let month = digitsOnly.slice(4, 6);
      let day = digitsOnly.slice(6, 8);

      if (month.length === 1) {
        const firstDigit = parseInt(month[0], 10);
        if (firstDigit > 1) month = `0${firstDigit}`;
      } else if (month.length === 2) {
        const monthNum = parseInt(month, 10);
        if (monthNum > 12) month = "12";
        else if (monthNum < 1) month = "01";
      }

      if (day) {
        const yearNum = parseInt(year, 10);
        const monthNum = parseInt(month, 10);
        const maxDays = getDaysInMonth(yearNum, monthNum);

        if (day.length === 1) {
          const firstDigit = parseInt(day[0], 10);
          if (firstDigit > 3) day = `0${firstDigit}`;
        } else if (day.length === 2) {
          const dayNum = parseInt(day, 10);
          if (dayNum > maxDays) day = String(maxDays).padStart(2, "0");
          else if (dayNum < 1) day = "01";
        }
      }

      formatted = `${year}-${month}${day ? `-${day}` : ""}`;

      // ✅ 일 정밀도이고 YYYY-MM-DD 완성 시
      if (defaultPrecision === "day" && day.length === 2) {
        shouldMoveToNext = true;
      }
    } else {
      // ✅ 최대 길이 초과 시 무시
      formatted = displayValue;
    }

    setDisplayValue(formatted);

    // 유효성 검증 후 onChange 호출
    if (policy === "both") {
      if (
        /^\d{4}-\d{2}$/.test(formatted) ||
        /^\d{4}-\d{2}-\d{2}$/.test(formatted)
      ) {
        onChange(formatted);
      } else if (formatted === "") {
        onChange(null);
      }
    } else if (policy === "month") {
      if (/^\d{4}-\d{2}$/.test(formatted)) {
        onChange(formatted);
      } else if (formatted === "") {
        onChange(null);
      }
    } else {
      if (/^\d{4}-\d{2}-\d{2}$/.test(formatted)) {
        onChange(formatted);
      } else if (formatted === "") {
        onChange(null);
      }
    }

    if (shouldMoveToNext) {
      setTimeout(() => {
        moveToNextInput();
      }, 0);
    }
  };

  const moveToNextInput = () => {
    const form = inputRef.current?.form;
    if (!form) return;

    const inputs = Array.from(
      form.querySelectorAll(
        "input:not([type='hidden']), button, select, textarea",
      ),
    );
    const currentIndex = inputs.indexOf(inputRef.current!);
    const nextInput = inputs[currentIndex + 1] as HTMLElement;

    if (nextInput && nextInput.tagName !== "BUTTON") {
      nextInput.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      moveToNextInput();
    }
  };

  return (
    <input
      ref={inputRef}
      type="text"
      value={displayValue}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      className={inputClassName}
      placeholder={placeholder}
      inputMode="numeric"
    />
  );
}
