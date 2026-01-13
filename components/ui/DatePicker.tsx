"use client";

import React, {
  forwardRef,
  useMemo,
  useState,
  type ComponentPropsWithoutRef,
  type ReactElement,
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
    <span className="sr-only">달력 열기</span>
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
    event?: React.SyntheticEvent<HTMLElement>
  ) => void;

  buttonProps?: CalendarIconButtonProps;
  inputClassName?: string;

  allowTextInput?: boolean;
  textFormat?: DateTextFormat;
  placeholder?: string;

  customTrigger?: (props: CalendarIconButtonProps) => ReactElement;
};

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

// ✅ 커스텀 인풋 컴포넌트
const CustomInput = forwardRef<
  HTMLInputElement,
  {
    value?: string;
    onClick?: () => void;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
    onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  }
>(({ value, onClick, onChange, placeholder, className, disabled, onKeyDown }, ref) => {
  // ✅ 숫자만 입력 + 자동 포맷팅
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
        if (firstDigit > 1) {
          month = `0${firstDigit}`;
        }
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

    // onChange 이벤트 발생
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
      onClick={onClick}
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

  const trigger = useMemo(() => {
    const triggerProps: CalendarIconButtonProps = {
      ...buttonProps,
      onClick: (e: React.MouseEvent<HTMLButtonElement>) => {
        buttonProps?.onClick?.(e);
        if (!disabled) setOpen(true);
      },
      disabled: disabled ?? buttonProps?.disabled,
    };

    if (customTrigger) {
      return customTrigger(triggerProps);
    }

    return <CalendarIconButton {...triggerProps} />;
  }, [buttonProps, disabled, customTrigger]);

  const handleChange = (
    date: Date | Date[] | [Date | null, Date | null] | null,
    event?: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>
  ) => {
    setOpen(false);
    const next = Array.isArray(date) ? date[0] ?? null : date ?? null;
    onChange?.(next, event);
  };

  const handleRaw = (
    event?: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>
  ) => {
    if (!allowTextInput) return;

    const raw = (event?.target as HTMLInputElement | null)?.value?.toString() ?? "";
    if (!raw.trim()) {
      onChange?.(null, event);
      return;
    }

    // YYYY-MM-DD 완성 시 Date 객체로 변환
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw.trim());
    if (m) {
      const [_, y, mo, d] = m;
      const date = new Date(Number(y), Number(mo) - 1, Number(d));
      onChange?.(date, event);
    }
  };

  const pickerProps: NativeDatePickerProps = {
    ...rest,
    locale: "ko",
    disabled,
    open,
    onCalendarOpen: () => setOpen(true),
    onCalendarClose: () => setOpen(false),
    onClickOutside: () => setOpen(false),
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

        {trigger}
      </div>

      <style jsx global>{`
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