"use client";

import * as React from "react";
import { X } from "lucide-react";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";

export type ConditionChip = {
  key: string;
  label: string;
  value: string;
  onRemove?: () => void;
};

export type ConditionBarProps = {
  chips: ConditionChip[];
  onReset?: () => void;
  className?: string;
};

export default function ConditionBar({
  chips,
  onReset,
  className,
}: ConditionBarProps) {
  if (chips.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 overflow-x-auto py-1 scrollbar-none [-webkit-overflow-scrolling:touch]",
        className,
      )}
    >
      {chips.map((chip) => (
        <div
          key={chip.key}
          className="inline-flex shrink-0 items-center gap-1 rounded-full bg-(--oboon-bg-subtle) px-3 py-1.5 ob-typo-caption text-(--oboon-text-title)"
        >
          <span className="whitespace-nowrap">
            {chip.label ? `${chip.label} ${chip.value}` : chip.value}
          </span>
          {chip.onRemove ? (
            <button
              type="button"
              onClick={chip.onRemove}
              aria-label={`${chip.label} ${chip.value} 제거`}
              className="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-(--oboon-bg-elevated)"
            >
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
          ) : null}
        </div>
      ))}

      {onReset ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="shrink-0"
          onClick={onReset}
        >
          초기화
        </Button>
      ) : null}
    </div>
  );
}
