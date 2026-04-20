import type {
  FinalGrade5,
  FullPurchasePurpose,
} from "@/features/condition-validation/domain/types";

export type RecommendationReasonCategoryKey =
  | "cash"
  | "income"
  | "ltvDsr"
  | "credit"
  | "ownership"
  | "purpose"
  | "timing";

export type RecommendationReasonMetrics = {
  availableCash?: number | null;
  contractAmount?: number | null;
  minCash?: number | null;
  recommendedCash?: number | null;
  cashCoveragePercent?: number | null;
  monthlyPaymentEst?: number | null;
  monthlyBurdenPercent?: number | null;
  monthlySurplus?: number | null;
  incomeStabilityPoints?: number | null;
  incomeRepaymentPoints?: number | null;
  incomeScalePoints?: number | null;
  timingMonthsDiff?: number | null;
  dsrPercent?: number | null;
  ltvDsrPercent?: number | null;
};

export type RecommendationReasonInputs = {
  houseOwnership?: "none" | "one" | "two_or_more" | null;
  purchasePurpose?: FullPurchasePurpose | null;
  purchasePurposeV2?: FullPurchasePurpose | null;
};

export function buildRecommendationCategoryReason(args: {
  key: RecommendationReasonCategoryKey;
  grade: FinalGrade5;
  isPricePublic: boolean;
  metrics?: RecommendationReasonMetrics;
  inputs?: RecommendationReasonInputs;
  rawReason?: string | null;
}): string {
  const rawReason =
    typeof args.rawReason === "string" ? args.rawReason.trim() : null;
  const metrics = args.metrics ?? {};
  const inputs = args.inputs ?? {};

  switch (args.key) {
    case "cash":
      return buildCashReason({
        grade: args.grade,
        isPricePublic: args.isPricePublic,
        availableCash: metrics.availableCash,
        contractAmount: metrics.contractAmount,
        minCash: metrics.minCash,
        recommendedCash: metrics.recommendedCash,
        cashCoveragePercent: metrics.cashCoveragePercent,
        rawReason,
      });
    case "income":
      return buildIncomeReason({
        grade: args.grade,
        monthlyBurdenPercent: metrics.monthlyBurdenPercent,
        monthlyPaymentEst: metrics.monthlyPaymentEst,
        monthlySurplus: metrics.monthlySurplus,
        incomeStabilityPoints: metrics.incomeStabilityPoints,
        incomeRepaymentPoints: metrics.incomeRepaymentPoints,
        incomeScalePoints: metrics.incomeScalePoints,
        rawReason,
      });
    case "ltvDsr":
      return buildLtvDsrReason({
        grade: args.grade,
        monthlyBurdenPercent: metrics.monthlyBurdenPercent,
        dsrPercent: metrics.dsrPercent ?? metrics.ltvDsrPercent,
        rawReason,
      });
    case "credit":
      return buildCreditReason({
        grade: args.grade,
        rawReason,
      });
    case "ownership":
      return buildOwnershipReason({
        grade: args.grade,
        houseOwnership: inputs.houseOwnership,
        rawReason,
      });
    case "purpose":
      if (rawReason) return fallbackReason(rawReason);
      return buildPurposeReason({
        grade: args.grade,
        purchasePurpose: inputs.purchasePurpose ?? inputs.purchasePurposeV2,
        rawReason,
      });
    case "timing":
      return buildTimingReason({
        grade: args.grade,
        timingMonthsDiff: metrics.timingMonthsDiff,
        rawReason,
      });
    default:
      return fallbackReason(rawReason);
  }
}

function fallbackReason(rawReason: string | null | undefined): string {
  return rawReason?.trim() ?? "평가 기준을 확인 중이에요.";
}

function formatManwon(value: number): string {
  return `${Math.round(value).toLocaleString("ko-KR")}만원`;
}

function buildCashReason(args: {
  grade: FinalGrade5;
  isPricePublic: boolean;
  availableCash?: number | null;
  contractAmount?: number | null;
  minCash?: number | null;
  recommendedCash?: number | null;
  cashCoveragePercent?: number | null;
  rawReason?: string | null;
}): string {
  const {
    availableCash,
    contractAmount,
    recommendedCash,
    minCash,
    cashCoveragePercent,
    rawReason,
  } = args;
  const hasEnoughData =
    availableCash != null && recommendedCash != null && minCash != null;
  const coveragePercent =
    cashCoveragePercent != null
      ? Math.round(cashCoveragePercent)
      : availableCash != null && contractAmount != null && contractAmount > 0
        ? Math.round((availableCash / contractAmount) * 100)
        : null;

  const shortage =
    availableCash != null && recommendedCash != null
      ? Math.max(0, recommendedCash - availableCash)
      : null;

  if (!hasEnoughData && coveragePercent != null) {
    if (args.isPricePublic) {
      if (coveragePercent >= 120) {
        return `보유 현금이 계약금의 ${coveragePercent}% 수준이라 계약금과 초기 자금을 감당할 여유가 있어요.`;
      }
      if (coveragePercent >= 100) {
        return `보유 현금이 계약금의 ${coveragePercent}% 수준이라 계약금은 감당 가능한 편이에요.`;
      }
      if (coveragePercent >= 80) {
        return `보유 현금이 계약금의 ${coveragePercent}% 수준이라 계약은 가능하지만 초기 자금 여유는 크지 않아요.`;
      }
      if (coveragePercent >= 60) {
        return `보유 현금이 계약금의 ${coveragePercent}% 수준이라 계약금과 초기 자금이 부족한 편이에요.`;
      }
      return `보유 현금이 계약금의 ${coveragePercent}% 수준이라 계약금과 초기 자금이 많이 부족해요.`;
    }

    if (coveragePercent >= 120) {
      return "계약금과 초기 자금을 감당할 여유가 있어요.";
    }
    if (coveragePercent >= 100) {
      return "계약금은 감당 가능한 편이에요.";
    }
    if (coveragePercent >= 80) {
      return "계약은 가능하지만 초기 자금 여유는 크지 않아요.";
    }
    return "계약금과 초기 자금이 부족해 자금 항목이 보수적으로 반영됐어요.";
  }

  if (args.grade === "GREEN" || args.grade === "LIME") {
    if (!hasEnoughData) return fallbackReason(rawReason);
    return args.isPricePublic
      ? "계약금과 초기 자금을 감당할 여유가 있어요."
      : "계약금과 초기 자금을 감당할 여유가 있어요.";
  }

  if (shortage != null && shortage > 0) {
    if (args.isPricePublic) {
      const base =
        availableCash != null && minCash != null && availableCash >= minCash
          ? "계약은 가능하지만 초기 자금 여유는 크지 않아요."
          : "계약금과 초기 자금이 부족해";
      return `${base} 권장 자금보다 약 ${formatManwon(shortage)} 부족해요.`;
    }

    return availableCash != null && minCash != null && availableCash >= minCash
      ? "계약은 가능하지만 초기 자금 여유는 크지 않아요."
      : "계약금과 초기 자금이 부족해 자금 항목이 보수적으로 반영됐어요.";
  }

  if (args.grade === "YELLOW") {
    if (!hasEnoughData) return fallbackReason(rawReason);
    return args.isPricePublic
      ? "계약은 가능하지만 초기 자금 여유는 크지 않아요."
      : "계약은 가능하지만 초기 자금 여유는 크지 않아요.";
  }

  if (args.grade === "ORANGE" || args.grade === "RED") {
    if (!hasEnoughData) return fallbackReason(rawReason);
    return args.isPricePublic
      ? "계약금과 초기 자금이 부족해 자금 항목이 보수적으로 반영됐어요."
      : "계약금과 초기 자금이 부족해 자금 항목이 보수적으로 반영됐어요.";
  }

  return fallbackReason(rawReason);
}

function buildIncomeReason(args: {
  grade: FinalGrade5;
  monthlyBurdenPercent?: number | null;
  monthlyPaymentEst?: number | null;
  monthlySurplus?: number | null;
  incomeStabilityPoints?: number | null;
  incomeRepaymentPoints?: number | null;
  incomeScalePoints?: number | null;
  rawReason?: string | null;
}): string {
  const {
    monthlyBurdenPercent,
    monthlyPaymentEst,
    monthlySurplus,
    incomeStabilityPoints,
    incomeRepaymentPoints,
    incomeScalePoints,
    rawReason,
  } = args;
  const hasNumericContext =
    monthlyBurdenPercent != null || monthlyPaymentEst != null;

  if (
    incomeStabilityPoints != null ||
    incomeRepaymentPoints != null ||
    incomeScalePoints != null
  ) {
    const repaymentPoints = incomeRepaymentPoints ?? 0;
    const stabilityPoints = incomeStabilityPoints ?? 0;
    const scalePoints = incomeScalePoints ?? 0;

    if (monthlySurplus != null && monthlyPaymentEst != null && monthlyPaymentEst > 0) {
      const isPositiveGrade = args.grade === "GREEN" || args.grade === "LIME";

      if (monthlySurplus >= monthlyPaymentEst * 1.5 && isPositiveGrade) {
        return "월 잉여 자금이 예상 월 상환액을 충분히 웃돌아 소득 항목이 안정적으로 반영됐어요.";
      }
      if (monthlySurplus >= monthlyPaymentEst && isPositiveGrade) {
        return "월 잉여 자금으로 예상 월 상환액을 감당 가능한 수준이라 무난하게 반영됐어요.";
      }
      if (monthlySurplus >= monthlyPaymentEst) {
        return "월 잉여 자금은 예상 월 상환액을 감당 가능한 수준이지만, 소득 안정성과 규모를 함께 반영해 보수적으로 평가했어요.";
      }
      return "월 잉여 자금이 예상 월 상환액에 못 미쳐 소득 항목이 보수적으로 반영됐어요.";
    }

    if (repaymentPoints >= 6 && scalePoints >= 5) {
      return "소득 규모와 상환 여건이 함께 좋아 소득 항목이 안정적으로 반영됐어요.";
    }
    if (stabilityPoints <= 4 && repaymentPoints <= 4) {
      return "소득 안정성과 상환 여건이 함께 보수적으로 반영됐어요.";
    }
    return "고용 안정성, 상환 여력, 소득 규모를 종합해 소득 항목을 반영했어요.";
  }

  if (monthlyBurdenPercent != null) {
    const isPositiveGrade = args.grade === "GREEN" || args.grade === "LIME";

    if (monthlyBurdenPercent <= 30) {
      if (isPositiveGrade) {
        return `예상 월 부담이 월소득의 ${Math.round(monthlyBurdenPercent)}% 수준이라 안정적으로 반영됐어요.`;
      }

      return `예상 월 부담은 월소득의 ${Math.round(monthlyBurdenPercent)}% 수준으로 낮지만, 소득 안정성과 다른 조건을 함께 반영해 보수적으로 평가했어요.`;
    }

    return `예상 월 부담이 월소득의 ${Math.round(monthlyBurdenPercent)}% 수준이라 상환 부담이 다소 높은 편으로 반영됐어요.`;
  }

  if (monthlyPaymentEst != null) {
    return "예상 월 부담은 계산됐지만 소득 대비 비중을 확인하기 어려워 보수적으로 반영됐어요.";
  }

  if (!hasNumericContext) {
    return fallbackReason(rawReason);
  }

  if (args.grade === "GREEN" || args.grade === "LIME") {
    return "소득과 상환 여건이 전반적으로 무난하게 반영됐어요.";
  }

  if (args.grade === "YELLOW" || args.grade === "ORANGE" || args.grade === "RED") {
    return "소득 대비 상환 부담이 커서 해당 항목이 보수적으로 반영됐어요.";
  }

  return fallbackReason(rawReason);
}

function buildLtvDsrReason(args: {
  grade: FinalGrade5;
  monthlyBurdenPercent?: number | null;
  dsrPercent?: number | null;
  rawReason?: string | null;
}): string {
  const { dsrPercent, monthlyBurdenPercent, rawReason } = args;
  const numericPercent = dsrPercent ?? monthlyBurdenPercent;
  const isPositiveGrade = args.grade === "GREEN" || args.grade === "LIME";

  if (numericPercent != null) {
    if (numericPercent <= 40) {
      if (isPositiveGrade) {
        return `현재 조건에서는 대출 가능성과 상환 부담이 무난한 편이에요.`;
      }

      return `예상 상환 부담은 ${Math.round(numericPercent)}% 수준이지만, 다른 대출 조건을 함께 반영해 보수적으로 평가했어요.`;
    }

    return `예상 상환 부담이 ${Math.round(numericPercent)}% 수준으로 높아 대출 여건이 까다롭게 반영됐어요.`;
  }

  if (rawReason) return fallbackReason(rawReason);

  if (args.grade === "GREEN" || args.grade === "LIME") {
    return "현재 조건에서는 대출 가능성과 상환 부담이 무난한 편이에요.";
  }

  if (args.grade === "YELLOW" || args.grade === "ORANGE" || args.grade === "RED") {
    return "소득이나 기존 대출 부담 때문에 대출 여건이 까다롭게 반영됐어요.";
  }

  return fallbackReason(rawReason);
}

function buildCreditReason(args: {
  grade: FinalGrade5;
  rawReason?: string | null;
}): string {
  if (args.rawReason) return fallbackReason(args.rawReason);

  if (args.grade === "GREEN" || args.grade === "LIME") {
    return "현재 신용 상태가 양호해 대출 관련 평가에 유리하게 반영됐어요.";
  }

  if (args.grade === "YELLOW" || args.grade === "ORANGE" || args.grade === "RED") {
    return "신용 조건이 다소 불리해 대출 관련 평가는 보수적으로 반영됐어요.";
  }

  return fallbackReason(args.rawReason);
}

function buildOwnershipReason(args: {
  grade: FinalGrade5;
  houseOwnership?: "none" | "one" | "two_or_more" | null;
  rawReason?: string | null;
}): string {
  switch (args.houseOwnership) {
    case "none":
      return "무주택 조건이라 현재 추천 기준에서 유리하게 반영됐어요.";
    case "one":
      return "1주택 조건이라 일부 기준에서 보수적으로 반영됐어요.";
    case "two_or_more":
      return "기존 주택 보유 수가 있어 해당 항목 평가는 낮아졌어요.";
    default:
      if (args.rawReason) return fallbackReason(args.rawReason);
      if (args.grade === "GREEN" || args.grade === "LIME") {
        return "주택 보유 조건이 전반적으로 무난하게 반영됐어요.";
      }
      return fallbackReason(args.rawReason);
  }
}

function buildPurposeReason(args: {
  grade: FinalGrade5;
  purchasePurpose?: FullPurchasePurpose | null;
  rawReason?: string | null;
}): string {
  switch (args.purchasePurpose) {
    case "residence":
      return "실거주 목적이라 현재 추천 기준과 잘 맞는 편으로 반영됐어요.";
    case "long_term":
      return "장기 보유 목적이라 실거주와 투자 성향이 함께 반영됐어요.";
    case "investment_rent":
    case "investment_capital":
      return "투자 목적 비중이 커서 해당 항목 평가는 상대적으로 낮아졌어요.";
    default:
      if (args.rawReason) return fallbackReason(args.rawReason);
      if (args.grade === "GREEN" || args.grade === "LIME") {
        return "구매 목적이 전반적으로 무난하게 반영됐어요.";
      }
      return fallbackReason(args.rawReason);
  }
}

function buildTimingReason(args: {
  grade: FinalGrade5;
  timingMonthsDiff?: number | null;
  rawReason?: string | null;
}): string {
  if (args.timingMonthsDiff != null) {
    const months = Math.abs(Math.round(args.timingMonthsDiff));
    if (months <= 1) {
      return "희망 시점과 실제 일정 차이가 크지 않아 무난하게 반영됐어요.";
    }
    return `희망 시점과 실제 일정 차이가 약 ${months}개월 있어 시점 적합도가 낮아졌어요.`;
  }

  if (typeof args.rawReason === "string" && args.rawReason.trim()) {
    const segments = args.rawReason
      .split("·")
      .map((segment) => segment.trim())
      .filter(Boolean);
    const requestedSegments = segments.filter((segment) => segment.startsWith("희망 "));
    const actualSegments = segments.filter((segment) => segment.startsWith("실제 "));
    const requested = requestedSegments[0]?.replace(/^희망\s+/, "") ?? null;
    const actual = actualSegments[0]?.replace(/^실제\s+/, "") ?? null;

    if (requested && actual) {
      if (requested === actual) {
        return "희망 시점과 실제 일정이 비슷해 전반적으로 무난하게 반영됐어요.";
      }

      return `희망 시점은 ${requested}인데 실제 일정은 ${actual}로 잡혀 시점 적합도가 보수적으로 반영됐어요.`;
    }
  }

  if (args.grade === "GREEN" || args.grade === "LIME") {
    return "희망 시점과 실제 일정이 전반적으로 무난하게 맞춰졌어요.";
  }

  if (args.grade === "YELLOW" || args.grade === "ORANGE" || args.grade === "RED") {
    return "희망 시점과 실제 일정 차이가 있어 시점 적합도가 보수적으로 반영됐어요.";
  }

  return fallbackReason(args.rawReason);
}
