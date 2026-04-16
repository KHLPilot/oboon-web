import { evaluateFullCondition } from "@/features/condition-validation/domain/fullCustomerEvaluator";
import type {
  FullCustomerInput,
  PropertyValidationProfile,
  UnitTypeValidationProfile,
} from "@/features/condition-validation/domain/types";
import {
  buildScheduleAwareTimingCategory,
  deriveScheduleAwareTimingMonthsDiff,
} from "@/features/condition-validation/lib/timing-satisfaction";
import type { RawRecommendationUnitTypeResult } from "@/features/recommendations/lib/recommendationUnitTypes";

function getCashRule(assetType: PropertyValidationProfile["assetType"]) {
  if (assetType === "apartment") {
    return { minExtraRate: 0.08, recommendedExtraRate: 0.12 };
  }
  if (assetType === "officetel") {
    return { minExtraRate: 0.1, recommendedExtraRate: 0.15 };
  }
  return { minExtraRate: 0.12, recommendedExtraRate: 0.18 };
}

export function calculateCashThresholds(args: {
  assetType: PropertyValidationProfile["assetType"];
  listPrice: number;
  contractRatio: number;
}) {
  const { assetType, listPrice, contractRatio } = args;
  const contractAmount = listPrice * contractRatio;
  const cashRule = getCashRule(assetType);

  return {
    contractAmount,
    minCash: contractAmount + listPrice * cashRule.minExtraRate,
    recommendedCash: contractAmount + listPrice * cashRule.recommendedExtraRate,
  };
}

export function buildRawUnitTypeValidationResults(params: {
  profile: PropertyValidationProfile;
  customer: FullCustomerInput;
  unitProfiles: UnitTypeValidationProfile[];
  timingOverride: ReturnType<typeof buildScheduleAwareTimingCategory>;
  timingMonthsDiff: number | null;
}): RawRecommendationUnitTypeResult[] {
  const { profile, customer, unitProfiles, timingOverride, timingMonthsDiff } = params;

  return unitProfiles.map((unitProfile) => {
    const unitPropertyProfile = {
      ...profile,
      propertyId: unitProfile.propertyId,
      propertyName: profile.propertyName,
      assetType: unitProfile.assetType,
      listPrice: unitProfile.listPriceManwon,
      contractRatio: unitProfile.contractRatio,
      regulationArea: unitProfile.regulationArea,
      transferRestriction: unitProfile.transferRestriction,
      source: "validation_profile" as const,
      matchedPropertyId: profile.matchedPropertyId,
    };
    const unitResult = evaluateFullCondition({
      profile: unitPropertyProfile,
      customer,
      timingOverride,
    });
    const unitCashThresholds = calculateCashThresholds({
      assetType: unitProfile.assetType,
      listPrice: unitProfile.listPriceManwon,
      contractRatio: unitProfile.contractRatio,
    });
    const unitMonthlyBurdenPercent =
      customer.monthlyIncome > 0
        ? Math.round((unitResult.metrics.monthlyPaymentEst / customer.monthlyIncome) * 10000) /
          100
        : null;

    return {
      unit_type_id: unitProfile.unitTypeId,
      unit_type_name: unitProfile.unitTypeName,
      exclusive_area: unitProfile.exclusiveArea,
      list_price_manwon: unitProfile.listPriceManwon,
      is_price_public: unitProfile.isPricePublic,
      final_grade: unitResult.finalGrade,
      total_score: unitResult.totalScore,
      summary_message: unitResult.summaryMessage,
      grade_label: unitResult.gradeLabel,
      metrics: {
        contract_amount: Math.round(unitCashThresholds.contractAmount),
        min_cash: Math.round(unitCashThresholds.minCash),
        recommended_cash: Math.round(unitCashThresholds.recommendedCash),
        loan_amount: Math.round(unitResult.metrics.loanAmount),
        monthly_payment_est: Math.round(unitResult.metrics.monthlyPaymentEst),
        monthly_burden_percent: unitMonthlyBurdenPercent,
        timing_months_diff: timingMonthsDiff,
      },
      categories: {
        cash: {
          grade: unitResult.categories.cash.grade,
          score: unitResult.categories.cash.score,
          max_score: unitResult.categories.cash.maxScore,
          reason: unitResult.categories.cash.reasonMessage,
        },
        income: {
          grade: unitResult.categories.income.grade,
          score: unitResult.categories.income.score,
          max_score: unitResult.categories.income.maxScore,
          reason: unitResult.categories.income.reasonMessage,
        },
        ltv_dsr: {
          grade: unitResult.categories.ltvDsr.grade,
          score: unitResult.categories.ltvDsr.score,
          max_score: unitResult.categories.ltvDsr.maxScore,
          reason: unitResult.categories.ltvDsr.reasonMessage,
        },
        ownership: {
          grade: unitResult.categories.ownership.grade,
          score: unitResult.categories.ownership.score,
          max_score: unitResult.categories.ownership.maxScore,
          reason: unitResult.categories.ownership.reasonMessage,
        },
        purpose: {
          grade: unitResult.categories.purpose.grade,
          score: unitResult.categories.purpose.score,
          max_score: unitResult.categories.purpose.maxScore,
          reason: unitResult.categories.purpose.reasonMessage,
        },
        timing: {
          grade: unitResult.categories.timing.grade,
          score: unitResult.categories.timing.score,
          max_score: unitResult.categories.timing.maxScore,
          reason: unitResult.categories.timing.reasonMessage,
        },
      },
      recommendation_context: {
        available_cash_manwon: customer.availableCash,
        monthly_income_manwon: customer.monthlyIncome,
        house_ownership: customer.houseOwnership,
        purchase_purpose: customer.purchasePurpose,
      },
    };
  });
}

export function buildTimingContext(params: {
  customer: Pick<
    FullCustomerInput,
    "purchaseTiming" | "moveinTiming"
  >;
  timeline:
    | {
        announcementDate: string | null;
        applicationStart: string | null;
        applicationEnd: string | null;
        contractStart: string | null;
        contractEnd: string | null;
        moveInDate: string | null;
      }
    | null;
}) {
  const { customer, timeline } = params;

  const timingOverride = buildScheduleAwareTimingCategory({
    purchaseTiming: customer.purchaseTiming,
    moveinTiming: customer.moveinTiming,
    timeline,
  });
  const timingMonthsDiff = deriveScheduleAwareTimingMonthsDiff({
    purchaseTiming: customer.purchaseTiming,
    moveinTiming: customer.moveinTiming,
    timeline,
  });

  return { timingOverride, timingMonthsDiff };
}
