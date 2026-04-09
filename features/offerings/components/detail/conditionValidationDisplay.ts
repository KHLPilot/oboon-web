import type {
  EmploymentType,
  FinalGrade5,
  FullEvaluationResponse,
  FullPurchasePurpose,
  GuestEvaluationResponse,
  UnitTypeResultItem,
} from "../../../condition-validation/domain/types";
// @ts-expect-error - Node's native ESM test runner needs the explicit .ts extension here.
import { normalizeRecommendationUnitTypes } from "../../../recommendations/lib/recommendationUnitTypes.ts";
import type { RecommendationUnitType } from "../../../recommendations/lib/recommendationUnitTypes";
// @ts-expect-error - Node's native ESM test runner needs the explicit .ts extension here.
import { buildRecommendationCategoryReason } from "../../../recommendations/lib/recommendationCategoryReason.ts";

type RecommendationReasonCategoryKey = Parameters<
  typeof buildRecommendationCategoryReason
>[0]["key"];

export type ConditionValidationCategoryDisplayItem = {
  key: "cash" | "income" | "ltv_dsr" | "credit" | "ownership" | "purpose" | "timing";
  label: string;
  grade: FinalGrade5;
  reason: string;
};

type SharedDisplayInputs = {
  availableCash: number | null;
  houseOwnership: "none" | "one" | "two_or_more" | null;
  purchasePurpose: FullPurchasePurpose | null;
};

type FullDisplayInputs = SharedDisplayInputs & {
  monthlyIncome: number | null;
  employmentType: EmploymentType | null;
};

function deriveIncomeStabilityPoints(employmentType: EmploymentType | null): number | null {
  if (employmentType === "employee") return 8;
  if (employmentType === "self_employed") return 6;
  if (employmentType === "freelancer") return 4;
  if (employmentType === "other") return 3;
  return null;
}

function deriveIncomeRepaymentPoints(
  monthlyPaymentEst: number | null | undefined,
  monthlySurplus: number | null | undefined,
): number | null {
  if (monthlyPaymentEst == null || monthlyPaymentEst <= 0 || monthlySurplus == null) return null;
  const ratio = monthlySurplus / monthlyPaymentEst;
  if (ratio >= 1.5) return 8;
  if (ratio >= 1.2) return 6;
  if (ratio >= 1.0) return 4;
  return 2;
}

function deriveIncomeScalePoints(
  monthlyIncome: number | null,
  monthlyPaymentEst: number | null | undefined,
): number | null {
  if (monthlyIncome == null || monthlyPaymentEst == null || monthlyPaymentEst <= 0) return null;
  if (monthlyIncome > monthlyPaymentEst * 4) return 7;
  if (monthlyIncome > monthlyPaymentEst * 2) return 5;
  if (monthlyIncome > monthlyPaymentEst) return 3;
  return 1;
}

export function normalizeDetailUnitTypeResults(
  unitTypeResults: UnitTypeResultItem[] | null | undefined,
): RecommendationUnitType[] {
  return normalizeRecommendationUnitTypes({
    unit_type_results: unitTypeResults ?? [],
  });
}

export function buildFullConditionCategoryDisplay(params: {
  categories: FullEvaluationResponse["categories"];
  metrics: FullEvaluationResponse["metrics"];
  inputs: FullDisplayInputs;
  isPricePublic: boolean;
}): ConditionValidationCategoryDisplayItem[] {
  const { categories, metrics, inputs, isPricePublic } = params;
  if (!categories) return [];

  const incomeStabilityPoints = deriveIncomeStabilityPoints(inputs.employmentType);
  const incomeRepaymentPoints = deriveIncomeRepaymentPoints(
    metrics?.monthly_payment_est,
    metrics?.monthly_surplus,
  );
  const incomeScalePoints = deriveIncomeScalePoints(
    inputs.monthlyIncome,
    metrics?.monthly_payment_est,
  );
  const cashCoveragePercent =
    inputs.availableCash != null &&
    metrics?.contract_amount != null &&
    metrics.contract_amount > 0
      ? (inputs.availableCash / metrics.contract_amount) * 100
      : null;

  const items = [
    { key: "cash", label: "자금력", category: categories.cash },
    { key: "income", label: "소득", category: categories.income },
    { key: "ltv_dsr", label: "대출 여건", category: categories.ltv_dsr },
    { key: "ownership", label: "주택 보유", category: categories.ownership },
    { key: "purpose", label: "구매 목적", category: categories.purpose },
    { key: "timing", label: "시점", category: categories.timing },
  ] as const satisfies ReadonlyArray<{
    key: Exclude<ConditionValidationCategoryDisplayItem["key"], "credit">;
    label: string;
    category: NonNullable<FullEvaluationResponse["categories"]>[keyof NonNullable<FullEvaluationResponse["categories"]>];
  }>;
  return items.map(({ key, label, category }) => ({
    key,
    label,
    grade: category.grade,
    reason: buildRecommendationCategoryReason({
      key: (key === "ltv_dsr" ? "ltvDsr" : key) as RecommendationReasonCategoryKey,
      grade: category.grade,
      isPricePublic,
      rawReason: category.reason,
      metrics: {
        availableCash: inputs.availableCash,
        contractAmount: metrics?.contract_amount ?? null,
        minCash: key === "cash" ? null : metrics?.min_cash ?? null,
        recommendedCash: key === "cash" ? null : metrics?.recommended_cash ?? null,
        cashCoveragePercent,
        monthlyPaymentEst: metrics?.monthly_payment_est ?? null,
        monthlyBurdenPercent: metrics?.monthly_burden_percent ?? null,
        monthlySurplus: metrics?.monthly_surplus ?? null,
        incomeStabilityPoints,
        incomeRepaymentPoints,
        incomeScalePoints,
        dsrPercent: metrics?.dsr_percent ?? null,
        timingMonthsDiff: metrics?.timing_months_diff ?? null,
      },
      inputs: {
        houseOwnership: inputs.houseOwnership,
        purchasePurpose: inputs.purchasePurpose,
      },
    }),
  }));
}

export function buildGuestConditionCategoryDisplay(params: {
  categories: GuestEvaluationResponse["categories"];
  metrics: GuestEvaluationResponse["metrics"];
  inputs: SharedDisplayInputs;
  isPricePublic: boolean;
}): ConditionValidationCategoryDisplayItem[] {
  const { categories, metrics, inputs, isPricePublic } = params;
  if (!categories) return [];

  const items = [
    { key: "cash", label: "자금력", category: categories.cash },
    { key: "income", label: "소득/부담", category: categories.income },
    { key: "credit", label: "신용", category: categories.credit },
    { key: "ownership", label: "주택 보유", category: categories.ownership },
    { key: "purpose", label: "구매 목적", category: categories.purpose },
  ] as const satisfies ReadonlyArray<{
    key: Extract<ConditionValidationCategoryDisplayItem["key"], "cash" | "income" | "credit" | "ownership" | "purpose">;
    label: string;
    category: NonNullable<GuestEvaluationResponse["categories"]>[keyof NonNullable<GuestEvaluationResponse["categories"]>];
  }>;
  return items.map(({ key, label, category }) => ({
    key,
    label,
    grade: category.grade,
    reason: buildRecommendationCategoryReason({
      key: key as RecommendationReasonCategoryKey,
      grade: category.grade,
      isPricePublic,
      rawReason: category.reason,
      metrics: {
        availableCash: inputs.availableCash,
        contractAmount: metrics?.contract_amount ?? null,
        minCash: metrics?.min_cash ?? null,
        recommendedCash: metrics?.recommended_cash ?? null,
        monthlyPaymentEst: metrics?.monthly_payment_est ?? null,
        monthlyBurdenPercent: metrics?.monthly_burden_percent ?? null,
      },
      inputs: {
        houseOwnership: inputs.houseOwnership,
        purchasePurpose: inputs.purchasePurpose,
      },
    }),
  }));
}
