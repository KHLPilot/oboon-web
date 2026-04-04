type AutoEvaluateSource = "profile_autofill" | "session_restore" | "manual";

type ShouldAutoEvaluateDetailValidationParams = {
  source: AutoEvaluateSource;
  isLoggedIn: boolean;
  propertyId?: number;
  alreadyEvaluated: boolean;
};

export function shouldAutoEvaluateDetailValidation(
  params: ShouldAutoEvaluateDetailValidationParams,
): boolean {
  const { source, isLoggedIn, propertyId, alreadyEvaluated } = params;

  if (!isLoggedIn) return false;
  if (propertyId == null) return false;
  if (alreadyEvaluated) return false;

  // 상세 페이지는 자동 채움만 수행하고 평가는 명시적 사용자 액션으로만 실행한다.
  if (source === "profile_autofill" || source === "session_restore") {
    return false;
  }

  return source === "manual";
}
