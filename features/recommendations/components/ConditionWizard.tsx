"use client";

import { useRef, useState } from "react";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import WizardStepIndicator from "@/features/recommendations/components/WizardStepIndicator";
import ConditionWizardStep1 from "@/features/recommendations/components/ConditionWizardStep1";
import ConditionWizardStep2 from "@/features/recommendations/components/ConditionWizardStep2";
import ConditionWizardStep3 from "@/features/recommendations/components/ConditionWizardStep3";
import type { RecommendationCondition } from "@/features/recommendations/hooks/useRecommendations";

type Props = {
  condition: RecommendationCondition;
  isLoggedIn?: boolean;
  hasSavedConditionPreset?: boolean;
  isConditionDirty?: boolean;
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

const RESET_CONDITION: RecommendationCondition = {
  availableCash: 0,
  monthlyIncome: 0,
  ownedHouseCount: 0,
  creditGrade: "good",
  purchasePurpose: "residence",
  employmentType: null,
  monthlyExpenses: 0,
  houseOwnership: null,
  purchasePurposeV2: null,
  purchaseTiming: null,
  moveinTiming: null,
  ltvInternalScore: 0,
  existingLoan: null,
  recentDelinquency: null,
  cardLoanUsage: null,
  loanRejection: null,
  monthlyIncomeRange: null,
  existingMonthlyRepayment: "none",
  regions: [],
};

export default function ConditionWizard({
  condition,
  isLoggedIn = true,
  hasSavedConditionPreset = false,
  isConditionDirty = false,
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

  const saveLabel =
    isLoggedIn === false && onLoginAndSave
      ? "로그인하고 조건 저장"
      : isLoggedIn && !hasSavedConditionPreset && onSave
        ? "조건 저장"
        : isLoggedIn && hasSavedConditionPreset && isConditionDirty && onSave
          ? "조건 업데이트"
          : null;

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
              onChange={onChange}
              onNext={() => handleNext(0)}
              onReset={handleReset}
            />
          )}
          {currentStep === 1 && (
            <ConditionWizardStep2
              condition={condition}
              isLoggedIn={isLoggedIn}
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
              onChange={onChange}
              onBack={() => setCurrentStep(1)}
              onFinish={() => void handleFinish()}
              onReset={handleReset}
              finishLabel={finishLabel}
              saveLabel={saveLabel}
              onSave={saveLabel ? handleStepSave : undefined}
              isSaving={isSaving}
              isSaveDisabled={!isReadyToEvaluate}
              isFinishing={isFinishing}
              finishingLabel="평가 중..."
            />
          )}
        </>
      )}

      {showFinalActions && (
        <div className="space-y-3 rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle) p-4">
          <p className="ob-typo-body font-semibold text-(--oboon-text-title)">
            입력한 조건으로 맞춤 현장을 평가할 준비가 됐어요
          </p>
          <div>
            <Button
              variant="primary"
              shape="pill"
              loading={isLoading}
              disabled={!isReadyToEvaluate}
              onClick={() => void onEvaluate()}
            >
              평가하기
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
