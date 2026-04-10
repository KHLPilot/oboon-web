import type {
  CreditGrade,
  FinalGrade5,
  GuestCustomerInput,
  GuestEvaluationCategoryResult,
  GuestEvaluationResult,
  PropertyValidationProfile,
  ValidationAssetType,
} from "./types";
import { grade5DetailLabel } from "@/features/condition-validation/lib/grade5Labels";
import { scorePurposeMatch } from "./purposeMatchScoring";

// ─── 상수 ──────────────────────────────────────────────────────────────────────

const INTEREST_RATE_BY_CREDIT: Record<CreditGrade, number> = {
  good: 0.048,
  normal: 0.052,
  unstable: 0.06,
};

// ─── 내부 유틸 ─────────────────────────────────────────────────────────────────

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
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

function getCashRule(assetType: ValidationAssetType): {
  minExtraRate: number;
  recommendedExtraRate: number;
} {
  if (assetType === "apartment") return { minExtraRate: 0.08, recommendedExtraRate: 0.12 };
  if (assetType === "officetel") return { minExtraRate: 0.1, recommendedExtraRate: 0.15 };
  return { minExtraRate: 0.12, recommendedExtraRate: 0.18 };
}

function getLoanRatio(assetType: ValidationAssetType, listPrice: number): number {
  if (assetType === "apartment") return listPrice <= 90000 ? 0.55 : 0.45;
  if (assetType === "officetel") return 0.45;
  return 0.4;
}

// ─── 카테고리 채점 ──────────────────────────────────────────────────────────────

/** 현금 35점: minCash / recommendedCash 기준 비율 채점 */
function cashCategory(
  availableCash: number,
  minCash: number,
  recommendedCash: number,
): GuestEvaluationCategoryResult {
  const premium = recommendedCash * 1.3;
  let score: number;
  let msg: string;

  if (availableCash >= premium) {
    score = 35;
    msg = "권장 현금 130% 이상 — 충분";
  } else if (availableCash >= recommendedCash) {
    const progress =
      premium === recommendedCash
        ? 1
        : (availableCash - recommendedCash) / (premium - recommendedCash);
    score = 30 + progress * 5;
    msg = "권장 현금 이상";
  } else if (availableCash >= minCash) {
    const progress =
      recommendedCash <= minCash
        ? 1
        : (availableCash - minCash) / (recommendedCash - minCash);
    score = 22 + progress * 8;
    msg = "최소~권장 구간";
  } else {
    score = clamp(minCash <= 0 ? 0 : (availableCash / minCash) * 21, 0, 21);
    msg = "최소 현금 미달";
  }

  return {
    grade: categoryGrade5(score, 35),
    score: Math.round(score),
    maxScore: 35,
    reasonMessage: msg,
  };
}

/** 소득/부담률 30점: 신용등급별 이자율로 월납입 추정 후 부담률 채점 */
function incomeCategory(
  monthlyIncome: number,
  loanAmount: number,
  creditGrade: CreditGrade,
): GuestEvaluationCategoryResult {
  if (monthlyIncome <= 0) {
    return {
      grade: "RED",
      score: 0,
      maxScore: 30,
      reasonMessage: "소득 정보 없음",
    };
  }

  const interestRate = INTEREST_RATE_BY_CREDIT[creditGrade];
  const monthlyPayment = loanAmount * (interestRate / 12) * 1.3;
  const burdenRatio = monthlyPayment / monthlyIncome;
  const pct = Math.round(burdenRatio * 100);

  let score: number;
  let msg: string;

  if (burdenRatio < 0.2) {
    score = 30;
    msg = `월 부담 ${pct}% — 양호`;
  } else if (burdenRatio < 0.3) {
    const progress = (burdenRatio - 0.2) / 0.1;
    score = 30 - progress * 6;
    msg = `월 부담 ${pct}%`;
  } else if (burdenRatio <= 0.4) {
    const progress = (burdenRatio - 0.3) / 0.1;
    score = 24 - progress * 8;
    msg = `월 부담 ${pct}%`;
  } else if (burdenRatio <= 0.5) {
    const progress = (burdenRatio - 0.4) / 0.1;
    score = 16 - progress * 11;
    msg = `월 부담 ${pct}% — 주의`;
  } else {
    const progress = clamp((burdenRatio - 0.5) / 0.5, 0, 1);
    score = 5 - progress * 5;
    msg = `월 부담 ${pct}% — 과다`;
  }

  return {
    grade: categoryGrade5(score, 30),
    score: Math.round(clamp(score, 0, 30)),
    maxScore: 30,
    reasonMessage: msg,
  };
}

/** 신용 15점: 양호(15) / 보통(9) / 불안정(3) */
function creditCategory(creditGrade: CreditGrade): GuestEvaluationCategoryResult {
  const map: Record<CreditGrade, { score: number; msg: string }> = {
    good: { score: 15, msg: "신용 양호" },
    normal: { score: 9, msg: "신용 보통" },
    unstable: { score: 3, msg: "신용 불안정" },
  };
  const { score, msg } = map[creditGrade];
  return { grade: categoryGrade5(score, 15), score, maxScore: 15, reasonMessage: msg };
}

/** 주택소유 12점: 무주택(12) / 1주택(8) / 2주택+(3) */
function ownershipCategory(
  houseOwnership: "none" | "one" | "two_or_more",
): GuestEvaluationCategoryResult {
  const map = {
    none: { score: 12, msg: "무주택" },
    one: { score: 8, msg: "1주택" },
    two_or_more: { score: 3, msg: "2주택 이상" },
  };
  const { score, msg } = map[houseOwnership];
  return { grade: categoryGrade5(score, 12), score, maxScore: 12, reasonMessage: msg };
}

/** 매수목적 8점: 실거주(8) / 장기보유(6) / 투자임대(4) / 시세차익(2) */
function purposeCategory(
  profile: PropertyValidationProfile,
  purchasePurpose: GuestCustomerInput["purchasePurpose"],
): GuestEvaluationCategoryResult {
  const match = scorePurposeMatch({
    property: profile,
    purpose: purchasePurpose,
  });
  const matchTail = match.reason.split(". ").slice(1).join(". ").trim();

  const purposeFitScore =
    purchasePurpose === "residence"
      ? match.residenceFitScore
      : purchasePurpose === "investment_rent" || purchasePurpose === "investment_capital"
        ? match.investmentFitScore
        : Math.round((match.residenceFitScore + match.investmentFitScore) / 2);

  const score = Math.max(0, Math.min(8, Math.round(purposeFitScore / 12.5)));
  const reasonMessage =
    purchasePurpose === "residence"
      ? match.residenceFitScore >= match.investmentFitScore
        ? match.reason
        : `이 현장은 투자 적합도가 더 높아 실거주 목적과는 다소 덜 맞아요. ${matchTail || "투자 신호가 더 강해요."}`
      : purchasePurpose === "long_term"
        ? `이 현장은 장기 보유 관점에서 실거주와 투자 성향이 함께 반영돼요. ${matchTail || "균형형 수요가 보입니다."}`
        : match.investmentFitScore >= match.residenceFitScore
          ? match.reason
          : `이 현장은 실거주 적합도가 더 높아 투자 목적과는 다소 덜 맞아요. ${matchTail || "주거 신호가 더 강해요."}`;

  return {
    grade: categoryGrade5(score, 8),
    score,
    maxScore: 8,
    reasonMessage,
  };
}

// ─── 메인 평가 함수 ─────────────────────────────────────────────────────────────

export function evaluateGuestCondition(params: {
  profile: PropertyValidationProfile;
  customer: GuestCustomerInput;
}): GuestEvaluationResult {
  const { profile, customer } = params;

  const contractAmount = profile.listPrice * profile.contractRatio;
  const cashRule = getCashRule(profile.assetType);
  const minCash = contractAmount + profile.listPrice * cashRule.minExtraRate;
  const recommendedCash = contractAmount + profile.listPrice * cashRule.recommendedExtraRate;

  const loanRatio = getLoanRatio(profile.assetType, profile.listPrice);
  const loanAmount = profile.listPrice * loanRatio;
  const interestRate = INTEREST_RATE_BY_CREDIT[customer.creditGrade];
  const monthlyPaymentEst =
    customer.monthlyIncome > 0 ? Math.round(loanAmount * (interestRate / 12) * 1.3) : 0;
  const monthlyBurdenPercent =
    customer.monthlyIncome > 0
      ? Math.round((monthlyPaymentEst / customer.monthlyIncome) * 100)
      : null;

  const cash = cashCategory(customer.availableCash, minCash, recommendedCash);
  const income = incomeCategory(customer.monthlyIncome, loanAmount, customer.creditGrade);
  const credit = creditCategory(customer.creditGrade);
  const ownership = ownershipCategory(customer.houseOwnership);
  const purpose = purposeCategory(profile, customer.purchasePurpose);

  const totalScore =
    cash.score + income.score + credit.score + ownership.score + purpose.score;
  const finalGrade = totalScoreToGrade5(totalScore);
  const gradeLabel = grade5DetailLabel(finalGrade);

  return {
    finalGrade,
    totalScore,
    maxScore: 100,
    summaryMessage: `${totalScore}점 — ${gradeLabel}`,
    gradeLabel,
    categories: { cash, income, credit, ownership, purpose },
    metrics: {
      contractAmount,
      loanAmount,
      monthlyPaymentEst,
      monthlyBurdenPercent,
    },
  };
}
