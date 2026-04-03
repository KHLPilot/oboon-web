"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { saveConditionSession } from "@/features/condition-validation/lib/sessionCondition";
import WizardStepIndicator from "@/features/recommendations/components/WizardStepIndicator";
import ConditionWizardStep1 from "@/features/recommendations/components/ConditionWizardStep1";
import ConditionWizardStep2 from "@/features/recommendations/components/ConditionWizardStep2";
import ConditionWizardStep3 from "@/features/recommendations/components/ConditionWizardStep3";
import type { RecommendationCondition } from "@/features/recommendations/hooks/useRecommendations";

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
};

type Step = 0 | 1 | 2;

function saveWizardSession(condition: RecommendationCondition) {
  saveConditionSession({
    availableCash: condition.availableCash.toString(),
    monthlyIncome: condition.monthlyIncome.toString(),
    monthlyExpenses: condition.monthlyExpenses.toString(),
    employmentType: condition.employmentType,
    houseOwnership: condition.houseOwnership,
    purchasePurposeV2: condition.purchasePurposeV2,
    purchaseTiming: condition.purchaseTiming,
    moveinTiming: condition.moveinTiming,
    ltvInternalScore: condition.ltvInternalScore,
    existingLoan: condition.existingLoan,
    recentDelinquency: condition.recentDelinquency,
    cardLoanUsage: condition.cardLoanUsage,
    loanRejection: condition.loanRejection,
    monthlyIncomeRange: condition.monthlyIncomeRange,
    existingMonthlyRepayment: condition.existingMonthlyRepayment,
  });
}

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
}: Props) {
  const [currentStep, setCurrentStep] = useState<Step>(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [showFinalActions, setShowFinalActions] = useState(false);
  const toast = useToast();

  const markCompleted = (step: number) => {
    setCompletedSteps((prev) => new Set([...prev, step]));
  };

  const handleNext = (fromStep: Step) => {
    markCompleted(fromStep);
    saveWizardSession(condition);

    if (fromStep < 2) {
      setCurrentStep((fromStep + 1) as Step);
    }
  };

  const handleFinish = () => {
    markCompleted(2);
    saveWizardSession(condition);
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
    setCompletedSteps(new Set());
    setShowFinalActions(false);
  };

  const isReadyToEvaluate =
    condition.availableCash > 0 &&
    condition.monthlyIncome > 0 &&
    condition.houseOwnership !== null &&
    condition.purchasePurposeV2 !== null &&
    (isLoggedIn ? condition.ltvInternalScore > 0 : true);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <WizardStepIndicator
          currentStep={showFinalActions ? 2 : currentStep}
          completedSteps={completedSteps}
          onStepClick={(step) => {
            if (completedSteps.has(step)) {
              setCurrentStep(step);
              setShowFinalActions(false);
            }
          }}
        />
        <button
          type="button"
          onClick={handleReset}
          className="ml-2 shrink-0 ob-typo-caption text-(--oboon-text-muted) transition-colors hover:text-(--oboon-text-body)"
        >
          초기화
        </button>
      </div>

      {!showFinalActions && (
        <>
          {currentStep === 0 && (
            <ConditionWizardStep1
              condition={condition}
              onChange={onChange}
              onNext={() => handleNext(0)}
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
            />
          )}
          {currentStep === 2 && (
            <ConditionWizardStep3
              condition={condition}
              onChange={onChange}
              onBack={() => setCurrentStep(1)}
              onFinish={handleFinish}
            />
          )}
        </>
      )}

      {showFinalActions && (
        <div className="space-y-3 rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle) p-4">
          <p className="ob-typo-body font-semibold text-(--oboon-text-title)">
            입력한 조건으로 맞춤 현장을 평가할 준비가 됐어요
          </p>
          <div className="flex flex-col gap-2">
            {isLoggedIn === false && onLoginAndSave ? (
              <Button
                variant="secondary"
                shape="pill"
                onClick={() => void onLoginAndSave()}
              >
                로그인하고 조건 저장
              </Button>
            ) : isLoggedIn && !hasSavedConditionPreset && onSave ? (
              <Button
                variant="secondary"
                shape="pill"
                loading={isSaving}
                disabled={!isReadyToEvaluate}
                onClick={() => void handleSave()}
              >
                조건 저장
              </Button>
            ) : isLoggedIn &&
              hasSavedConditionPreset &&
              isConditionDirty &&
              onSave ? (
              <Button
                variant="secondary"
                shape="pill"
                loading={isSaving}
                disabled={!isReadyToEvaluate}
                onClick={() => void handleSave()}
              >
                조건 업데이트
              </Button>
            ) : null}

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
