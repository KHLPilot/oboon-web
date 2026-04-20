import * as React from "react";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils/cn";

export type ProgressStepperStepProps = {
  title?: string;
  icon?: React.ReactNode;
};

export type ProgressStepperProps = {
  variant: "compact" | "icon";
  steps: Array<{ title?: string; icon?: React.ReactNode }>;
  activeStepIndex?: number;
  checkForFinish?: boolean;
  paddingTop?: "default" | "wide";
  className?: string;
};

function getPaddingTopClass(paddingTop: NonNullable<ProgressStepperProps["paddingTop"]>) {
  switch (paddingTop) {
    case "wide": return "pt-6";
    default:     return "pt-4";
  }
}

function ProgressStepperRoot({
  variant,
  steps,
  activeStepIndex = 0,
  checkForFinish = false,
  paddingTop = "default",
  className,
}: ProgressStepperProps) {
  if (steps.length === 0) return null;

  const clamped = Math.min(Math.max(activeStepIndex, 0), steps.length - 1);
  const hasLabels = steps.some((s) => s.title);
  if (variant === "compact") {
    return (
      <div className={cn("w-full", getPaddingTopClass(paddingTop), className)}>
        <div className="relative">
          {/* base track — dot 중심 기준: 양쪽 각 cellWidth/2 만큼 안쪽 */}
          <div
            aria-hidden="true"
            className="absolute top-0.5 h-2 rounded-full bg-(--oboon-border-default)/20"
            style={{
              left: `${100 / (steps.length * 2)}%`,
              right: `${100 / (steps.length * 2)}%`,
            }}
          />
          {/* filled track */}
          <div
            aria-hidden="true"
            className="absolute top-0.5 h-2 rounded-full bg-(--oboon-primary)/30 transition-[width] duration-300"
            style={{
              left: `${100 / (steps.length * 2)}%`,
              width: `${clamped / steps.length * 100}%`,
            }}
          />

          <div
            className="relative grid w-full"
            style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
          >
            {steps.map((step, i) => {
              const isActive = i === clamped;
              const isCompleted = i < clamped;

              return (
                <div
                  key={step.title ?? i}
                  className="flex flex-col items-center"
                >
                  <div className="flex h-3 items-center justify-center">
                    <span
                      className={cn(
                        "relative z-10 rounded-full transition-all duration-300",
                        isActive
                          ? "h-3 w-3 bg-(--oboon-primary) ring-[3px] ring-(--oboon-primary)/25"
                          : isCompleted
                            ? "h-2 w-2 bg-(--oboon-primary)"
                            : "h-2 w-2 bg-(--oboon-border-default)",
                      )}
                    />
                  </div>

                  {hasLabels ? (
                    <span
                      className={cn(
                        "mt-2 whitespace-nowrap text-center transition-colors duration-300",
                        "ob-typo-body",
                        isActive
                          ? "font-semibold text-(--oboon-text-title)"
                          : "text-(--oboon-text-muted)",
                      )}
                    >
                      {step.title}
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("w-full", getPaddingTopClass(paddingTop), className)}>
      <div className="relative">
        {/* base track — dot 외곽 기준: 중심에서 반지름(12px)만큼 바깥으로 */}
        <div
          aria-hidden="true"
          className="absolute top-0 h-6 rounded-full bg-(--oboon-border-default)/20"
          style={{
            left: `calc(${100 / (steps.length * 2)}% + 12px)`,
            right: `calc(${100 / (steps.length * 2)}% + 12px)`,
          }}
        />
        {/* filled track — clamped dot 중심까지 채움 */}
        <div
          aria-hidden="true"
          className="absolute top-3 h-0.5 rounded-full bg-(--oboon-primary) transition-[width] duration-300"
          style={{
            left: `calc(${100 / (steps.length * 2)}% + 12px)`,
            width: `calc(${(clamped > 0 ? clamped * 100 / steps.length : 0)}% - ${clamped > 0 ? 24 : 0}px)`,
          }}
        />

        <div
          className="relative grid w-full"
          style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
        >
          {steps.map((step, i) => {
            const isActive = i === clamped;
            const isCompleted = i < clamped;

            return (
              <div key={step.title ?? i} className="flex flex-col items-center">
                <div
                  className={cn(
                    "relative z-10 flex items-center justify-center rounded-full border ob-typo-caption font-semibold transition-all duration-300",
                    isActive
                      ? "h-6 w-6 bg-(--oboon-primary) border-(--oboon-primary) text-(--oboon-on-primary) ring-4 ring-(--oboon-primary)/20"
                      : isCompleted
                        ? "h-6 w-6 bg-(--oboon-bg-surface) border-(--oboon-primary) text-(--oboon-primary)"
                        : "h-6 w-6 bg-(--oboon-bg-surface) border-(--oboon-border-default) text-(--oboon-text-muted)",
                  )}
                >
                  {checkForFinish && isCompleted ? (
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : step.icon ? (
                    <span aria-hidden="true">{step.icon}</span>
                  ) : (
                    i + 1
                  )}
                </div>

                {hasLabels ? (
                  <span
                    className={cn(
                      "mt-2 whitespace-nowrap text-center transition-colors duration-300",
                      "ob-typo-body",
                      isActive
                        ? "font-semibold text-(--oboon-text-title)"
                        : "text-(--oboon-text-muted)",
                    )}
                  >
                    {step.title}
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Compound 호환 유지
function ProgressStepperStep() {
  return null;
}

type ProgressStepperCompound = typeof ProgressStepperRoot & {
  Step: typeof ProgressStepperStep;
};

const ProgressStepper = ProgressStepperRoot as ProgressStepperCompound;
ProgressStepper.Step = ProgressStepperStep;

export default ProgressStepper;
