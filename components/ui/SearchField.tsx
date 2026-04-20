"use client";

import * as React from "react";
import { Search, X } from "lucide-react";

import { cn } from "@/lib/utils/cn";

export type SearchFieldProps = {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  onSearch?: (value: string) => void;
  onDeleteClick?: () => void;
  placeholder?: string;
  fixed?: boolean;
  takeSpace?: boolean;
  autoFocus?: boolean;
  disabled?: boolean;
  className?: string;
};

export function SearchField({
  value,
  defaultValue,
  onChange,
  onSearch,
  onDeleteClick,
  placeholder = "검색",
  fixed = false,
  takeSpace = true,
  autoFocus = false,
  disabled = false,
  className,
}: SearchFieldProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const fixedRef = React.useRef<HTMLDivElement>(null);
  const [measuredHeight, setMeasuredHeight] = React.useState(0);
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue ?? "");

  const isControlled = value !== undefined;
  const currentValue = isControlled ? value : uncontrolledValue;
  const showClear = currentValue.length > 0;

  React.useEffect(() => {
    if (!fixed || !takeSpace) return;

    const element = fixedRef.current;
    if (!element) return;

    const updateHeight = () => {
      setMeasuredHeight(element.getBoundingClientRect().height);
    };

    updateHeight();

    const observer = new ResizeObserver(() => {
      updateHeight();
    });

    observer.observe(element);

    return () => observer.disconnect();
  }, [fixed, takeSpace]);

  React.useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
    }
  }, [autoFocus]);

  const setValue = (nextValue: string) => {
    if (!isControlled) {
      setUncontrolledValue(nextValue);
    }
    onChange?.(nextValue);
  };

  const handleSearch = () => {
    if (disabled) return;
    onSearch?.(currentValue);
  };

  const handleDelete = () => {
    if (disabled) return;

    if (onDeleteClick) {
      onDeleteClick();
      return;
    }

    setValue("");
  };

  const field = (
    <div
      className={cn(
        "flex items-center gap-2 bg-(--oboon-bg-subtle) rounded-xl px-4 h-10",
        disabled ? "opacity-60 pointer-events-none" : "",
        className
      )}
    >
      <button
        type="button"
        aria-label="검색"
        className="shrink-0 text-(--oboon-text-muted) transition-colors hover:text-(--oboon-text-default)"
        onClick={handleSearch}
        disabled={disabled}
      >
        <Search className="h-4 w-4" aria-hidden="true" />
      </button>

      <input
        ref={inputRef}
        type="search"
        role="searchbox"
        value={isControlled ? value : uncontrolledValue}
        autoFocus={autoFocus}
        placeholder={placeholder}
        disabled={disabled}
        aria-label={placeholder}
        className={cn(
          "flex-1 bg-transparent outline-none",
          "ob-typo-body2 text-(--oboon-text-default)",
          "placeholder:text-(--oboon-text-placeholder)"
        )}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Enter") {
            e.preventDefault();
            handleSearch();
          }
        }}
      />

      {showClear ? (
        <button
          type="button"
          aria-label="입력 지우기"
          className="shrink-0 text-(--oboon-text-muted) transition-colors hover:text-(--oboon-text-default)"
          onClick={handleDelete}
          disabled={disabled}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );

  if (!fixed) {
    return <div className={cn("relative w-full", className)}>{field}</div>;
  }

  return (
    <>
      <div
        ref={fixedRef}
        className={cn(
          "fixed top-0 left-0 right-0 z-(--oboon-z-overlay)",
          "bg-(--oboon-bg-surface)/95 backdrop-blur-sm",
          "border-b border-(--oboon-border-subtle)",
          "px-4 py-2",
          className
        )}
      >
        {field}
      </div>

      {takeSpace ? (
        <div aria-hidden="true" style={{ height: measuredHeight }} />
      ) : null}
    </>
  );
}

export default SearchField;
