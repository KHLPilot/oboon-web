"use client";

import { cn } from "@/lib/utils/cn";

import ConditionWizard from "@/features/recommendations/components/ConditionWizard";
import SimulatorBar from "@/features/recommendations/components/SimulatorBar";
import type {
  RecommendationCondition,
  RecommendationMode,
} from "@/features/recommendations/hooks/useRecommendations";

type RecommendationConditionPanelProps = {
  condition: RecommendationCondition;
  mode: RecommendationMode;
  isLoggedIn?: boolean;
  hasSavedConditionPreset?: boolean;
  isConditionDirty?: boolean;
  errorMessage?: string | null;
  isLoading?: boolean;
  isSaving?: boolean;
  onChange: (patch: Partial<RecommendationCondition>) => void;
  onEvaluate: (override?: RecommendationCondition) => void | Promise<boolean>;
  onSave?: () => void | Promise<boolean>;
  onLoginAndSave?: () => void | Promise<void>;
  onModeChange: (mode: RecommendationMode) => void;
};

export default function RecommendationConditionPanel(
  props: RecommendationConditionPanelProps,
) {
  const {
    condition,
    mode,
    isLoggedIn = true,
    hasSavedConditionPreset = false,
    isConditionDirty = false,
    errorMessage = null,
    isLoading = false,
    isSaving = false,
    onChange,
    onEvaluate,
    onSave,
    onLoginAndSave,
    onModeChange,
  } = props;

  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-full bg-(--oboon-bg-subtle) p-1">
        <button
          type="button"
          onClick={() => onModeChange("input")}
          className={cn(
            "flex-1 h-9 rounded-full ob-typo-body transition-colors",
            mode === "input"
              ? "bg-(--oboon-primary) text-(--oboon-on-primary) font-medium shadow-sm"
              : "text-(--oboon-text-muted) hover:text-(--oboon-text-body)",
          )}
        >
          직접 입력
        </button>
        <button
          type="button"
          onClick={() => onModeChange("sim")}
          className={cn(
            "flex-1 h-9 rounded-full ob-typo-body transition-colors flex items-center justify-center gap-1.5",
            mode === "sim"
              ? "bg-(--oboon-primary) text-(--oboon-on-primary) font-medium shadow-sm"
              : "text-(--oboon-text-muted) hover:text-(--oboon-text-body)",
          )}
        >
          시뮬레이터
        </button>
      </div>

      <div className="border-t border-(--oboon-border-default)" />

      {errorMessage ? (
        <div className="rounded-2xl border border-(--oboon-danger-border) bg-(--oboon-danger-bg) px-4 py-3">
          <p className="ob-typo-body text-(--oboon-danger-text)">{errorMessage}</p>
        </div>
      ) : null}

      {mode === "input" ? (
        <ConditionWizard
          condition={condition}
          isLoggedIn={isLoggedIn}
          hasSavedConditionPreset={hasSavedConditionPreset}
          isConditionDirty={isConditionDirty}
          evaluateOnFinish
          onChange={onChange}
          onEvaluate={onEvaluate}
          onSave={isLoggedIn ? onSave : undefined}
          onLoginAndSave={isLoggedIn ? undefined : onLoginAndSave}
          isLoading={isLoading}
          isSaving={isSaving}
        />
      ) : (
        <SimulatorBar
          condition={condition}
          onEvaluate={onEvaluate}
          isLoading={isLoading}
          isLoggedIn={isLoggedIn}
        />
      )}
    </div>
  );
}
