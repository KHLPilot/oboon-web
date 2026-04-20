"use client";

import ProgressStepper from "@/components/ui/ProgressStepper";

const STEPS = [
  { title: "재무" },
  { title: "대출" },
  { title: "계획" },
];

type Props = {
  currentStep: 0 | 1 | 2;
};

export default function WizardStepIndicator({ currentStep }: Props) {
  return (
    <>
      {/* 모바일: compact */}
      <div className="sm:hidden w-full">
        <ProgressStepper
          variant="compact"
          steps={STEPS}
          activeStepIndex={currentStep}
          className="w-full"
          paddingTop="default"
        />
      </div>
      {/* sm 이상: icon */}
      <div className="hidden sm:block w-full">
        <ProgressStepper
          variant="icon"
          steps={STEPS}
          activeStepIndex={currentStep}
          checkForFinish
          paddingTop="default"
        />
      </div>
    </>
  );
}
