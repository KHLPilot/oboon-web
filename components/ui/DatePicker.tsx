"use client";

import React, {
  forwardRef,
  useMemo,
  useState,
  type ComponentPropsWithoutRef,
} from "react";
import DatePicker from "react-datepicker";
import { registerLocale } from "react-datepicker";
import { CalendarDays } from "lucide-react";
import "react-datepicker/dist/react-datepicker.css";
import { ko } from "date-fns/locale";

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
    ref={ref as any}
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
    <span className="sr-only">달력 열기</span>
  </Button>
));
CalendarIconButton.displayName = "CalendarIconButton";

type NativeDatePickerProps = ComponentPropsWithoutRef<typeof DatePicker>;

export type DateTextFormat = "yyyy-MM" | "yyyy-MM-dd";

/**
 * ✅ trigger prop 없음(중복 방지): 아이콘은 여기서만 생성
 * ✅ popperModifiers 미사용(타입 충돌/레이아웃 꼬임 방지)
 */
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
    event?: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>
  ) => void;

  buttonProps?: CalendarIconButtonProps;
  inputClassName?: string;

  allowTextInput?: boolean;
  textFormat?: DateTextFormat;
  placeholder?: string;
};

function parseYmdToLocalDateStrict(ymd: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!m) return null;

  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);

  if (!y || mo < 1 || mo > 12 || d < 1 || d > 31) return null;

  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d)
    return null;

  return dt;
}

/** YYYY-MM 입력은 해당 월의 1일로 간주 */
function parseYmToLocalDateStrict(ym: string): Date | null {
  const m = /^(\d{4})-(\d{2})$/.exec(ym.trim());
  if (!m) return null;

  const y = Number(m[1]);
  const mo = Number(m[2]);

  if (!y || mo < 1 || mo > 12) return null;

  const dt = new Date(y, mo - 1, 1);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1) return null;

  return dt;
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
  disabled,
  ...rest
}: OboonDatePickerProps) {
  const [open, setOpen] = useState(false);

  const trigger = useMemo(() => {
    return (
      <CalendarIconButton
        {...buttonProps}
        onClick={(e: any) => {
          buttonProps?.onClick?.(e);
          if (!disabled) setOpen(true);
        }}
        disabled={disabled ?? buttonProps?.disabled}
      />
    );
  }, [buttonProps, disabled]);

  return (
    <>
      <div className="flex w-full items-center gap-2">
        {/* ✅ A안: wrapper 흔들림 방지(레이아웃 고정) */}
        <div className="min-w-0 flex-1">
          <DatePicker
            {...(rest as NativeDatePickerProps)}
            locale="ko"
            disabled={disabled}
            open={open}
            onCalendarOpen={() => setOpen(true)}
            onCalendarClose={() => setOpen(false)}
            onClickOutside={() => setOpen(false)}
            onInputClick={() => {
              if (!disabled) setOpen(true);
            }}
            onChange={(date: any, event: any) => {
              setOpen(false);
              onChange?.(date ?? null, event);
            }}
            onChangeRaw={(e) => {
              if (!allowTextInput) return;

              const raw = (e?.target as HTMLInputElement | null)?.value ?? "";
              if (!raw.trim()) {
                onChange?.(null, e as any);
                return;
              }

              const parsed =
                textFormat === "yyyy-MM"
                  ? parseYmToLocalDateStrict(raw)
                  : parseYmdToLocalDateStrict(raw);

              if (parsed) onChange?.(parsed, e as any);
            }}
            dateFormat={textFormat}
            className={inputClassName}
            placeholderText={placeholder}
            calendarClassName={calendarClassName ?? "oboon-datepicker"}
            popperClassName={popperClassName ?? "oboon-datepicker-popper"}
            wrapperClassName="w-full"
          />
        </div>

        {trigger}
      </div>

      {/* ✅ 디자인 토큰 기반 “최소 스타일”만 적용 (레이아웃은 react-datepicker 기본을 최대한 유지) */}
      <style jsx global>{`
        /* ===== Layout Stabilization ===== */
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

        /* ===== Popper ===== */
        .oboon-datepicker-popper {
          z-index: 50;
        }

        /* ===== Minimal Theme (tokens only) ===== */
        .oboon-datepicker {
          background: var(--oboon-bg-surface);
          border: 1px solid var(--oboon-border-default);
          border-radius: 12px;
          color: var(--oboon-text-body);
        }

        .oboon-datepicker .react-datepicker__header {
          background: var(--oboon-bg-surface);
          border-bottom: 1px solid var(--oboon-border-default);
        }

        .oboon-datepicker .react-datepicker__current-month,
        .oboon-datepicker .react-datepicker__year-header {
          color: var(--oboon-text-title);
          font-weight: 600;
        }

        .oboon-datepicker .react-datepicker__day-name,
        .oboon-datepicker .react-datepicker__day,
        .oboon-datepicker .react-datepicker__month-text,
        .oboon-datepicker .react-datepicker__quarter-text,
        .oboon-datepicker .react-datepicker__year-text {
          color: var(--oboon-text-body);
        }

        .oboon-datepicker .react-datepicker__day:hover,
        .oboon-datepicker .react-datepicker__month-text:hover,
        .oboon-datepicker .react-datepicker__quarter-text:hover,
        .oboon-datepicker .react-datepicker__year-text:hover {
          background: var(--oboon-bg-subtle);
          border-radius: 8px;
        }

        .oboon-datepicker .react-datepicker__day--selected,
        .oboon-datepicker .react-datepicker__day--keyboard-selected,
        .oboon-datepicker .react-datepicker__month-text--selected,
        .oboon-datepicker .react-datepicker__month-text--keyboard-selected,
        .oboon-datepicker .react-datepicker__quarter-text--selected,
        .oboon-datepicker .react-datepicker__quarter-text--keyboard-selected,
        .oboon-datepicker .react-datepicker__year-text--selected,
        .oboon-datepicker .react-datepicker__year-text--keyboard-selected {
          background: var(--oboon-primary);
          color: var(--oboon-on-primary, #fff);
          border-radius: 8px;
        }

        .oboon-datepicker .react-datepicker__day--today,
        .oboon-datepicker .react-datepicker__month-text--today,
        .oboon-datepicker .react-datepicker__year-text--today {
          border: 1px solid var(--oboon-primary);
          border-radius: 8px;
        }

        .oboon-datepicker .react-datepicker__navigation-icon::before {
          border-color: var(--oboon-text-muted);
        }
        .oboon-datepicker
          .react-datepicker__navigation:hover
          .react-datepicker__navigation-icon::before {
          border-color: var(--oboon-text-title);
        }
      `}</style>
    </>
  );
}
