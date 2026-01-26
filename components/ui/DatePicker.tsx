// components/ui/DatePicker.tsx
"use client";

import React, {
  forwardRef,
  useMemo,
  useState,
  useRef, // [추가] useRef 가져오기
  type ComponentPropsWithoutRef,
  type ReactElement,
} from "react";
import DatePicker from "react-datepicker";
import { registerLocale } from "react-datepicker";
import { CalendarDays } from "lucide-react";
import "react-datepicker/dist/react-datepicker.css";
import { ko } from "date-fns/locale";
import { offset, flip, shift } from "@floating-ui/dom";

import Button from "@/components/ui/Button";

registerLocale("ko", ko);

export type CalendarIconButtonProps = Omit<
  ComponentPropsWithoutRef<typeof Button>,
  "value"
> & {
  value?: string;
};

export const CalendarIconButton = forwardRef<
  HTMLButtonElement,
  CalendarIconButtonProps
>(({ className = "", ...rest }, ref) => (
  <Button
    ref={ref}
    type="button"
    variant="secondary"
    size="sm"
    shape="pill"
    className={[
      "p-0 h-10 w-10 inline-flex items-center justify-center shrink-0",
      className,
    ].join(" ")}
    {...rest}
  >
    <CalendarDays className="h-4 w-4" />
    <span className="sr-only">달력</span>
  </Button>
));
CalendarIconButton.displayName = "CalendarIconButton";

type NativeDatePickerProps = ComponentPropsWithoutRef<typeof DatePicker>;

export type DateTextFormat = "yyyy-MM" | "yyyy-MM-dd";

export type OboonDatePickerProps = Omit<
  NativeDatePickerProps,
  | "customInput"
  | "onChange"
  | "selectsRange"
  | "selectsMultiple"
  | "startDate"
  | "endDate"
  | "selectedDates"
  | "inline"
> & {
  onChange?: (
    date: Date | null,
    event?: React.SyntheticEvent<HTMLElement>,
  ) => void;

  buttonProps?: CalendarIconButtonProps;
  inputClassName?: string;

  allowTextInput?: boolean;
  textFormat?: DateTextFormat;
  placeholder?: string;

  customTrigger?: (props: CalendarIconButtonProps) => ReactElement;
};

function getDaysInMonth(year: number, month: number): number {
  // month: 1-12
  return new Date(year, month, 0).getDate();
}

/**
 * divCustomInput
 * - 텍스트 입력(숫자 기반 포맷팅)만 담당
 * - "input 클릭/포커스로 달력 열기"를 막기 위해 DatePicker가 주입하는 onClick/onFocus를 input에 연결하지 않습니다.
 */
const CustomInput = forwardRef<
  HTMLInputElement,
  {
    value?: string;
    // DatePicker가 주입할 수 있지만 사용하지 않음 (중요)
    onClick?: () => void;
    onFocus?: () => void;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
    onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  }
>(({ value, onChange, placeholder, className, disabled, onKeyDown }, ref) => {
  const handleInput = (e: React.FormEvent<HTMLInputElement>) => {
    const raw = (e.target as HTMLInputElement).value;
    const digitsOnly = raw.replace(/[^\d]/g, "");

    let formatted = "";

    if (digitsOnly.length <= 4) {
      formatted = digitsOnly;
    } else if (digitsOnly.length <= 6) {
      const year = digitsOnly.slice(0, 4);
      let month = digitsOnly.slice(4, 6);

      if (month.length === 1) {
        const firstDigit = parseInt(month[0], 10);
        if (firstDigit > 1) month = `0${firstDigit}`;
      } else if (month.length === 2) {
        const monthNum = parseInt(month, 10);
        if (monthNum > 12) month = "12";
        else if (monthNum < 1) month = "01";
      }

      formatted = `${year}-${month}`;
    } else {
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
    }

    (e.target as HTMLInputElement).value = formatted;

    if (onChange) {
      const syntheticEvent = {
        ...e,
        target: e.target as HTMLInputElement,
        currentTarget: e.target as HTMLInputElement,
      } as React.ChangeEvent<HTMLInputElement>;
      onChange(syntheticEvent);
    }
  };

  return (
    <input
      ref={ref}
      type="text"
      value={value}
      // div핵심: onClick/onFocus를 연결하지 않음
      onInput={handleInput}
      onChange={onChange}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      className={className}
      disabled={disabled}
      inputMode="numeric"
    />
  );
});
CustomInput.displayName = "CustomInput";

const OBOON_DATEPICKER_GLOBAL_STYLES = `
  /* =========================
  * Wrapper / Popper
  * ========================= */
  .react-datepicker-wrapper {
    width: 100% !important;
    display: block;
  }

  .react-datepicker__input-container {
    width: 100% !important;
  }

  .react-datepicker__input-container input {
    width: 100%;
  }

  .oboon-datepicker-popper {
    z-index: 50;
  }

  /* =========================
  * DatePicker Container
  * ========================= */
  .oboon-datepicker {
    background: var(--oboon-bg-surface);
    border: 1px solid var(--oboon-border-default);
    border-radius: 16px;
    color: var(--oboon-text-body);

    /* div헤더 잔상 / 이중 라인 방지 */
    overflow: hidden;
  }

  /* =========================
  * Header (상단 라인 정리)
  * ========================= */
  .oboon-datepicker .react-datepicker__header {
    background: var(--oboon-bg-surface);
    border-bottom: 1px solid var(--oboon-border-default);

    /* ❌ 기본 inset shadow / hairline 제거 */
    border-top: 0 !important;
    box-shadow: none !important;
  }

  .oboon-datepicker .react-datepicker__month-container {
    box-shadow: none !important;
  }

  .oboon-datepicker .react-datepicker__current-month,
  .oboon-datepicker .react-datepicker__year-header {
    color: var(--oboon-text-title);
    font-weight: 600;
  }

  /* =========================
  * Day / Weekday Typography
  * ========================= */
  .oboon-datepicker .react-datepicker__day-name {
    color: var(--oboon-text-muted);
    font-weight: 500;
  }

  .oboon-datepicker .react-datepicker__day {
    color: var(--oboon-text-body);
  }

  /* =========================
  * Day Cell Layout (원형)
  * ========================= */
  .oboon-datepicker .react-datepicker__day,
  .oboon-datepicker .react-datepicker__day-name {
    width: 2rem;
    line-height: 2rem;
    margin: 0.125rem;
    text-align: center;
  }

  /* 기본 상태도 원형으로 */
  .oboon-datepicker .react-datepicker__day {
    border-radius: 9999px !important;
  }

  /* =========================
  * Hover
  * ========================= */
  .oboon-datepicker .react-datepicker__day:hover {
    background: var(--oboon-bg-subtle);
    border-radius: 9999px !important;
  }

  /* =========================
  * Selected / Keyboard Selected
  * ========================= */
  .oboon-datepicker .react-datepicker__day--selected,
  .oboon-datepicker .react-datepicker__day--keyboard-selected {
    background: var(--oboon-primary);
    color: var(--oboon-on-primary);
    border-radius: 9999px !important;
  }

  /* =========================
  * Today
  * ========================= */
  .oboon-datepicker .react-datepicker__day--today {
    border: 1px solid var(--oboon-primary);
    border-radius: 9999px !important;
  }

  /* =========================
  * Disabled Day
  * ========================= */
  .oboon-datepicker .react-datepicker__day--disabled {
    color: var(--oboon-text-muted);
    opacity: 0.4;
    cursor: not-allowed;
  }

  .oboon-datepicker .react-datepicker__day--disabled:hover {
    background: transparent;
  }

  /* =========================
  * Navigation (‹ ›)
  * ========================= */
  .oboon-datepicker .react-datepicker__navigation-icon::before {
    border-color: var(--oboon-border-default);
  }

  .oboon-datepicker
    .react-datepicker__navigation:hover
    .react-datepicker__navigation-icon::before {
    border-color: var(--oboon-border-strong);
  }
`;

export function OboonDatePickerStyles() {
  return <style jsx global>{OBOON_DATEPICKER_GLOBAL_STYLES}</style>;
}

export function OboonInlineDatePicker({
  calendarClassName,
  locale,
  ...rest
}: NativeDatePickerProps) {
  return (
    <>
      <DatePicker
        {...rest}
        inline
        locale={locale ?? "ko"}
        calendarClassName={calendarClassName ?? "oboon-datepicker"}
      />
      <OboonDatePickerStyles />
    </>
  );
}

export default function OboonDatePicker({
  buttonProps,
  onChange,
  inputClassName,
  allowTextInput = true,
  textFormat = "yyyy-MM-dd",
  placeholder,
  calendarClassName,
  popperClassName,
  showMonthYearDropdown,
  disabled,
  customTrigger,
  ...rest
}: OboonDatePickerProps) {
  const [open, setOpen] = useState(false);

  // [추가] 버튼 영역을 감지하기 위한 Ref
  const triggerRef = useRef<HTMLDivElement>(null);

  const trigger = useMemo(() => {
    const triggerProps: CalendarIconButtonProps = {
      ...buttonProps,
      onClick: (e: React.MouseEvent<HTMLButtonElement>) => {
        buttonProps?.onClick?.(e);
        if (disabled) return;
        setOpen((v) => !v); // 토글 동작
      },
      disabled: disabled ?? buttonProps?.disabled,
      "aria-expanded": open,
      "aria-label": open ? "달력 닫기" : "달력 열기",
    };

    if (customTrigger) return customTrigger(triggerProps);
    return <CalendarIconButton {...triggerProps} />;
  }, [buttonProps, disabled, customTrigger, open]);

  const handleChange = (
    date: Date | Date[] | [Date | null, Date | null] | null,
    event?: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>,
  ) => {
    // 날짜 선택 시에는 항상 닫기
    setOpen(false);
    const next = Array.isArray(date) ? (date[0] ?? null) : (date ?? null);
    onChange?.(next, event as unknown as React.SyntheticEvent<HTMLElement>);
  };

  const handleRaw = (
    event?: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>,
  ) => {
    if (!allowTextInput) return;

    const raw =
      (event?.target as HTMLInputElement | null)?.value?.toString() ?? "";
    if (!raw.trim()) {
      onChange?.(null, event as unknown as React.SyntheticEvent<HTMLElement>);
      return;
    }

    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw.trim());
    if (m) {
      const [, y, mo, d] = m;
      const parsed = new Date(Number(y), Number(mo) - 1, Number(d));
      onChange?.(parsed, event as unknown as React.SyntheticEvent<HTMLElement>);
    }
  };

  const pickerProps: NativeDatePickerProps = {
    ...rest,
    locale: "ko",
    disabled,
    open,
    popperPlacement: "bottom-end",
    popperModifiers: [
      offset({ mainAxis: 8, crossAxis: 0 }), // 아래로 8px
      shift({ padding: 8 }), // 화면 밖으로 나가지 않게
      flip({ fallbackPlacements: ["top-end", "bottom-end"] }), // 위로 뒤집힐 때도 end 유지
    ],

    onClickOutside: (event) => {
      if (
        triggerRef.current &&
        event.target instanceof Node &&
        triggerRef.current.contains(event.target)
      ) {
        return;
      }
      setOpen(false);
    },

    onChange: handleChange,
    onChangeRaw: handleRaw,
    dateFormat: textFormat,
    placeholderText: placeholder,

    calendarClassName: calendarClassName ?? "oboon-datepicker",
    popperClassName: popperClassName ?? "oboon-datepicker-popper",
    wrapperClassName: "w-full",

    customInput: <CustomInput className={inputClassName} />,
    ...(showMonthYearDropdown ? { showMonthYearDropdown: true } : {}),
  };

  return (
    <>
      <div className="flex w-full items-center gap-2">
        <div className="min-w-0 flex-1">
          <DatePicker {...pickerProps} />
        </div>

        {/* [수정] Ref 연결을 위해 div로 감싸기 */}
        <div ref={triggerRef} className="shrink-0">
          {trigger}
        </div>
      </div>

      <OboonDatePickerStyles />
    </>
  );
}
