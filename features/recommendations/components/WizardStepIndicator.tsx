"use client";

import { cn } from "@/lib/utils/cn";

const STEP_LABELS = ["재무", "대출", "계획"] as const;

type Props = {
  currentStep: 0 | 1 | 2;
};

export default function WizardStepIndicator({ currentStep }: Props) {
  return (
    <div className="flex items-center">
      {STEP_LABELS.map((label, i) => {
        const isCurrent = i === currentStep;
        const isCompleted = i < currentStep;
        const isUpcoming = i > currentStep;

        return (
          <div key={label} className="flex items-center">
            {i > 0 && (
              <div
                className={cn(
                  "mx-2 h-px w-5 transition-colors duration-300",
                  isUpcoming
                    ? "bg-(--oboon-border-default)"
                    : "bg-(--oboon-primary)",
                )}
              />
            )}
            <div className="flex items-center gap-1.5">
              <div
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold leading-none transition-all duration-300",
                  isCurrent &&
                    "bg-(--oboon-primary) text-(--oboon-on-primary) shadow-[0_0_0_3px_var(--oboon-primary)]/20",
                  isCompleted &&
                    "bg-(--oboon-primary) text-(--oboon-on-primary)",
                  isUpcoming &&
                    "border border-(--oboon-border-default) text-(--oboon-text-muted)",
                )}
              >
                {isCompleted ? "✓" : i + 1}
              </div>
              <span
                className={cn(
                  "ob-typo-caption leading-none transition-colors duration-300",
                  isCurrent && "font-semibold text-(--oboon-text-title)",
                  isCompleted && "text-(--oboon-primary)",
                  isUpcoming && "text-(--oboon-text-muted)",
                )}
              >
                {label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
