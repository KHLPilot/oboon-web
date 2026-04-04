"use client";

import { cn } from "@/lib/utils/cn";

const STEP_LABELS = ["재무", "대출", "계획"] as const;

type Props = {
  currentStep: 0 | 1 | 2;
  completedSteps: Set<number>;
  onStepClick?: (step: 0 | 1 | 2) => void;
};

export default function WizardStepIndicator({
  currentStep,
  completedSteps,
  onStepClick,
}: Props) {
  return (
    <div className="flex items-center">
      {STEP_LABELS.map((label, i) => {
        const isCompleted = completedSteps.has(i);
        const isCurrent = i === currentStep;
        const isClickable = isCompleted && !!onStepClick;

        return (
          <div key={label} className="flex items-center">
            {i > 0 && (
              <div
                className={cn(
                  "mx-1 hidden h-px w-5 xs:block",
                  isCompleted
                    ? "bg-(--oboon-primary)"
                    : "bg-(--oboon-border-default)",
                )}
              />
            )}
            <button
              type="button"
              disabled={!isClickable}
              onClick={() => isClickable && onStepClick(i as 0 | 1 | 2)}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-2.5 py-1 ob-typo-caption transition-colors",
                isCurrent && "bg-(--oboon-primary) text-white",
                isCompleted &&
                  !isCurrent &&
                  "cursor-pointer text-(--oboon-primary) hover:bg-(--oboon-primary)/10",
                !isCurrent &&
                  !isCompleted &&
                  "cursor-default text-(--oboon-text-muted)",
              )}
            >
              <span
                className={cn(
                  "flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                  isCurrent && "bg-white/20",
                  isCompleted && !isCurrent && "bg-(--oboon-primary)/15",
                  !isCurrent && !isCompleted && "bg-(--oboon-border-default)",
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
