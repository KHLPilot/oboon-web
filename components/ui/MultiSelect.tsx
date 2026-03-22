// components/ui/MultiSelect.tsx
"use client";

import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from "@/components/ui/DropdownMenu";

export type MultiSelectOption<T extends string> = {
  label: string;
  value: T;
};

type MultiSelectProps<T extends string> = {
  values: T[];
  onChange: (values: T[]) => void;
  options: readonly MultiSelectOption<T>[];
  placeholder?: string;   // 전체 선택 시 표시 (기본 "전체")
  className?: string;
  disabled?: boolean;
};

function summaryLabel<T extends string>(
  values: T[],
  options: readonly MultiSelectOption<T>[],
  placeholder: string,
): string {
  if (values.length === 0) return placeholder;
  const labels = values.map(
    (v) => options.find((o) => o.value === v)?.label ?? v,
  );
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]}·${labels[1]}`;
  return `${labels[0]} 외 ${labels.length - 1}개`;
}

export function MultiSelect<T extends string>({
  values,
  onChange,
  options,
  placeholder = "전체",
  className,
  disabled = false,
}: MultiSelectProps<T>) {
  const isAll = values.length === 0;

  const toggle = (value: T) => {
    if (values.includes(value)) {
      onChange(values.filter((v) => v !== value));
    } else {
      onChange([...values, value]);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex h-11 w-full items-center justify-between gap-2",
            "rounded-xl border border-(--oboon-border-default)",
            "bg-(--oboon-bg-surface) px-3",
            "ob-typo-body transition-colors outline-none",
            "focus-visible:ring-2 focus-visible:ring-(--oboon-accent)/30",
            isAll
              ? "text-(--oboon-text-muted)"
              : "text-(--oboon-text-body)",
            disabled && "cursor-not-allowed opacity-50 pointer-events-none",
            className,
          )}
        >
          <span className="truncate">
            {summaryLabel(values, options, placeholder)}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-(--oboon-text-muted)" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" matchTriggerWidth>
        <div className="max-h-[var(--dropdown-max-h,240px)] overflow-y-auto py-1">
          {/* 전체 선택 해제 */}
          <button
            type="button"
            className={cn(
              "flex w-full items-center justify-between gap-2 px-3 py-2",
              "ob-typo-body transition-colors hover:bg-(--oboon-bg-subtle)",
              isAll
                ? "text-(--oboon-primary) font-medium"
                : "text-(--oboon-text-body)",
            )}
            onClick={() => onChange([])}
          >
            <span>{placeholder}</span>
            {isAll && <Check className="h-4 w-4 shrink-0 text-(--oboon-primary)" />}
          </button>

          <div className="my-1 h-px bg-(--oboon-border-default)" />

          {options.map((option) => {
            const selected = values.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                className={cn(
                  "flex w-full items-center justify-between gap-2 px-3 py-2",
                  "ob-typo-body transition-colors hover:bg-(--oboon-bg-subtle)",
                  selected
                    ? "text-(--oboon-primary) font-medium"
                    : "text-(--oboon-text-body)",
                )}
                onClick={() => toggle(option.value)}
              >
                <span>{option.label}</span>
                {selected && (
                  <Check className="h-4 w-4 shrink-0 text-(--oboon-primary)" />
                )}
              </button>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default MultiSelect;
