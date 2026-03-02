import type {
  ActionCode,
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

function downgrade(grade: FinalGrade): FinalGrade {
  if (grade === "GREEN") return "YELLOW";
  if (grade === "YELLOW") return "RED";
  return "RED";
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
  const monthlyBurdenRatio = monthlyPaymentEst / customer.monthlyIncome;

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

  let grade: FinalGrade = step1CashGrade;

  let step2BurdenGrade: FinalGrade = "GREEN";
  let step2BurdenReasonCode: "BURDEN_WARNING_40_TO_50" | "BURDEN_HIGH_OVER_50" | null =
    null;
  if (monthlyBurdenRatio > 0.5) {
    step2BurdenReasonCode = "BURDEN_HIGH_OVER_50";
    step2BurdenGrade = "RED";
    grade = "RED";
  } else if (monthlyBurdenRatio > 0.4) {
    step2BurdenReasonCode = "BURDEN_WARNING_40_TO_50";
    step2BurdenGrade = "YELLOW";
    grade = downgrade(grade);
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

  const step3RiskGrade: FinalGrade =
    step3RiskReasonCodes.length > 0 ? "YELLOW" : "GREEN";

  if (step3RiskReasonCodes.length > 0) {
    grade = downgrade(grade);
  }
  const action = mapAction(grade);
  // 고정 우선순위로 reason 순서를 맞춘다.
  const reasonOrder: ReasonCode[] = [
    "CASH_BELOW_MIN",
    "CASH_BETWEEN_MIN_AND_RECOMMENDED",
    "CASH_ABOVE_RECOMMENDED",
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
      monthlyBurdenRatio: round2(monthlyBurdenRatio),
      monthlyBurdenPercent: round2(monthlyBurdenRatio * 100),
    },
    trace: {
      step1CashGrade,
      step1CashReasonCode,
      step2BurdenGrade,
      step2BurdenReasonCode,
      step3RiskGrade,
      step3RiskReasonCodes,
    },
  };
}

export function reasonMessageByCode(code: ReasonCode): string {
  return REASON_MESSAGES[code];
}
