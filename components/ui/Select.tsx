// components/ui/Select.tsx
"use client";

import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";

export type SelectOption<T extends string | number = string> = {
  label: string;
  value: T;
};

export type SelectProps<T extends string | number = string> = {
  value: T;
  onChange: (value: T) => void;
  options: readonly SelectOption<T>[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

export function Select<T extends string | number>({
  value,
  onChange,
  options,
  placeholder = "선택",
  disabled = false,
  className,
}: SelectProps<T>) {
  const selected = options.find((o) => o.value === value);

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
            "ob-typo-body",
            "outline-none focus-visible:ring-2 focus-visible:ring-(--oboon-accent)/30",
            "transition-colors",
            selected
              ? "text-(--oboon-text-body)"
              : "text-(--oboon-text-muted)",
            disabled &&
              "cursor-not-allowed bg-(--oboon-bg-subtle) opacity-50 pointer-events-none",
            className
          )}
        >
          <span className="truncate">{selected?.label ?? placeholder}</span>
          <ChevronDown className="h-4 w-4 shrink-0 text-(--oboon-text-muted)" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" matchTriggerWidth>
        <div className="max-h-60 overflow-y-auto">
          {options.map((option) => (
            <DropdownMenuItem
              key={String(option.value)}
              className={cn(
                "flex items-center justify-between gap-2",
                option.value === value && "bg-(--oboon-bg-subtle)"
              )}
              onClick={() => onChange(option.value)}
            >
              <span>{option.label}</span>
              {option.value === value ? (
                <Check className="h-4 w-4 shrink-0 text-(--oboon-primary)" />
              ) : null}
            </DropdownMenuItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default Select;
