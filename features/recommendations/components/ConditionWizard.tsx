"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import type { ComponentType } from "react";
import { CheckCircle2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Result from "@/components/ui/Result";
import { useToast } from "@/components/ui/Toast";
import WizardStepIndicator from "@/features/recommendations/components/WizardStepIndicator";
import type { RecommendationCondition } from "@/features/recommendations/hooks/useRecommendations";
import { createEmptyRecommendationCondition } from "@/features/condition-validation/domain/conditionState";

type Props = {
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

type Step = 0 | 1 | 2;

const RESET_CONDITION: RecommendationCondition =
  createEmptyRecommendationCondition();

type Step1Props = {
  condition: RecommendationCondition;
  isLoggedIn: boolean;
  hasSavedConditionPreset?: boolean;
  isConditionDirty?: boolean;
  onRestoreDefault?: () => boolean;
  onChange: (patch: Partial<RecommendationCondition>) => void;
  onNext: () => void;
  onReset: () => void;
  progressive?: boolean;
};

type Step2Props = {
  condition: RecommendationCondition;
  isLoggedIn: boolean;
  isAuthResolved?: boolean;
  hasSavedConditionPreset?: boolean;
  isConditionDirty?: boolean;
  onRestoreDefault?: () => boolean;
  onChange: (patch: Partial<RecommendationCondition>) => void;
  onNext: () => void;
  onBack: () => void;
  onLoginAndSave?: () => void | Promise<void>;
  onReset: () => void;
  progressive?: boolean;
};

type Step3Props = {
  condition: RecommendationCondition;
  isLoggedIn: boolean;
  isAuthResolved?: boolean;
  hasSavedConditionPreset?: boolean;
  isConditionDirty?: boolean;
  onRestoreDefault?: () => boolean;
  onChange: (patch: Partial<RecommendationCondition>) => void;
  onBack: () => void;
  onFinish: () => void;
  onReset: () => void;
  finishLabel?: string;
  onSave?: () => void;
  isSaving?: boolean;
  isSaveDisabled?: boolean;
  isFinishing?: boolean;
  finishingLabel?: string;
  progressive?: boolean;
};

const ConditionWizardStep1 = dynamic(
  () => import("@/features/recommendations/components/ConditionWizardStep1"),
  { ssr: false },
) as unknown as ComponentType<Step1Props>;

const ConditionWizardStep2 = dynamic(
  () => import("@/features/recommendations/components/ConditionWizardStep2"),
  { ssr: false },
) as unknown as ComponentType<Step2Props>;

const ConditionWizardStep3 = dynamic(
  () => import("@/features/recommendations/components/ConditionWizardStep3"),
  { ssr: false },
) as unknown as ComponentType<Step3Props>;

export default function ConditionWizard({
  condition,
  isLoggedIn = true,
  hasSavedConditionPreset = false,
  isConditionDirty = false,
  onRestoreDefault,
  onChange,
  onEvaluate,
  onSave,
  onLoginAndSave,
  isLoading = false,
  isSaving = false,
  evaluateOnFinish = false,
  finishLabel,
}: Props) {
  const [currentStep, setCurrentStep] = useState<Step>(0);
  const [showFinalActions, setShowFinalActions] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const finishInFlightRef = useRef(false);
  const toast = useToast();

  const handleNext = (fromStep: Step) => {
    if (fromStep < 2) {
      setCurrentStep((fromStep + 1) as Step);
    }
  };

  const handleFinish = async () => {
    if (finishInFlightRef.current) return;
    if (evaluateOnFinish) {
      finishInFlightRef.current = true;
      setIsFinishing(true);
      try {
        await onEvaluate();
      } finally {
        setIsFinishing(false);
        finishInFlightRef.current = false;
      }
      return;
    }
    setShowFinalActions(true);
  };

  const handleSave = async () => {
    if (!onSave) return;
    const ok = await onSave();
    if (ok) toast.success("조건이 저장되었습니다.");
    else toast.error("저장에 실패했습니다. 다시 시도해주세요.");
  };

  const handleReset = () => {
    onChange(RESET_CONDITION);
    setCurrentStep(0);
    setShowFinalActions(false);
    setIsFinishing(false);
    finishInFlightRef.current = false;
  };

  const isReadyToEvaluate =
    condition.availableCash > 0 &&
    condition.monthlyIncome > 0 &&
    condition.houseOwnership !== null &&
    condition.purchasePurposeV2 !== null &&
    (isLoggedIn ? condition.ltvInternalScore > 0 : true);

  const handleStepSave = () => {
    if (isLoggedIn === false && onLoginAndSave) {
      void onLoginAndSave();
      return;
    }
    if (onSave) {
      void handleSave();
    }
  };

  return (
    <div className="space-y-4">
      <div
        className={[
          "flex justify-center",
          isLoggedIn && hasSavedConditionPreset && isConditionDirty ? "pt-2" : "",
        ].join(" ")}
      >
        <WizardStepIndicator
          currentStep={showFinalActions ? 2 : currentStep}
        />
      </div>

      {!showFinalActions && (
        <>
          {currentStep === 0 && (
            <ConditionWizardStep1
              condition={condition}
              isLoggedIn={isLoggedIn}
              hasSavedConditionPreset={hasSavedConditionPreset}
              isConditionDirty={isConditionDirty}
              onRestoreDefault={onRestoreDefault}
              onChange={onChange}
              onNext={() => handleNext(0)}
              onReset={handleReset}
            />
          )}
          {currentStep === 1 && (
            <ConditionWizardStep2
              condition={condition}
              isLoggedIn={isLoggedIn}
              hasSavedConditionPreset={hasSavedConditionPreset}
              isConditionDirty={isConditionDirty}
              onRestoreDefault={onRestoreDefault}
              onChange={onChange}
              onNext={() => handleNext(1)}
              onBack={() => setCurrentStep(0)}
              onLoginAndSave={onLoginAndSave}
              onReset={handleReset}
            />
          )}
          {currentStep === 2 && (
            <ConditionWizardStep3
              condition={condition}
              isLoggedIn={isLoggedIn}
              hasSavedConditionPreset={hasSavedConditionPreset}
              isConditionDirty={isConditionDirty}
              onRestoreDefault={onRestoreDefault}
              onChange={onChange}
              onBack={() => setCurrentStep(1)}
              onFinish={() => void handleFinish()}
              onReset={handleReset}
              finishLabel={finishLabel}
              onSave={onSave || onLoginAndSave ? handleStepSave : undefined}
              isSaving={isSaving}
              isSaveDisabled={!isReadyToEvaluate}
              isFinishing={isFinishing}
              finishingLabel="평가 중..."
            />
          )}
        </>
      )}

      {showFinalActions && (
        <Result
          figure={<CheckCircle2 className="h-10 w-10 text-(--oboon-primary)" />}
          title="조건 입력 완료"
          description="입력한 조건으로 맞춤 현장을 평가할 준비가 됐어요"
          button={
            <Button
              variant="primary"
              shape="pill"
              loading={isLoading}
              disabled={!isReadyToEvaluate}
              onClick={() => void onEvaluate()}
            >
              평가하기
            </Button>
          }
        />
      )}
    </div>
  );
}
