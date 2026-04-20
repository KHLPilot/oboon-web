"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";

import SegmentedControl from "@/components/ui/SegmentedControl";
import SimulatorBar from "@/features/recommendations/components/SimulatorBar";
import type {
  RecommendationCondition,
  RecommendationMode,
} from "@/features/recommendations/hooks/useRecommendations";

type ConditionWizardProps = {
  condition: RecommendationCondition;
  isLoggedIn?: boolean;
  hasSavedConditionPreset?: boolean;
  isConditionDirty?: boolean;
  onRestoreDefault?: () => boolean;
  onChange: (patch: Partial<RecommendationCondition>) => void;
  onEvaluate: (override?: RecommendationCondition) => void | Promise<boolean>;
  onSave?: () => void | Promise<boolean>;
  onLoginAndSave?: () => void | Promise<void>;
  isLoading?: boolean;
  isSaving?: boolean;
  evaluateOnFinish?: boolean;
  finishLabel?: string;
};

const ConditionWizard = dynamic(
  () => import("@/features/recommendations/components/ConditionWizard"),
  { ssr: false },
) as unknown as ComponentType<ConditionWizardProps>;

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
  onRestoreDefault?: () => boolean;
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
    onRestoreDefault,
    onModeChange,
  } = props;

  return (
    <div className="space-y-4">
      <SegmentedControl
        fullWidth
        value={mode}
        onChange={(v) => onModeChange(v as RecommendationMode)}
        options={[
          { value: "input", label: "직접 입력" },
          { value: "sim", label: "시뮬레이터" },
        ]}
      />

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
          onRestoreDefault={onRestoreDefault}
          evaluateOnFinish
          onChange={onChange}
          onEvaluate={onEvaluate}
          onSave={onSave}
          onLoginAndSave={onLoginAndSave}
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
