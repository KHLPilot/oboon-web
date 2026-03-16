import type {
  ActionCode,
  CategoryResult,
  ConditionCustomerInput,
  ConditionEvaluationResult,
  FinalGrade,
  PropertyValidationProfile,
  ReasonCode,
  ValidationAssetType,
} from "@/features/condition-validation/domain/types";

const INTEREST_RATE_BY_CREDIT = {
  good: 0.048,
  normal: 0.052,
  unstable: 0.06,
} as const;

const REASON_MESSAGES: Record<ReasonCode, string> = {
  CASH_BELOW_MIN: "최소 필요 현금 미달",
  CASH_BETWEEN_MIN_AND_RECOMMENDED: "최소~권장 구간",
  CASH_ABOVE_RECOMMENDED: "권장 현금 이상",
  BURDEN_INCOME_ZERO: "월 소득이 0이라 부담률 계산이 불가합니다.",
  BURDEN_WARNING_40_TO_50: "월 부담이 40~50% 구간입니다.",
  BURDEN_HIGH_OVER_50: "월 부담이 50%를 초과합니다.",
  RISK_MULTI_HOME_REGULATED: "다주택 + 규제지역 리스크가 있습니다.",
  RISK_CREDIT_UNSTABLE: "신용 상태 리스크가 있습니다.",
  RISK_INVESTMENT_TRANSFER_LIMITED: "투자 목적 + 전매 제한 리스크가 있습니다.",
};

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function mapAction(grade: FinalGrade): ActionCode {
  if (grade === "GREEN") return "VISIT_BOOKING";
  if (grade === "YELLOW") return "PRE_VISIT_CONSULT";
  return "RECOMMEND_ALTERNATIVE_AND_CONSULT";
}

function getCashRule(assetType: ValidationAssetType): {
  minExtraRate: number;
  recommendedExtraRate: number;
} {
  if (assetType === "apartment") {
    return { minExtraRate: 0.08, recommendedExtraRate: 0.12 };
  }
  if (assetType === "officetel") {
    return { minExtraRate: 0.1, recommendedExtraRate: 0.15 };
  }
  return { minExtraRate: 0.12, recommendedExtraRate: 0.18 };
}

function getLoanRatio(assetType: ValidationAssetType, listPrice: number): number {
  if (assetType === "apartment") {
    return listPrice <= 90000 ? 0.55 : 0.45;
  }
  if (assetType === "officetel") {
    return 0.45;
  }
  return 0.4;
}

function buildSummaryMessage(grade: FinalGrade, reasons: ReasonCode[]): string {
  if (reasons.includes("CASH_BELOW_MIN")) {
    return "최소 필요 현금 미달";
  }
  if (reasons.includes("BURDEN_INCOME_ZERO")) {
    return "월 소득이 0이라 부담률 계산이 불가합니다.";
  }
  if (reasons.includes("BURDEN_HIGH_OVER_50")) {
    return "월 부담이 과도합니다";
  }
  if (grade === "GREEN") {
    return "진행 가능 조건";
  }
  if (grade === "YELLOW") {
    return "상담 후 진행 권장";
  }
  return "대안 상담이 필요합니다";
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function scoreCash(params: {
  availableCash: number;
  minCash: number;
  recommendedCash: number;
  grade: FinalGrade;
}): CategoryResult {
  const { availableCash, minCash, recommendedCash, grade } = params;

  let score = 0;
  const premiumCash = recommendedCash * 1.3;
  if (availableCash >= premiumCash) {
    score = 40;
  } else if (availableCash >= recommendedCash) {
    const progress = premiumCash === recommendedCash
      ? 1
      : (availableCash - recommendedCash) / (premiumCash - recommendedCash);
    score = 34 + progress * 6;
  } else if (availableCash >= minCash) {
    const progress = recommendedCash <= minCash
      ? 1
      : (availableCash - minCash) / (recommendedCash - minCash);
    score = 28 + progress * 6;
  } else {
    const progress = minCash <= 0 ? 0 : availableCash / minCash;
    score = clamp(progress * 27, 0, 27);
  }

  return {
    grade,
    score: round2(score),
    maxScore: 40,
  };
}

function scoreBurden(params: {
  monthlyBurdenRatio: number | null;
  grade: FinalGrade;
}): CategoryResult {
  const { monthlyBurdenRatio, grade } = params;

  if (monthlyBurdenRatio === null) {
    return {
      grade,
      score: 0,
      maxScore: 35,
    };
  }

  let score = 0;
  if (monthlyBurdenRatio < 0.2) {
    score = 35;
  } else if (monthlyBurdenRatio < 0.3) {
    const progress = (monthlyBurdenRatio - 0.2) / 0.1;
    score = 35 - progress * 6;
  } else if (monthlyBurdenRatio <= 0.4) {
    const progress = (monthlyBurdenRatio - 0.3) / 0.1;
    score = 29 - progress * 8;
  } else if (monthlyBurdenRatio <= 0.5) {
    const progress = (monthlyBurdenRatio - 0.4) / 0.1;
    score = 21 - progress * 11;
  } else {
    const progress = clamp((monthlyBurdenRatio - 0.5) / 0.5, 0, 1);
    score = 10 - progress * 10;
  }

  return {
    grade,
    score: round2(score),
    maxScore: 35,
  };
}

function scoreRisk(reasonCodes: Array<
  | "RISK_MULTI_HOME_REGULATED"
  | "RISK_CREDIT_UNSTABLE"
  | "RISK_INVESTMENT_TRANSFER_LIMITED"
>): CategoryResult {
  let score = 25;

  for (const code of reasonCodes) {
    if (code === "RISK_INVESTMENT_TRANSFER_LIMITED") {
      score -= 5;
      continue;
    }
    score -= 10;
  }

  score = clamp(score, 0, 25);

  let grade: FinalGrade = "GREEN";
  if (score < 15) {
    grade = "RED";
  } else if (score < 25) {
    grade = "YELLOW";
  }

  return {
    grade,
    score: round2(score),
    maxScore: 25,
  };
}

function gradeFromTotalScore(totalScore: number): FinalGrade {
  if (totalScore >= 80) return "GREEN";
  if (totalScore >= 50) return "YELLOW";
  return "RED";
}

export function evaluateCondition(params: {
  profile: PropertyValidationProfile;
  customer: ConditionCustomerInput;
}): ConditionEvaluationResult {
  const { profile, customer } = params;
  const reasonSet = new Set<ReasonCode>();

  const contractAmount = profile.listPrice * profile.contractRatio;
  const cashRule = getCashRule(profile.assetType);
  const minCash = contractAmount + profile.listPrice * cashRule.minExtraRate;
  const recommendedCash =
    contractAmount + profile.listPrice * cashRule.recommendedExtraRate;

  const loanRatio = getLoanRatio(profile.assetType, profile.listPrice);
  const interestRate = INTEREST_RATE_BY_CREDIT[customer.creditGrade];
  const loanAmount = profile.listPrice * loanRatio;
  const monthlyPaymentEst = loanAmount * (interestRate / 12) * 1.3;
  const monthlyBurdenRatio =
    customer.monthlyIncome === 0 ? null : monthlyPaymentEst / customer.monthlyIncome;

  let step1CashGrade: FinalGrade;
  let step1CashReasonCode:
    | "CASH_BELOW_MIN"
    | "CASH_BETWEEN_MIN_AND_RECOMMENDED"
    | "CASH_ABOVE_RECOMMENDED";

  if (customer.availableCash >= recommendedCash) {
    step1CashGrade = "GREEN";
    step1CashReasonCode = "CASH_ABOVE_RECOMMENDED";
  } else if (customer.availableCash >= minCash) {
    step1CashGrade = "YELLOW";
    step1CashReasonCode = "CASH_BETWEEN_MIN_AND_RECOMMENDED";
  } else {
    step1CashGrade = "RED";
    step1CashReasonCode = "CASH_BELOW_MIN";
  }
  reasonSet.add(step1CashReasonCode);

  let step2BurdenGrade: FinalGrade = "GREEN";
  let step2BurdenReasonCode:
    | "BURDEN_INCOME_ZERO"
    | "BURDEN_WARNING_40_TO_50"
    | "BURDEN_HIGH_OVER_50"
    | null = null;
  if (monthlyBurdenRatio === null) {
    step2BurdenReasonCode = "BURDEN_INCOME_ZERO";
    step2BurdenGrade = "RED";
  } else if (monthlyBurdenRatio > 0.5) {
    step2BurdenReasonCode = "BURDEN_HIGH_OVER_50";
    step2BurdenGrade = "RED";
  } else if (monthlyBurdenRatio > 0.4) {
    step2BurdenReasonCode = "BURDEN_WARNING_40_TO_50";
    step2BurdenGrade = "YELLOW";
  } else {
    step2BurdenGrade = "GREEN";
  }
  if (step2BurdenReasonCode) {
    reasonSet.add(step2BurdenReasonCode);
  }

  const step3RiskReasonCodes: Array<
    | "RISK_MULTI_HOME_REGULATED"
    | "RISK_CREDIT_UNSTABLE"
    | "RISK_INVESTMENT_TRANSFER_LIMITED"
  > = [];
  if (
    customer.ownedHouseCount >= 2 &&
    profile.regulationArea !== "non_regulated"
  ) {
    step3RiskReasonCodes.push("RISK_MULTI_HOME_REGULATED");
  }
  if (customer.creditGrade === "unstable") {
    step3RiskReasonCodes.push("RISK_CREDIT_UNSTABLE");
  }
  if (customer.purchasePurpose === "investment" && profile.transferRestriction) {
    step3RiskReasonCodes.push("RISK_INVESTMENT_TRANSFER_LIMITED");
  }

  for (const reason of step3RiskReasonCodes) {
    reasonSet.add(reason);
  }
  const cashCategory = scoreCash({
    availableCash: customer.availableCash,
    minCash,
    recommendedCash,
    grade: step1CashGrade,
  });
  const burdenCategory = scoreBurden({
    monthlyBurdenRatio,
    grade: step2BurdenGrade,
  });
  const riskCategory = scoreRisk(step3RiskReasonCodes);
  const step3RiskGrade = riskCategory.grade;
  const totalScore = round2(
    cashCategory.score + burdenCategory.score + riskCategory.score,
  );
  const grade = gradeFromTotalScore(totalScore);
  const action = mapAction(grade);
  const reasonOrder: ReasonCode[] = [
    "CASH_BELOW_MIN",
    "CASH_BETWEEN_MIN_AND_RECOMMENDED",
    "CASH_ABOVE_RECOMMENDED",
    "BURDEN_INCOME_ZERO",
    "BURDEN_HIGH_OVER_50",
    "BURDEN_WARNING_40_TO_50",
    "RISK_MULTI_HOME_REGULATED",
    "RISK_CREDIT_UNSTABLE",
    "RISK_INVESTMENT_TRANSFER_LIMITED",
  ];
  const orderedReasons = reasonOrder.filter((reason) => reasonSet.has(reason));
  const reasonMessages = orderedReasons.map((reason) => REASON_MESSAGES[reason]);

  return {
    finalGrade: grade,
    totalScore,
    maxScore: 100,
    action,
    reasonCodes: orderedReasons,
    reasonMessages,
    summaryMessage: buildSummaryMessage(grade, orderedReasons),
    warnings: [],
    metrics: {
      listPrice: round2(profile.listPrice),
      contractAmount: round2(contractAmount),
      minCash: round2(minCash),
      recommendedCash: round2(recommendedCash),
      loanRatio: round2(loanRatio),
      loanAmount: round2(loanAmount),
      interestRate: round2(interestRate),
      monthlyPaymentEst: round2(monthlyPaymentEst),
      monthlyBurdenRatio:
        monthlyBurdenRatio === null ? null : round2(monthlyBurdenRatio),
      monthlyBurdenPercent:
        monthlyBurdenRatio === null ? null : round2(monthlyBurdenRatio * 100),
    },
    trace: {
      step1CashGrade,
      step1CashReasonCode,
      step2BurdenGrade,
      step2BurdenReasonCode,
      step3RiskGrade,
      step3RiskReasonCodes,
    },
    categories: {
      cash: cashCategory,
      burden: burdenCategory,
      risk: riskCategory,
    },
  };
}

export function reasonMessageByCode(code: ReasonCode): string {
  return REASON_MESSAGES[code];
}
