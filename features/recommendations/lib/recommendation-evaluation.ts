type ShouldAutoEvaluateRecommendationsParams = {
  isBootstrapping: boolean;
  hasRestoredCondition: boolean;
  alreadyAutoEvaluated: boolean;
  isReadyToEvaluate: boolean;
};

export function shouldAutoEvaluateRecommendations(
  params: ShouldAutoEvaluateRecommendationsParams,
): boolean {
  const {
    isBootstrapping,
    hasRestoredCondition,
    alreadyAutoEvaluated,
    isReadyToEvaluate,
  } = params;

  if (isBootstrapping) return false;
  if (!hasRestoredCondition) return false;
  if (alreadyAutoEvaluated) return false;
  if (!isReadyToEvaluate) return false;
  return true;
}
