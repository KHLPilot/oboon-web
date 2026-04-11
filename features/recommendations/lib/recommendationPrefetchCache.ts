import type { RecommendationCondition } from "@/features/recommendations/domain/recommendationCondition";
import { creditGradeFromLtvInternalScore } from "@/features/condition-validation/domain/conditionState";

export const RECOMMENDATION_PREFETCH_STORAGE_KEY =
  "oboon:recommendation-prefetch";

type RecommendationPrefetchCache = {
  conditionKey: string;
  recommendations: unknown[];
  savedAt: string;
};

function toNonNegativeInt(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value));
}

function buildConditionKey(condition: RecommendationCondition, isLoggedIn: boolean) {
  return JSON.stringify({
    isLoggedIn,
    availableCash: toNonNegativeInt(condition.availableCash),
    monthlyIncome: toNonNegativeInt(condition.monthlyIncome),
    monthlyExpenses: toNonNegativeInt(condition.monthlyExpenses),
    employmentType: condition.employmentType ?? null,
    houseOwnership: condition.houseOwnership ?? null,
    purchasePurposeV2: condition.purchasePurposeV2 ?? null,
    purchaseTiming: condition.purchaseTiming ?? null,
    moveinTiming: condition.moveinTiming ?? null,
    ltvInternalScore: toNonNegativeInt(condition.ltvInternalScore),
    creditGrade:
      condition.creditGrade ??
      creditGradeFromLtvInternalScore(condition.ltvInternalScore),
    existingLoan: condition.existingLoan ?? null,
    recentDelinquency: condition.recentDelinquency ?? null,
    cardLoanUsage: condition.cardLoanUsage ?? null,
    loanRejection: condition.loanRejection ?? null,
    monthlyIncomeRange: condition.monthlyIncomeRange ?? null,
    existingMonthlyRepayment: condition.existingMonthlyRepayment ?? null,
  });
}

export function saveRecommendationPrefetchCache(
  condition: RecommendationCondition,
  isLoggedIn: boolean,
  recommendations: unknown[],
): void {
  if (typeof window === "undefined") return;

  try {
    const payload: RecommendationPrefetchCache = {
      conditionKey: buildConditionKey(condition, isLoggedIn),
      recommendations,
      savedAt: new Date().toISOString(),
    };
    window.sessionStorage.setItem(
      RECOMMENDATION_PREFETCH_STORAGE_KEY,
      JSON.stringify(payload),
    );
  } catch {
    // Ignore storage failure.
  }
}

export function consumeRecommendationPrefetchCache(
  condition: RecommendationCondition,
  isLoggedIn: boolean,
): unknown[] | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(RECOMMENDATION_PREFETCH_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<RecommendationPrefetchCache> | null;
    if (!parsed?.conditionKey || !Array.isArray(parsed.recommendations)) {
      window.sessionStorage.removeItem(RECOMMENDATION_PREFETCH_STORAGE_KEY);
      return null;
    }

    if (parsed.conditionKey !== buildConditionKey(condition, isLoggedIn)) {
      window.sessionStorage.removeItem(RECOMMENDATION_PREFETCH_STORAGE_KEY);
      return null;
    }

    window.sessionStorage.removeItem(RECOMMENDATION_PREFETCH_STORAGE_KEY);
    return parsed.recommendations;
  } catch {
    return null;
  }
}
