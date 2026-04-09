"use client";

import { cn } from "@/lib/utils/cn";

const STEP_LABELS = ["재무", "대출", "계획"] as const;

type Props = {
  currentStep: 0 | 1 | 2;
};

export default function WizardStepIndicator({
  currentStep,
}: Props) {
  return (
    <div className="flex items-center">
      {STEP_LABELS.map((label, i) => {
        const isCurrent = i === currentStep;
        const isReached = i <= currentStep;
        const isCompleted = i < currentStep;
        const hasReachedPreviousStep = i > 0 && currentStep >= i;

        return (
          <div key={label} className="flex items-center">
            {i > 0 && (
              <div
                className={cn(
                  "mx-1 hidden h-px w-5 xs:block",
                  hasReachedPreviousStep
                    ? "bg-(--oboon-primary)"
                    : "bg-(--oboon-border-default)",
                )}
              />
            )}
            <button
              type="button"
              disabled
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-2.5 py-1 ob-typo-caption transition-colors",
                isCurrent &&
                  "border-(--oboon-primary) bg-transparent text-(--oboon-text-title)",
                isReached &&
                  !isCurrent &&
                  "border-(--oboon-primary) cursor-default text-(--oboon-text-title)",
                !isReached &&
                  "border-(--oboon-border-default) cursor-default text-(--oboon-text-muted)",
              )}
            >
              <span
                className={cn(
                  "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[10px] leading-none font-bold",
                  isCurrent &&
                    "border-(--oboon-primary) bg-(--oboon-primary) text-(--oboon-on-primary)",
                  isReached &&
                    !isCurrent &&
                    "border-(--oboon-primary) bg-(--oboon-primary) text-(--oboon-on-primary)",
                  !isReached &&
                    "border-(--oboon-border-default) bg-transparent text-(--oboon-text-muted)",
                )}
              >
                {isCompleted && !isCurrent ? "✓" : i + 1}
              </span>
              <span className="hidden xs:inline">{label}</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
