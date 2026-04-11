import type { CreditGrade } from "@/features/condition-validation/domain/types";
import type { RecommendationCondition } from "@/features/recommendations/domain/recommendationCondition";

export function createEmptyRecommendationCondition(): RecommendationCondition {
  return {
    availableCash: 0,
    monthlyIncome: 0,
    ownedHouseCount: 0,
    creditGrade: null,
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
    existingMonthlyRepayment: null,
    regions: [],
  };
}

export function creditGradeFromLtvInternalScore(
  score: number | null | undefined,
): CreditGrade | null {
  if (score == null || score <= 0) return null;
  if (score >= 70) return "good";
  if (score >= 40) return "normal";
  return "unstable";
}

export function ltvInternalScoreFromCreditGrade(
  creditGrade: CreditGrade | null | undefined,
): number | null {
  if (creditGrade === "good") return 80;
  if (creditGrade === "normal") return 55;
  if (creditGrade === "unstable") return 20;
  return null;
}
