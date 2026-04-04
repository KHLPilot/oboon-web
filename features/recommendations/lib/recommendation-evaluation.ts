type RecommendationMode = "input" | "sim";

type ShouldAutoEvaluateRecommendationsParams = {
  isBootstrapping: boolean;
  hasUserTriggeredEvaluation: boolean;
  mode: RecommendationMode;
  isReadyToEvaluate: boolean;
  skipNextAutoEvaluation: boolean;
};

export function shouldAutoEvaluateRecommendations(
  params: ShouldAutoEvaluateRecommendationsParams,
): boolean {
  const {
    isBootstrapping,
    hasUserTriggeredEvaluation,
    mode,
    isReadyToEvaluate,
    skipNextAutoEvaluation,
  } = params;

  if (isBootstrapping) return false;
  if (!hasUserTriggeredEvaluation) return false;
  if (mode !== "sim") return false;
  if (!isReadyToEvaluate) return false;
  if (skipNextAutoEvaluation) return false;
  return true;
}
