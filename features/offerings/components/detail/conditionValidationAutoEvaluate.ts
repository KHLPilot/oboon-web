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

  return (
    source === "profile_autofill" ||
    source === "session_restore" ||
    source === "manual"
  );
}
