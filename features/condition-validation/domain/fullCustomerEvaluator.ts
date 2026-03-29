import type {
  EmploymentType,
  FullCustomerInput,
  FullEvaluationCategoryResult,
  FullEvaluationResult,
  FullPurchasePurpose,
  FinalGrade5,
  MonthlyLoanRepayment,
  MoveinTiming,
  PropertyValidationProfile,
  PurchaseTiming,
  ValidationAssetType,
} from "./types";
import { grade5DetailLabel } from "@/features/condition-validation/lib/grade5Labels";
import {
  ltvScoreToPoints,
  repaymentRangeToMidpoint,
  employmentIncomeMultiplier,
} from "./ltvDsrCalculator";

function getLoanRatio(assetType: ValidationAssetType, listPrice: number): number {
  if (assetType === "apartment") return listPrice <= 90000 ? 0.55 : 0.45;
  if (assetType === "officetel") return 0.45;
  return 0.4;
}

function totalScoreToGrade5(score: number): FinalGrade5 {
  if (score >= 80) return "GREEN";
  if (score >= 60) return "LIME";
  if (score >= 40) return "YELLOW";
  if (score >= 20) return "ORANGE";
  return "RED";
}

function categoryGrade5(score: number, maxScore: number): FinalGrade5 {
  const pct = score / maxScore;
  if (pct >= 0.8) return "GREEN";
  if (pct >= 0.6) return "LIME";
  if (pct >= 0.4) return "YELLOW";
  if (pct >= 0.2) return "ORANGE";
  return "RED";
}

function grade5Label(grade: FinalGrade5): string {
  return grade5DetailLabel(grade);
}

function cashCategory(
  availableCash: number,
  contractAmount: number,
): FullEvaluationCategoryResult {
  if (contractAmount <= 0) {
    return {
      grade: "YELLOW",
      score: 15,
      maxScore: 30,
      reasonMessage: "계약금 정보를 확인 중입니다.",
    };
  }
  const ratio = availableCash / contractAmount;
  const pct = Math.round(ratio * 100);
  let score: number;
  let msg: string;
  if (ratio >= 1.2) {
    score = 30;
    msg = `계약금의 ${pct}% — 충분한 현금 보유`;
  } else if (ratio >= 1.0) {
    score = 27;
    msg = `계약금의 ${pct}% — 양호`;
  } else if (ratio >= 0.8) {
    score = 20;
    msg = `계약금의 ${pct}% — 보통`;
  } else if (ratio >= 0.6) {
    score = 10;
    msg = `계약금의 ${pct}% — 부족`;
  } else {
    score = 5;
    msg = `계약금의 ${pct}% — 매우 부족`;
  }
  return { grade: categoryGrade5(score, 30), score, maxScore: 30, reasonMessage: msg };
}

function incomeCategory(params: {
  employmentType: EmploymentType;
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlyPaymentEst: number;
}): FullEvaluationCategoryResult {
  const { employmentType, monthlyIncome, monthlyExpenses, monthlyPaymentEst } = params;

  const stability =
    employmentType === "employee"
      ? 8
      : employmentType === "self_employed"
        ? 6
        : employmentType === "freelancer"
          ? 4
          : 3;

  const monthlySurplus = monthlyIncome - monthlyExpenses;
  let repayment = 2;
  if (monthlyPaymentEst > 0) {
    const r = monthlySurplus / monthlyPaymentEst;
    if (r >= 1.5) repayment = 8;
    else if (r >= 1.2) repayment = 6;
    else if (r >= 1.0) repayment = 4;
    else repayment = 2;
  }

  let scale = 1;
  if (monthlyPaymentEst > 0) {
    if (monthlyIncome > monthlyPaymentEst * 4) scale = 7;
    else if (monthlyIncome > monthlyPaymentEst * 2) scale = 5;
    else if (monthlyIncome > monthlyPaymentEst) scale = 3;
    else scale = 1;
  }

  const score = stability + repayment + scale;
  const msg = `안정성 ${stability}/8 · 상환여력 ${repayment}/8 · 소득규모 ${scale}/7`;
  return { grade: categoryGrade5(score, 25), score, maxScore: 25, reasonMessage: msg };
}

function ltvDsrCategory(params: {
  ltvInternalScore: number;
  existingMonthlyRepayment: MonthlyLoanRepayment;
  monthlyIncome: number;
  monthlyExpenses: number;
  employmentType: EmploymentType;
  monthlyPaymentEst: number;
}): {
  category: FullEvaluationCategoryResult;
  dsrPercent: number | null;
  dsrPoints: number;
  ltvPoints: number;
  isDowngraded: boolean;
} {
  const {
    ltvInternalScore,
    existingMonthlyRepayment,
    monthlyIncome,
    monthlyExpenses,
    employmentType,
    monthlyPaymentEst,
  } = params;

  const { points: ltvPoints } = ltvScoreToPoints(ltvInternalScore);

  const adjustedIncome = monthlyIncome * employmentIncomeMultiplier(employmentType);
  const existingRepayment = repaymentRangeToMidpoint(existingMonthlyRepayment);

  let dsrPercent: number | null = null;
  let dsrPoints = 2;
  let isDowngraded = false;

  if (adjustedIncome > 0) {
    const totalRepayment = existingRepayment + monthlyPaymentEst;
    dsrPercent = (totalRepayment / adjustedIncome) * 100;

    if (dsrPercent <= 30) dsrPoints = 10;
    else if (dsrPercent <= 40) dsrPoints = 8;
    else if (dsrPercent <= 50) dsrPoints = 5;
    else dsrPoints = 2;

    // Downgrade if monthly payment > monthly surplus
    const monthlySurplus = monthlyIncome - monthlyExpenses;
    if (monthlyPaymentEst > monthlySurplus && dsrPoints > 2) {
      dsrPoints = Math.max(2, dsrPoints - 3);
      isDowngraded = true;
    }
  }

  const score = ltvPoints + dsrPoints;
  const dsrStr =
    dsrPercent !== null ? `DSR ${Math.round(dsrPercent)}%(${dsrPoints}/10)` : "DSR 계산불가";
  const downgradedStr = isDowngraded ? " (하향조정)" : "";
  const msg = `LTV ${ltvPoints}/10 · ${dsrStr}${downgradedStr}`;

  return {
    category: { grade: categoryGrade5(score, 20), score, maxScore: 20, reasonMessage: msg },
    dsrPercent,
    dsrPoints,
    ltvPoints,
    isDowngraded,
  };
}

function ownershipCategory(
  houseOwnership: "none" | "one" | "two_or_more",
): FullEvaluationCategoryResult {
  const map = {
    none: { score: 10, msg: "무주택" },
    one: { score: 7, msg: "1주택" },
    two_or_more: { score: 3, msg: "2주택 이상" },
  };
  const { score, msg } = map[houseOwnership];
  return { grade: categoryGrade5(score, 10), score, maxScore: 10, reasonMessage: msg };
}

function purposeCategory(purpose: FullPurchasePurpose): FullEvaluationCategoryResult {
  const map: Record<FullPurchasePurpose, { score: number; msg: string }> = {
    residence: { score: 5, msg: "실거주" },
    long_term: { score: 4, msg: "장기보유(실거주+투자)" },
    investment_rent: { score: 3, msg: "투자(임대수익)" },
    investment_capital: { score: 2, msg: "투자(시세차익)" },
  };
  const { score, msg } = map[purpose];
  return { grade: categoryGrade5(score, 5), score, maxScore: 5, reasonMessage: msg };
}

function timingCategory(
  purchaseTiming: PurchaseTiming,
  moveinTiming: MoveinTiming,
): FullEvaluationCategoryResult {
  const purchaseMap: Record<PurchaseTiming, number> = {
    by_property: 5,
    over_1year: 4,
    within_1year: 3,
    within_6months: 2,
    within_3months: 1,
  };
  const moveinMap: Record<MoveinTiming, number> = {
    anytime: 5,
    within_3years: 4,
    within_2years: 3,
    within_1year: 2,
    immediate: 1,
  };
  const pp = purchaseMap[purchaseTiming];
  const mp = moveinMap[moveinTiming];
  const score = pp + mp;
  return {
    grade: categoryGrade5(score, 10),
    score,
    maxScore: 10,
    reasonMessage: `분양시점 ${pp}/5 · 입주시점 ${mp}/5`,
  };
}

function buildSummary(grade: FinalGrade5, score: number): string {
  return `${Math.round(score)}점 — ${grade5Label(grade)}`;
}

export function evaluateFullCondition(params: {
  profile: PropertyValidationProfile;
  customer: FullCustomerInput;
}): FullEvaluationResult {
  const { profile, customer } = params;

  const contractAmount = profile.listPrice * profile.contractRatio;
  const loanRatio = getLoanRatio(profile.assetType, profile.listPrice);
  const loanAmount = profile.listPrice * loanRatio;
  const monthlyPaymentEst = loanAmount * 0.005;

  const cash = cashCategory(customer.availableCash, contractAmount);
  const income = incomeCategory({
    employmentType: customer.employmentType,
    monthlyIncome: customer.monthlyIncome,
    monthlyExpenses: customer.monthlyExpenses,
    monthlyPaymentEst,
  });
  const ltvDsr = ltvDsrCategory({
    ltvInternalScore: customer.ltvInternalScore,
    existingMonthlyRepayment: customer.existingMonthlyRepayment,
    monthlyIncome: customer.monthlyIncome,
    monthlyExpenses: customer.monthlyExpenses,
    employmentType: customer.employmentType,
    monthlyPaymentEst,
  });
  const ownership = ownershipCategory(customer.houseOwnership);
  const purpose = purposeCategory(customer.purchasePurpose);
  const timing = timingCategory(customer.purchaseTiming, customer.moveinTiming);

  const totalScore =
    cash.score +
    income.score +
    ltvDsr.category.score +
    ownership.score +
    purpose.score +
    timing.score;

  const finalGrade = totalScoreToGrade5(totalScore);

  return {
    finalGrade,
    totalScore,
    maxScore: 100,
    summaryMessage: buildSummary(finalGrade, totalScore),
    gradeLabel: grade5Label(finalGrade),
    categories: {
      cash,
      income,
      ltvDsr: ltvDsr.category,
      ownership,
      purpose,
      timing,
    },
    metrics: {
      contractAmount,
      loanAmount,
      monthlyPaymentEst,
      monthlySurplus: customer.monthlyIncome - customer.monthlyExpenses,
      dsrPercent: ltvDsr.dsrPercent,
      dsrPoints: ltvDsr.dsrPoints,
      ltvPoints: ltvDsr.ltvPoints,
    },
  };
}
