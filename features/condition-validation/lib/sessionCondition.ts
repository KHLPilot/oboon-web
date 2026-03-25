import type {
  CardLoanUsage,
  DelinquencyCount,
  EmploymentType,
  ExistingLoanAmount,
  FullPurchasePurpose,
  LoanRejection,
  MonthlyIncomeRange,
  MonthlyLoanRepayment,
  MoveinTiming,
  PurchaseTiming,
} from "@/features/condition-validation/domain/types";
import {
  CARD_LOAN_USAGES,
  DELINQUENCY_COUNTS,
  EXISTING_LOAN_AMOUNTS,
  LOAN_REJECTIONS,
  MONTHLY_INCOME_RANGES,
  MONTHLY_LOAN_REPAYMENTS,
  isOneOf,
} from "@/features/condition-validation/domain/types";

const EMPLOYMENT_TYPES = ["employee", "self_employed", "freelancer", "other"] as const;
const HOUSE_OWNERSHIPS = ["none", "one", "two_or_more"] as const;
const PURCHASE_PURPOSES = ["residence", "investment_rent", "investment_capital", "long_term"] as const;
const PURCHASE_TIMINGS = ["within_3months", "within_6months", "within_1year", "over_1year", "by_property"] as const;
const MOVEIN_TIMINGS = ["immediate", "within_1year", "within_2years", "within_3years", "anytime"] as const;

export const CONDITION_SESSION_STORAGE_KEY = "oboon:condition-session";

export type ConditionSessionSnapshot = {
  availableCash: string;
  monthlyIncome: string;
  monthlyExpenses: string;
  employmentType: EmploymentType | null;
  houseOwnership: "none" | "one" | "two_or_more" | null;
  purchasePurposeV2: FullPurchasePurpose | null;
  purchaseTiming: PurchaseTiming | null;
  moveinTiming: MoveinTiming | null;
  ltvInternalScore: number;
  existingLoan: ExistingLoanAmount | null;
  recentDelinquency: DelinquencyCount | null;
  cardLoanUsage: CardLoanUsage | null;
  loanRejection: LoanRejection | null;
  monthlyIncomeRange: MonthlyIncomeRange | null;
  existingMonthlyRepayment: MonthlyLoanRepayment;
};

function toNormalizedAmountDisplay(value: unknown): string {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "";
    return Math.max(0, Math.round(value)).toLocaleString("ko-KR");
  }

  if (typeof value === "string") {
    const normalized = value.replaceAll(",", "").trim();
    if (!normalized) return "";
    const parsed = Number(normalized);
    if (!Number.isFinite(parsed) || parsed < 0) return "";
    return Math.round(parsed).toLocaleString("ko-KR");
  }

  return "";
}

function toNonNegativeInt(value: unknown): number {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.round(value));
  }

  if (typeof value === "string") {
    const normalized = value.replaceAll(",", "").trim();
    if (!normalized) return 0;
    const parsed = Number(normalized);
    if (!Number.isFinite(parsed)) return 0;
    return Math.max(0, Math.round(parsed));
  }

  return 0;
}

export function hasConditionSessionData(snapshot: ConditionSessionSnapshot | null | undefined): boolean {
  if (!snapshot) return false;

  return Boolean(
    snapshot.availableCash ||
      snapshot.monthlyIncome ||
      snapshot.monthlyExpenses ||
      snapshot.employmentType ||
      snapshot.houseOwnership ||
      snapshot.purchasePurposeV2 ||
      snapshot.purchaseTiming ||
      snapshot.moveinTiming ||
      snapshot.ltvInternalScore > 0 ||
      snapshot.existingLoan ||
      snapshot.recentDelinquency ||
      snapshot.cardLoanUsage ||
      snapshot.loanRejection ||
      snapshot.monthlyIncomeRange ||
      snapshot.existingMonthlyRepayment !== "none",
  );
}

export function saveConditionSession(snapshot: ConditionSessionSnapshot): void {
  if (typeof window === "undefined") return;
  if (!hasConditionSessionData(snapshot)) return;

  try {
    window.sessionStorage.setItem(
      CONDITION_SESSION_STORAGE_KEY,
      JSON.stringify({
        ...snapshot,
        saved_at: new Date().toISOString(),
      }),
    );
  } catch {
    // Ignore storage failure.
  }
}

export function loadConditionSession(): ConditionSessionSnapshot | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(CONDITION_SESSION_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const snapshot: ConditionSessionSnapshot = {
      availableCash: toNormalizedAmountDisplay(parsed.availableCash),
      monthlyIncome: toNormalizedAmountDisplay(parsed.monthlyIncome),
      monthlyExpenses: toNormalizedAmountDisplay(parsed.monthlyExpenses),
      employmentType: isOneOf(EMPLOYMENT_TYPES, parsed.employmentType)
        ? parsed.employmentType
        : null,
      houseOwnership: isOneOf(HOUSE_OWNERSHIPS, parsed.houseOwnership)
        ? parsed.houseOwnership
        : null,
      purchasePurposeV2: isOneOf(PURCHASE_PURPOSES, parsed.purchasePurposeV2)
        ? parsed.purchasePurposeV2
        : null,
      purchaseTiming: isOneOf(PURCHASE_TIMINGS, parsed.purchaseTiming)
        ? parsed.purchaseTiming
        : null,
      moveinTiming: isOneOf(MOVEIN_TIMINGS, parsed.moveinTiming)
        ? parsed.moveinTiming
        : null,
      ltvInternalScore: toNonNegativeInt(parsed.ltvInternalScore),
      existingLoan: isOneOf(EXISTING_LOAN_AMOUNTS, parsed.existingLoan)
        ? parsed.existingLoan
        : null,
      recentDelinquency: isOneOf(DELINQUENCY_COUNTS, parsed.recentDelinquency)
        ? parsed.recentDelinquency
        : null,
      cardLoanUsage: isOneOf(CARD_LOAN_USAGES, parsed.cardLoanUsage)
        ? parsed.cardLoanUsage
        : null,
      loanRejection: isOneOf(LOAN_REJECTIONS, parsed.loanRejection)
        ? parsed.loanRejection
        : null,
      monthlyIncomeRange: isOneOf(MONTHLY_INCOME_RANGES, parsed.monthlyIncomeRange)
        ? parsed.monthlyIncomeRange
        : null,
      existingMonthlyRepayment: isOneOf(MONTHLY_LOAN_REPAYMENTS, parsed.existingMonthlyRepayment)
        ? parsed.existingMonthlyRepayment
        : "none",
    };

    return hasConditionSessionData(snapshot) ? snapshot : null;
  } catch {
    return null;
  }
}
