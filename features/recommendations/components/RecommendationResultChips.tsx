"use client";

import { grade5DetailLabel } from "@/features/condition-validation/lib/grade5Labels";
import { cn } from "@/lib/utils/cn";

type ResultTone = "GREEN" | "LIME" | "YELLOW";

type ResultChipProps = {
  label: string;
  count: number;
  tone: ResultTone;
};

type RecommendationResultChipsProps = {
  counts: {
    GREEN: number;
    LIME: number;
    ALTERNATIVE: number;
  };
  className?: string;
};

function ResultChip(props: ResultChipProps) {
  const { label, count, tone } = props;

  const toneClassName =
    tone === "GREEN"
      ? "bg-(--oboon-grade-green-bg) text-(--oboon-grade-green-text)"
      : tone === "LIME"
        ? "bg-(--oboon-grade-lime-bg) text-(--oboon-grade-lime-text)"
        : "bg-(--oboon-grade-yellow-bg) text-(--oboon-grade-yellow-text)";

  const dotColor =
    tone === "GREEN"
      ? "bg-(--oboon-grade-green)"
      : tone === "LIME"
        ? "bg-(--oboon-grade-lime)"
        : "bg-(--oboon-grade-yellow)";

  if (count === 0) return null;

  return (
    <>
      <span className="inline-flex items-center gap-1.5 ob-typo-body text-(--oboon-text-muted) sm:hidden">
        <span className={cn("h-2 w-2 shrink-0 rounded-full", dotColor)} />
        {count}개
      </span>

      <span
        className={cn(
          "hidden sm:inline-flex items-center gap-1 rounded-full px-2.5 py-1 ob-typo-caption",
          toneClassName,
        )}
      >
        {label} {count}개
      </span>
    </>
  );
}

export default function RecommendationResultChips(
  props: RecommendationResultChipsProps,
) {
  const { counts, className } = props;

  return (
    <div className={cn("flex min-w-0 items-center gap-3 sm:gap-2 overflow-hidden whitespace-nowrap", className)}>
      <ResultChip
        label={grade5DetailLabel("GREEN")}
        count={counts.GREEN}
        tone="GREEN"
      />
      <ResultChip
        label={grade5DetailLabel("LIME")}
        count={counts.LIME}
        tone="LIME"
      />
      <ResultChip
        label="대안"
        count={counts.ALTERNATIVE}
        tone="YELLOW"
      />
    </div>
  );
}
