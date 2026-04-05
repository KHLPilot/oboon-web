type Step1ConditionSlice = {
  employmentType: unknown;
  houseOwnership: unknown;
  availableCash: number;
  monthlyIncome: number;
  monthlyExpenses: number;
};

type Step3ConditionSlice = {
  purchasePurposeV2: unknown;
  purchaseTiming: unknown;
  moveinTiming: unknown;
};

export function isStep1ReadyByAuth(
  condition: Step1ConditionSlice,
  isLoggedIn: boolean,
): boolean {
  if (!condition.houseOwnership) return false;
  if (!(condition.availableCash > 0)) return false;
  if (!(condition.monthlyIncome > 0)) return false;
  if (!isLoggedIn) return true;

  return condition.employmentType !== null && condition.monthlyExpenses > 0;
}

export function isStep3ReadyByAuth(
  condition: Step3ConditionSlice,
  isLoggedIn: boolean,
): boolean {
  if (!condition.purchasePurposeV2) return false;
  if (!isLoggedIn) return true;

  return condition.purchaseTiming !== null && condition.moveinTiming !== null;
}
