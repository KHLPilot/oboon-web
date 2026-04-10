import { notFound } from "next/navigation";

import { ConditionStepFlow } from "@/app/recommendations/conditions/ConditionStepFlow.client";

function parseStep(step: string): 1 | 2 | 3 | null {
  if (step === "1" || step === "2" || step === "3") {
    return Number(step) as 1 | 2 | 3;
  }
  return null;
}

export default async function ConditionStepPage({
  params,
}: {
  params: Promise<{ step: string }>;
}) {
  const { step: stepParam } = await params;
  const step = parseStep(stepParam);
  if (!step) {
    notFound();
  }

  return <ConditionStepFlow step={step} />;
}
