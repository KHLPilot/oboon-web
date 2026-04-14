"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type {
  ConditionCategoryGrades,
  CreditGrade,
  FinalGrade5,
  PurchasePurpose,
} from "@/features/condition-validation/domain/types";
import {
  normalizeOfferingStatusValue,
  normalizeRegionTab,
  statusLabelOf,
} from "@/features/offerings/domain/offering.constants";
import {
  mapPropertyRowToOffering,
  type PropertyRow,
} from "@/features/offerings/mappers/offering.mapper";
import { fetchPropertiesForOfferings } from "@/features/offerings/services/offering.query";
import {
  clearConditionSession,
  loadConditionSession,
  saveConditionSession,
  type ConditionSessionSnapshot,
} from "@/features/condition-validation/lib/sessionCondition";
import {
  consumeRecommendationPrefetchCache,
} from "@/features/recommendations/lib/recommendationPrefetchCache";
import { pickLoggedInConditionSource } from "@/features/condition-validation/lib/conditionSourcePolicy";
import { shouldAutoEvaluateRecommendations } from "@/features/recommendations/lib/recommendation-evaluation";
import {
  normalizeRecommendationUnitTypes,
  type RawRecommendationUnitTypeResult,
  type RecommendationUnitType,
} from "@/features/recommendations/lib/recommendationUnitTypes";
import type {
  OwnedHouseCount,
  RecommendationCondition,
} from "@/features/recommendations/domain/recommendationCondition";
import {
  createEmptyRecommendationCondition,
  creditGradeFromLtvInternalScore,
} from "@/features/condition-validation/domain/conditionState";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { toKoreanErrorMessage } from "@/shared/errorMessage";
import { formatPriceRange } from "@/shared/price";
import { UXCopy } from "@/shared/uxCopy";
import type { Offering } from "@/types/index";

export type RecommendationMode = "input" | "sim";

export type RecommendationProperty = {
  id: number;
  name: string;
  addressShort: string;
  addressFull: string;
  regionLabel: string;
  regionSido: string | null;
  regionSigungu: string | null;
  propertyType: string | null;
  status: string | null;
  statusLabel: string;
  imageUrl: string | null;
  lat: number | null;
  lng: number | null;
  priceLabel: string;
};

export type RecommendationCategory = {
  grade: FinalGrade5;
  score: number | null;
  maxScore: number;
};

export type RecommendationEvalResult = {
  finalGrade: FinalGrade5;
  gradeLabel: string | null;
  totalScore: number | null;
  action: string | null;
  summaryMessage: string;
  reasonMessages: string[];
  showDetailedMetrics: boolean;
  isMasked: boolean;
  categories: {
    cash: RecommendationCategory;
    income: RecommendationCategory;
    ltvDsr: RecommendationCategory;
    ownership: RecommendationCategory;
    purpose: RecommendationCategory;
    timing: RecommendationCategory;
  };
  metrics: {
    listPrice: number | null;
    minCash: number | null;
    recommendedCash: number | null;
    monthlyPaymentEst: number | null;
    monthlyBurdenPercent: number | null;
  };
};

export type RecommendationItem = {
  offering: Offering;
  property: RecommendationProperty;
  conditionCategories: ConditionCategoryGrades;
  evalResult: RecommendationEvalResult;
  unitTypes: RecommendationUnitType[];
  bestUnitType: RecommendationUnitType | null;
};

export type { RecommendationCondition, OwnedHouseCount } from "@/features/recommendations/domain/recommendationCondition";
export type {
  RecommendationUnitType,
  RecommendationUnitTypeCategory,
  RecommendationUnitTypeCategoryKey,
} from "@/features/recommendations/lib/recommendationUnitTypes";

type RawRecommendationItem = {
  property_id?: number | string;
  property_name?: string | null;
  property_type?: string | null;
  status?: string | null;
  image_url?: string | null;
  final_grade?: FinalGrade5;
  total_score?: number | null;
  action?: string | null;
  summary_message?: string | null;
  grade_label?: string | null;
  reason_messages?: string[] | null;
  show_detailed_metrics?: boolean;
  categories?: {
    cash?: { grade?: FinalGrade5; score?: number | null; } | null;
    income?: { grade?: FinalGrade5; score?: number | null; } | null;
    ltv_dsr?: { grade?: FinalGrade5; score?: number | null; } | null;
    ownership?: { grade?: FinalGrade5; score?: number | null; } | null;
    purpose?: { grade?: FinalGrade5; score?: number | null; } | null;
    timing?: { grade?: FinalGrade5; score?: number | null; } | null;
  } | null;
  metrics?: {
    list_price?: number | null;
    min_cash?: number | null;
    recommended_cash?: number | null;
    monthly_payment_est?: number | null;
    monthly_burden_percent?: number | null;
  } | null;
  best_unit_type?: RawRecommendationUnitTypeResult | null;
  unit_type_results?: RawRecommendationUnitTypeResult[] | null;
};

type RawRecommendationResponse = {
  ok?: boolean;
  recommendations?: RawRecommendationItem[];
  error?: {
    message?: string;
  };
};

type OfferingMeta = {
  offering: Offering;
  propertyType: string | null;
  rawStatus: string | null;
  regionSido: string | null;
  regionSigungu: string | null;
};

type RecommendationProfilePresetRow = {
  cv_available_cash_manwon?: number | null;
  cv_monthly_income_manwon?: number | null;
  cv_employment_type?: RecommendationCondition["employmentType"];
  cv_monthly_expenses_manwon?: number | null;
  cv_house_ownership?: RecommendationCondition["houseOwnership"];
  cv_purchase_purpose_v2?: RecommendationCondition["purchasePurposeV2"];
  cv_purchase_timing?: RecommendationCondition["purchaseTiming"];
  cv_movein_timing?: RecommendationCondition["moveinTiming"];
  cv_ltv_internal_score?: number | null;
  cv_existing_loan_amount?: RecommendationCondition["existingLoan"];
  cv_recent_delinquency?: RecommendationCondition["recentDelinquency"];
  cv_card_loan_usage?: RecommendationCondition["cardLoanUsage"];
  cv_loan_rejection?: RecommendationCondition["loanRejection"];
  cv_monthly_income_range?: RecommendationCondition["monthlyIncomeRange"];
  cv_existing_monthly_repayment?: RecommendationCondition["existingMonthlyRepayment"];
} | null;

type RecommendationRequestRow = {
  available_cash_manwon?: number | null;
  monthly_income_manwon?: number | null;
  owned_house_count?: number | null;
  credit_grade?: CreditGrade | null;
  purchase_purpose?: PurchasePurpose | null;
  input_payload?: unknown;
} | null;

type RecommendationConditionDraft = {
  snapshot?: ConditionSessionSnapshot;
  saved_at?: string;
};

const DEFAULT_CONDITION: RecommendationCondition =
  createEmptyRecommendationCondition();

const CASH_MAX_SCORE = 30;
const INCOME_MAX_SCORE = 25;
const LTV_DSR_MAX_SCORE = 20;
const OWNERSHIP_MAX_SCORE = 10;
const PURPOSE_MAX_SCORE = 5;
const TIMING_MAX_SCORE = 10;
const SIMULATOR_AVAILABLE_CASH_MAX = 1_000_000;
const SIMULATOR_MONTHLY_INCOME_MAX = 10_000;
const SIMULATOR_AVAILABLE_CASH_STEPS = [
  ...Array.from({ length: 11 }, (_, index) => index * 1_000),
  ...Array.from({ length: 9 }, (_, index) => (index + 2) * 10_000),
  ...Array.from({ length: 9 }, (_, index) => (index + 2) * 100_000),
];
const SIMULATOR_MONTHLY_INCOME_STEPS = [
  ...Array.from({ length: 11 }, (_, index) => index * 100),
  ...Array.from({ length: 8 }, (_, index) => 1_500 + index * 500),
  ...Array.from({ length: 5 }, (_, index) => 6_000 + index * 1_000),
];
const RECOMMENDATION_CONDITION_DRAFT_STORAGE_KEY =
  "oboon:recommendations-condition-draft";

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    const normalized = value.replaceAll(",", "").trim();
    if (!normalized) return null;

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function toPositiveInt(value: unknown): number | null {
  const parsed = toFiniteNumber(value);
  if (parsed === null) return null;

  const normalized = Math.round(parsed);
  return normalized > 0 ? normalized : null;
}

function toUnknownRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function pickFirstNonEmpty(...values: Array<string | null | undefined>) {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function sanitizeAmount(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value));
}

function parseSessionAmount(value: string): number {
  const normalized = value.replaceAll(",", "").trim();
  if (!normalized) return 0;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.round(parsed));
}

function formatSessionAmount(value: number): string {
  if (!Number.isFinite(value)) return "";
  const normalized = Math.max(0, Math.round(value));
  return normalized.toLocaleString("ko-KR");
}

function conditionFromSession(
  snapshot: ConditionSessionSnapshot,
  prev: RecommendationCondition,
): RecommendationCondition {
  return {
    ...prev,
    availableCash: parseSessionAmount(snapshot.availableCash),
    monthlyIncome: parseSessionAmount(snapshot.monthlyIncome),
    monthlyExpenses: parseSessionAmount(snapshot.monthlyExpenses),
    employmentType: snapshot.employmentType,
    houseOwnership: snapshot.houseOwnership,
    purchasePurposeV2: snapshot.purchasePurposeV2,
    purchaseTiming: snapshot.purchaseTiming,
    moveinTiming: snapshot.moveinTiming,
    ltvInternalScore: snapshot.ltvInternalScore,
    creditGrade: creditGradeFromLtvInternalScore(snapshot.ltvInternalScore),
    existingLoan: snapshot.existingLoan,
    recentDelinquency: snapshot.recentDelinquency,
    cardLoanUsage: snapshot.cardLoanUsage,
    loanRejection: snapshot.loanRejection,
    monthlyIncomeRange: snapshot.monthlyIncomeRange,
    existingMonthlyRepayment: snapshot.existingMonthlyRepayment,
    regions: prev.regions,
  };
}

function buildConditionSession(condition: RecommendationCondition): ConditionSessionSnapshot {
  return {
    availableCash: formatSessionAmount(condition.availableCash),
    monthlyIncome: formatSessionAmount(condition.monthlyIncome),
    monthlyExpenses: formatSessionAmount(condition.monthlyExpenses),
    employmentType: condition.employmentType,
    houseOwnership: condition.houseOwnership,
    purchasePurposeV2: condition.purchasePurposeV2,
    purchaseTiming: condition.purchaseTiming,
    moveinTiming: condition.moveinTiming,
    ltvInternalScore: condition.ltvInternalScore,
    existingLoan: condition.existingLoan,
    recentDelinquency: condition.recentDelinquency,
    cardLoanUsage: condition.cardLoanUsage,
    loanRejection: condition.loanRejection,
    monthlyIncomeRange: condition.monthlyIncomeRange,
    existingMonthlyRepayment: condition.existingMonthlyRepayment,
  };
}

function sanitizeGuestCondition(
  condition: RecommendationCondition,
): RecommendationCondition {
  return {
    ...condition,
    employmentType: null,
    monthlyExpenses: 0,
    purchaseTiming: null,
    moveinTiming: null,
    ltvInternalScore:
      condition.ltvInternalScore > 0
        ? clamp(Math.round(condition.ltvInternalScore), 1, 100)
        : 0,
    existingLoan: null,
    recentDelinquency: null,
    cardLoanUsage: null,
    loanRejection: null,
    monthlyIncomeRange: null,
    existingMonthlyRepayment: null,
    regions: [],
    creditGrade: creditGradeFromLtvInternalScore(condition.ltvInternalScore),
  };
}

function hasStoredProfileCondition(profile: {
  cv_available_cash_manwon?: number | null;
  cv_monthly_income_manwon?: number | null;
  cv_employment_type?: RecommendationCondition["employmentType"];
  cv_monthly_expenses_manwon?: number | null;
  cv_house_ownership?: RecommendationCondition["houseOwnership"];
  cv_purchase_purpose_v2?: RecommendationCondition["purchasePurposeV2"];
  cv_purchase_timing?: RecommendationCondition["purchaseTiming"];
  cv_movein_timing?: RecommendationCondition["moveinTiming"];
  cv_ltv_internal_score?: number | null;
  cv_existing_loan_amount?: RecommendationCondition["existingLoan"];
  cv_recent_delinquency?: RecommendationCondition["recentDelinquency"];
  cv_card_loan_usage?: RecommendationCondition["cardLoanUsage"];
  cv_loan_rejection?: RecommendationCondition["loanRejection"];
  cv_monthly_income_range?: RecommendationCondition["monthlyIncomeRange"];
  cv_existing_monthly_repayment?: RecommendationCondition["existingMonthlyRepayment"];
} | null): boolean {
  if (!profile) return false;

  return Boolean(
    profile.cv_available_cash_manwon != null ||
      profile.cv_monthly_income_manwon != null ||
      profile.cv_employment_type ||
      profile.cv_monthly_expenses_manwon != null ||
      profile.cv_house_ownership ||
      profile.cv_purchase_purpose_v2 ||
      profile.cv_purchase_timing ||
      profile.cv_movein_timing ||
      (profile.cv_ltv_internal_score ?? 0) > 0 ||
      profile.cv_existing_loan_amount ||
      profile.cv_recent_delinquency ||
      profile.cv_card_loan_usage ||
      profile.cv_loan_rejection ||
      profile.cv_monthly_income_range ||
      profile.cv_existing_monthly_repayment != null,
  );
}

function conditionFromProfile(
  profile: RecommendationProfilePresetRow,
  prev: RecommendationCondition,
): RecommendationCondition {
  if (!profile) return prev;

  return normalizeInputCondition({
    ...prev,
    availableCash:
      profile.cv_available_cash_manwon != null
        ? Number(profile.cv_available_cash_manwon)
        : prev.availableCash,
    monthlyIncome:
      profile.cv_monthly_income_manwon != null
        ? Number(profile.cv_monthly_income_manwon)
        : prev.monthlyIncome,
    employmentType: profile.cv_employment_type ?? prev.employmentType,
    monthlyExpenses:
      profile.cv_monthly_expenses_manwon != null
        ? Number(profile.cv_monthly_expenses_manwon)
        : prev.monthlyExpenses,
    houseOwnership: profile.cv_house_ownership ?? prev.houseOwnership,
    purchasePurposeV2: profile.cv_purchase_purpose_v2 ?? prev.purchasePurposeV2,
    purchaseTiming: profile.cv_purchase_timing ?? prev.purchaseTiming,
    moveinTiming: profile.cv_movein_timing ?? prev.moveinTiming,
    ltvInternalScore:
      profile.cv_ltv_internal_score != null
        ? Number(profile.cv_ltv_internal_score)
        : prev.ltvInternalScore,
    existingLoan: profile.cv_existing_loan_amount ?? prev.existingLoan,
    recentDelinquency: profile.cv_recent_delinquency ?? prev.recentDelinquency,
    cardLoanUsage: profile.cv_card_loan_usage ?? prev.cardLoanUsage,
    loanRejection: profile.cv_loan_rejection ?? prev.loanRejection,
    monthlyIncomeRange: profile.cv_monthly_income_range ?? prev.monthlyIncomeRange,
    existingMonthlyRepayment:
      profile.cv_existing_monthly_repayment ?? prev.existingMonthlyRepayment,
    creditGrade: creditGradeFromLtvInternalScore(profile.cv_ltv_internal_score),
    regions: prev.regions,
  });
}

function conditionFromRequest(
  request: RecommendationRequestRow,
  prev: RecommendationCondition,
): RecommendationCondition {
  if (!request) return prev;

  const payloadRecord = toUnknownRecord(request.input_payload);
  const payloadCustomer = toUnknownRecord(payloadRecord?.customer);

  return normalizeInputCondition({
    ...prev,
    availableCash:
      toPositiveInt(payloadCustomer?.available_cash) ??
      toPositiveInt(request.available_cash_manwon) ??
      prev.availableCash,
    monthlyIncome:
      toPositiveInt(payloadCustomer?.monthly_income) ??
      toPositiveInt(request.monthly_income_manwon) ??
      prev.monthlyIncome,
    monthlyExpenses:
      toPositiveInt(payloadCustomer?.monthly_expenses) ?? prev.monthlyExpenses,
    employmentType:
      payloadCustomer?.employment_type === "employee" ||
      payloadCustomer?.employment_type === "self_employed" ||
      payloadCustomer?.employment_type === "freelancer" ||
      payloadCustomer?.employment_type === "other"
        ? payloadCustomer.employment_type
        : prev.employmentType,
    houseOwnership:
      payloadCustomer?.house_ownership === "none" ||
      payloadCustomer?.house_ownership === "one" ||
      payloadCustomer?.house_ownership === "two_or_more"
        ? payloadCustomer.house_ownership
        : request.owned_house_count === 1
          ? "one"
          : (request.owned_house_count ?? 0) >= 2
            ? "two_or_more"
            : prev.houseOwnership,
    purchasePurposeV2:
      payloadCustomer?.purchase_purpose_v2 === "residence" ||
      payloadCustomer?.purchase_purpose_v2 === "investment_rent" ||
      payloadCustomer?.purchase_purpose_v2 === "investment_capital" ||
      payloadCustomer?.purchase_purpose_v2 === "long_term"
        ? payloadCustomer.purchase_purpose_v2
        : request.purchase_purpose === "both"
          ? "long_term"
          : request.purchase_purpose === "investment"
            ? "investment_capital"
            : prev.purchasePurposeV2,
    purchaseTiming:
      payloadCustomer?.purchase_timing === "within_3months" ||
      payloadCustomer?.purchase_timing === "within_6months" ||
      payloadCustomer?.purchase_timing === "within_1year" ||
      payloadCustomer?.purchase_timing === "over_1year" ||
      payloadCustomer?.purchase_timing === "by_property"
        ? payloadCustomer.purchase_timing
        : prev.purchaseTiming,
    moveinTiming:
      payloadCustomer?.movein_timing === "immediate" ||
      payloadCustomer?.movein_timing === "within_1year" ||
      payloadCustomer?.movein_timing === "within_2years" ||
      payloadCustomer?.movein_timing === "within_3years" ||
      payloadCustomer?.movein_timing === "anytime"
        ? payloadCustomer.movein_timing
        : prev.moveinTiming,
    ltvInternalScore:
      toPositiveInt(payloadCustomer?.ltv_internal_score) ??
      (request.credit_grade === "good"
        ? 80
        : request.credit_grade === "normal"
          ? 55
          : request.credit_grade === "unstable"
            ? 20
            : prev.ltvInternalScore),
    existingLoan:
      payloadCustomer?.existing_loan === "none" ||
      payloadCustomer?.existing_loan === "under_1eok" ||
      payloadCustomer?.existing_loan === "1to3eok" ||
      payloadCustomer?.existing_loan === "over_3eok"
        ? payloadCustomer.existing_loan
        : prev.existingLoan,
    recentDelinquency:
      payloadCustomer?.recent_delinquency === "none" ||
      payloadCustomer?.recent_delinquency === "once" ||
      payloadCustomer?.recent_delinquency === "twice_or_more"
        ? payloadCustomer.recent_delinquency
        : prev.recentDelinquency,
    cardLoanUsage:
      payloadCustomer?.card_loan_usage === "none" ||
      payloadCustomer?.card_loan_usage === "1to2" ||
      payloadCustomer?.card_loan_usage === "3_or_more"
        ? payloadCustomer.card_loan_usage
        : prev.cardLoanUsage,
    loanRejection:
      payloadCustomer?.loan_rejection === "none" ||
      payloadCustomer?.loan_rejection === "yes"
        ? payloadCustomer.loan_rejection
        : prev.loanRejection,
    monthlyIncomeRange:
      payloadCustomer?.monthly_income_range === "under_200" ||
      payloadCustomer?.monthly_income_range === "200to300" ||
      payloadCustomer?.monthly_income_range === "300to500" ||
      payloadCustomer?.monthly_income_range === "500to700" ||
      payloadCustomer?.monthly_income_range === "over_700"
        ? payloadCustomer.monthly_income_range
        : prev.monthlyIncomeRange,
    existingMonthlyRepayment:
      payloadCustomer?.existing_monthly_repayment === "none" ||
      payloadCustomer?.existing_monthly_repayment === "under_50" ||
      payloadCustomer?.existing_monthly_repayment === "50to100" ||
      payloadCustomer?.existing_monthly_repayment === "100to200" ||
      payloadCustomer?.existing_monthly_repayment === "over_200"
        ? payloadCustomer.existing_monthly_repayment
        : prev.existingMonthlyRepayment,
    creditGrade:
      request.credit_grade ??
      creditGradeFromLtvInternalScore(toPositiveInt(payloadCustomer?.ltv_internal_score)),
    regions: prev.regions,
  });
}

function buildSavedConditionBaseline(
  condition: RecommendationCondition,
): RecommendationCondition {
  return normalizeInputCondition({
    ...DEFAULT_CONDITION,
    ...condition,
    regions: [],
  });
}

function isSameSavedCondition(
  current: RecommendationCondition,
  saved: RecommendationCondition | null,
): boolean {
  if (!saved) return false;

  return (
    current.availableCash === saved.availableCash &&
    current.monthlyIncome === saved.monthlyIncome &&
    current.monthlyExpenses === saved.monthlyExpenses &&
    current.employmentType === saved.employmentType &&
    current.houseOwnership === saved.houseOwnership &&
    current.purchasePurposeV2 === saved.purchasePurposeV2 &&
    current.purchaseTiming === saved.purchaseTiming &&
    current.moveinTiming === saved.moveinTiming &&
    current.ltvInternalScore === saved.ltvInternalScore &&
    current.existingLoan === saved.existingLoan &&
    current.recentDelinquency === saved.recentDelinquency &&
    current.cardLoanUsage === saved.cardLoanUsage &&
    current.loanRejection === saved.loanRejection &&
    current.monthlyIncomeRange === saved.monthlyIncomeRange &&
    current.existingMonthlyRepayment === saved.existingMonthlyRepayment
  );
}

function loadRecommendationConditionDraft(): ConditionSessionSnapshot | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(
      RECOMMENDATION_CONDITION_DRAFT_STORAGE_KEY,
    );
    if (!raw) return null;

    const parsed = JSON.parse(raw) as RecommendationConditionDraft;
    return parsed.snapshot ?? null;
  } catch {
    return null;
  }
}

function clearRecommendationConditionDraft(): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(RECOMMENDATION_CONDITION_DRAFT_STORAGE_KEY);
  } catch {
    // ignore storage cleanup failure
  }
}

function snapSimulatorAvailableCash(value: number): number {
  const normalized = clamp(
    sanitizeAmount(value),
    0,
    SIMULATOR_AVAILABLE_CASH_MAX,
  );

  return SIMULATOR_AVAILABLE_CASH_STEPS.reduce((closest, current) =>
    Math.abs(current - normalized) < Math.abs(closest - normalized)
      ? current
      : closest,
  );
}

function snapSimulatorMonthlyIncome(value: number): number {
  const normalized = clamp(
    sanitizeAmount(value),
    0,
    SIMULATOR_MONTHLY_INCOME_MAX,
  );

  return SIMULATOR_MONTHLY_INCOME_STEPS.reduce((closest, current) =>
    Math.abs(current - normalized) < Math.abs(closest - normalized)
      ? current
      : closest,
  );
}

function deriveApiCompatFields(condition: RecommendationCondition): {
  ownedHouseCount: OwnedHouseCount;
  creditGrade: CreditGrade | null;
  purchasePurpose: PurchasePurpose;
} {
  const creditGrade =
    condition.creditGrade ??
    creditGradeFromLtvInternalScore(condition.ltvInternalScore);

  // houseOwnership → ownedHouseCount
  const ownedHouseCount: OwnedHouseCount =
    condition.houseOwnership === "one"
      ? 1
      : condition.houseOwnership === "two_or_more"
        ? 2
        : 0;

  // purchasePurposeV2 → purchasePurpose
  const purchasePurpose: PurchasePurpose =
    condition.purchasePurposeV2 === "long_term"
      ? "both"
      : condition.purchasePurposeV2 === "investment_rent" ||
          condition.purchasePurposeV2 === "investment_capital"
        ? "investment"
        : "residence";

  return { ownedHouseCount, creditGrade, purchasePurpose };
}

function normalizeInputCondition(condition: RecommendationCondition): RecommendationCondition {
  const derived = deriveApiCompatFields(condition);
  return {
    ...condition,
    availableCash: sanitizeAmount(condition.availableCash),
    monthlyIncome: sanitizeAmount(condition.monthlyIncome),
    monthlyExpenses: sanitizeAmount(condition.monthlyExpenses),
    ownedHouseCount: derived.ownedHouseCount,
    creditGrade: derived.creditGrade,
    purchasePurpose: derived.purchasePurpose,
  };
}

function normalizeSimulatorCondition(
  condition: RecommendationCondition,
  deriveFromNew = true,
): RecommendationCondition {
  const base = {
    ...condition,
    availableCash: snapSimulatorAvailableCash(condition.availableCash),
    monthlyIncome: snapSimulatorMonthlyIncome(condition.monthlyIncome),
    monthlyExpenses: sanitizeAmount(condition.monthlyExpenses),
  };
  if (!deriveFromNew) return base;
  const derived = deriveApiCompatFields(condition);
  return {
    ...base,
    ownedHouseCount: derived.ownedHouseCount,
    creditGrade: derived.creditGrade,
    purchasePurpose: derived.purchasePurpose,
  };
}

function resolveCreditGrade(condition: RecommendationCondition): CreditGrade | null {
  return (
    condition.creditGrade ??
    creditGradeFromLtvInternalScore(condition.ltvInternalScore)
  );
}

function buildPriceLabel(args: {
  offering: Offering | null;
  listPrice: number | null;
  showDetailedMetrics: boolean;
}): string {
  const { offering, listPrice, showDetailedMetrics } = args;

  if (!showDetailedMetrics) {
    return UXCopy.pricePrivateShort;
  }

  if (offering && (offering.priceMin억 !== null || offering.priceMax억 !== null)) {
    return formatPriceRange(offering.priceMin억, offering.priceMax억, {
      unknownLabel: offering.isPricePrivate
        ? UXCopy.pricePrivateShort
        : UXCopy.priceRangeShort,
    });
  }

  if (listPrice !== null) {
    const singlePrice = Math.round((listPrice / 10_000) * 10) / 10;
    return formatPriceRange(singlePrice, singlePrice, {
      unknownLabel: UXCopy.priceRangeShort,
    });
  }

  return UXCopy.priceRangeShort;
}

function toConditionCategoryGrades(args: {
  totalScore: number | null;
  cashScore: number | null;
  cashGrade: FinalGrade5;
  burdenScore: number | null;
  burdenGrade: FinalGrade5;
  creditScore: number | null;
  creditGrade: FinalGrade5;
}): ConditionCategoryGrades {
  const {
    totalScore,
    cashScore,
    cashGrade,
    burdenScore,
    burdenGrade,
    creditScore,
    creditGrade,
  } = args;

  return {
    cash: { grade: cashGrade, score: cashScore ?? undefined },
    burden: { grade: burdenGrade, score: burdenScore ?? undefined },
    credit: { grade: creditGrade, score: creditScore ?? undefined },
    totalScore: totalScore ?? undefined,
  };
}

function manwonToEok(value: number | null): number | null {
  if (value === null) return null;
  return Math.round((value / 10_000) * 10) / 10;
}

function buildRecommendationOffering(args: {
  id: number;
  offering: Offering | null;
  propertyName: string;
  addressShort: string;
  addressFull: string;
  regionLabel: string;
  status: string | null;
  imageUrl: string | null;
  lat: number | null;
  lng: number | null;
  listPrice: number | null;
  showDetailedMetrics: boolean;
}): Offering {
  const {
    id,
    offering,
    propertyName,
    addressShort,
    addressFull,
    regionLabel,
    status,
    imageUrl,
    lat,
    lng,
    listPrice,
    showDetailedMetrics,
  } = args;

  const normalizedStatusValue = normalizeOfferingStatusValue(status);
  const singlePriceInEok = manwonToEok(listPrice);

  const fallbackOffering: Offering = {
    id: String(id),
    title: propertyName,
    addressShort,
    addressFull,
    region: normalizeRegionTab(regionLabel),
    regionLabel,
    status: statusLabelOf(normalizedStatusValue),
    statusValue: normalizedStatusValue,
    hasAppraiserComment: false,
    imageUrl,
    priceMin억: showDetailedMetrics ? singlePriceInEok : null,
    priceMax억: showDetailedMetrics ? singlePriceInEok : null,
    isPricePrivate: !showDetailedMetrics,
    lat,
    lng,
  };

  if (!offering) {
    return fallbackOffering;
  }

  if (!showDetailedMetrics) {
    return {
      ...offering,
      priceMin억: null,
      priceMax억: null,
      isPricePrivate: true,
    };
  }

  if (offering.priceMin억 !== null || offering.priceMax억 !== null) {
    return offering;
  }

  return {
    ...offering,
    priceMin억: singlePriceInEok,
    priceMax억: singlePriceInEok,
    isPricePrivate: false,
  };
}

function isMaskedRecommendation(item: RawRecommendationItem): boolean {
  return (
    toFiniteNumber(item.total_score) === null ||
    toFiniteNumber(item.categories?.cash?.score) === null ||
    toFiniteNumber(item.categories?.income?.score) === null ||
    toFiniteNumber(item.metrics?.min_cash) === null
  );
}

function mergeRecommendationItem(
  item: RawRecommendationItem,
  metadataById: Map<number, OfferingMeta>,
): RecommendationItem | null {
  const id = toPositiveInt(item.property_id);
  const finalGrade = item.final_grade;
  if (!id || !finalGrade) return null;

  const metadata = metadataById.get(id);
  const offering = metadata?.offering ?? null;
  const showDetailedMetrics = item.show_detailed_metrics !== false;
  const totalScore = toFiniteNumber(item.total_score);
  const listPrice = toFiniteNumber(item.metrics?.list_price);
  const minCash = toFiniteNumber(item.metrics?.min_cash);
  const recommendedCash = toFiniteNumber(item.metrics?.recommended_cash);
  const monthlyPaymentEst = toFiniteNumber(item.metrics?.monthly_payment_est);
  const monthlyBurdenPercent = toFiniteNumber(item.metrics?.monthly_burden_percent);
  const isMasked = isMaskedRecommendation(item);
  const propertyName = offering?.title ?? item.property_name ?? `현장 #${id}`;
  const addressShort = offering?.addressShort ?? UXCopy.addressShort;
  const addressFull = offering?.addressFull ?? offering?.addressShort ?? UXCopy.addressShort;
  const regionLabel = offering?.regionLabel ?? offering?.region ?? UXCopy.regionShort;
  const rawStatus = metadata?.rawStatus ?? item.status ?? null;
  const statusLabel = statusLabelOf(normalizeOfferingStatusValue(rawStatus));
  const cashScore = toFiniteNumber(item.categories?.cash?.score);
  const incomeScore = toFiniteNumber(item.categories?.income?.score);
  const ltvDsrScore = toFiniteNumber(item.categories?.ltv_dsr?.score);
  const ownershipScore = toFiniteNumber(item.categories?.ownership?.score);
  const purposeScore = toFiniteNumber(item.categories?.purpose?.score);
  const timingScore = toFiniteNumber(item.categories?.timing?.score);
  const unitTypes = normalizeRecommendationUnitTypes(item);
  const recommendationOffering = buildRecommendationOffering({
    id,
    offering,
    propertyName,
    addressShort,
    addressFull,
    regionLabel,
    status: rawStatus,
    imageUrl: offering?.imageUrl ?? item.image_url ?? null,
    lat: toFiniteNumber(offering?.lat),
    lng: toFiniteNumber(offering?.lng),
    listPrice,
    showDetailedMetrics,
  });

  const property: RecommendationProperty = {
    id,
    name: propertyName,
    addressShort,
    addressFull,
    regionLabel,
    regionSido:
      metadata?.regionSido ?? offering?.regionLabel ?? offering?.region ?? UXCopy.regionShort,
    regionSigungu: metadata?.regionSigungu ?? null,
    propertyType: metadata?.propertyType ?? item.property_type ?? null,
    status: rawStatus,
    statusLabel,
    imageUrl: recommendationOffering.imageUrl ?? null,
    lat: recommendationOffering.lat ?? null,
    lng: recommendationOffering.lng ?? null,
    priceLabel: buildPriceLabel({
      offering: recommendationOffering,
      listPrice,
      showDetailedMetrics,
    }),
  };

  return {
    offering: recommendationOffering,
    property,
    conditionCategories: toConditionCategoryGrades({
      totalScore,
      cashScore,
      cashGrade: item.categories?.cash?.grade ?? finalGrade,
      burdenScore: incomeScore,
      burdenGrade: item.categories?.income?.grade ?? finalGrade,
      creditScore: ltvDsrScore,
      creditGrade: item.categories?.ltv_dsr?.grade ?? finalGrade,
    }),
    evalResult: {
      finalGrade,
      gradeLabel: item.grade_label ?? null,
      totalScore,
      action: item.action ?? null,
      summaryMessage: item.summary_message ?? "조건을 다시 확인해주세요.",
      reasonMessages: Array.isArray(item.reason_messages)
        ? item.reason_messages.filter(
            (reason): reason is string =>
              typeof reason === "string" && reason.trim().length > 0,
          )
        : [],
      showDetailedMetrics,
      isMasked,
      categories: {
        cash: {
          grade: item.categories?.cash?.grade ?? finalGrade,
          score: cashScore,
          maxScore: CASH_MAX_SCORE,
        },
        income: {
          grade: item.categories?.income?.grade ?? finalGrade,
          score: incomeScore,
          maxScore: INCOME_MAX_SCORE,
        },
        ltvDsr: {
          grade: item.categories?.ltv_dsr?.grade ?? finalGrade,
          score: ltvDsrScore,
          maxScore: LTV_DSR_MAX_SCORE,
        },
        ownership: {
          grade: item.categories?.ownership?.grade ?? finalGrade,
          score: ownershipScore,
          maxScore: OWNERSHIP_MAX_SCORE,
        },
        purpose: {
          grade: item.categories?.purpose?.grade ?? finalGrade,
          score: purposeScore,
          maxScore: PURPOSE_MAX_SCORE,
        },
        timing: {
          grade: item.categories?.timing?.grade ?? finalGrade,
          score: timingScore,
          maxScore: TIMING_MAX_SCORE,
        },
      },
      metrics: {
        listPrice,
        minCash,
        recommendedCash,
        monthlyPaymentEst,
        monthlyBurdenPercent,
      },
    },
    unitTypes,
    bestUnitType: unitTypes[0] ?? null,
  };
}

export function useRecommendations() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseClient(), []);
  const requestSeqRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const hasUserTriggeredEvaluationRef = useRef(false);
  const skipAutoEvalRef = useRef(false);
  const previousIsLoggedInRef = useRef<boolean | null>(null);
  const restoredConditionForAutoEvalRef = useRef(false);
  const autoEvaluatedOnEntryRef = useRef(false);

  const [condition, setCondition] = useState<RecommendationCondition>(
    DEFAULT_CONDITION,
  );
  const [mode, setMode] = useState<RecommendationMode>("input");
  const [rows, setRows] = useState<PropertyRow[]>([]);
  const [rawRecommendations, setRawRecommendations] = useState<
    RawRecommendationItem[]
  >([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSavingCondition, setIsSavingCondition] = useState(false);
  const [hasSavedConditionPreset, setHasSavedConditionPreset] = useState(false);
  const [hasEvaluatedOnce, setHasEvaluatedOnce] = useState(false);
  const [savedConditionPreset, setSavedConditionPreset] =
    useState<RecommendationCondition | null>(null);

  useEffect(() => {
    let active = true;

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!active) return;
        setIsLoggedIn(Boolean(session?.user));
      },
    );

    async function load() {
      setIsBootstrapping(true);

      const [{ data, error }, authResult] = await Promise.all([
        fetchPropertiesForOfferings(supabase, { limit: 200 }),
        supabase.auth.getUser(),
      ]);

      if (!active) return;

      if (error) {
        setCatalogError(
          toKoreanErrorMessage(
            error,
            "추천 현장 기본 데이터를 불러오지 못했습니다.",
          ),
        );
        setRows([]);
      } else {
        setCatalogError(null);
        setRows(((data ?? []) as PropertyRow[]).filter(Boolean));
      }

      const loggedIn = Boolean(authResult.data.user);
      setIsLoggedIn(loggedIn);
      if (!loggedIn) {
        setHasSavedConditionPreset(false);
        setSavedConditionPreset(null);
        if (active) {
          const sessionSnapshot = loadConditionSession();
          const nextCondition = sessionSnapshot
            ? sanitizeGuestCondition(
                normalizeInputCondition(
                  conditionFromSession(sessionSnapshot, DEFAULT_CONDITION),
                ),
              )
            : sanitizeGuestCondition(DEFAULT_CONDITION);
          setCondition(nextCondition);
          const cachedRecommendations = consumeRecommendationPrefetchCache(
            nextCondition,
            false,
          );
          const hasCachedRecommendations = Boolean(cachedRecommendations);
          if (hasCachedRecommendations) {
            setRawRecommendations(cachedRecommendations as RawRecommendationItem[]);
            setHasEvaluatedOnce(true);
          }
          restoredConditionForAutoEvalRef.current = Boolean(sessionSnapshot);
          autoEvaluatedOnEntryRef.current = hasCachedRecommendations;
        }
      } else {
        // 저장된 조건 불러오기
        const userId = authResult.data.user!.id;
        const [{ data: profile, error: profileError }, { data: requests, error: requestError }] =
          await Promise.all([
            supabase
              .from("profiles")
              .select([
                "cv_available_cash_manwon",
                "cv_monthly_income_manwon",
                "cv_employment_type",
                "cv_monthly_expenses_manwon",
                "cv_house_ownership",
                "cv_purchase_purpose_v2",
                "cv_purchase_timing",
                "cv_movein_timing",
                "cv_ltv_internal_score",
                "cv_existing_loan_amount",
                "cv_recent_delinquency",
                "cv_card_loan_usage",
                "cv_loan_rejection",
                "cv_monthly_income_range",
                "cv_existing_monthly_repayment",
              ].join(","))
              .eq("id", userId)
              .single(),
            supabase
              .from("condition_validation_requests")
              .select(
                "available_cash_manwon, monthly_income_manwon, owned_house_count, credit_grade, purchase_purpose, input_payload",
              )
              .eq("customer_id", userId)
              .order("requested_at", { ascending: false })
              .limit(1),
          ]);

        if (profileError) {
          console.error("[useRecommendations] profile load failed:", profileError);
        }
        if (requestError) {
          console.error("[useRecommendations] request load failed:", requestError);
        }

        const latestRequest =
          ((requests?.[0] ?? null) as RecommendationRequestRow) ?? null;

        if (active && profile) {
          const p = profile as unknown as RecommendationProfilePresetRow;
          const sessionSnapshot = loadConditionSession();
          const draftSnapshot = loadRecommendationConditionDraft();
          const useProfile = hasStoredProfileCondition(p);
          setHasSavedConditionPreset(useProfile);
          const source = pickLoggedInConditionSource({
            hasProfile: useProfile,
            hasRequest: Boolean(latestRequest),
            hasDraft: Boolean(draftSnapshot),
            hasSession: Boolean(sessionSnapshot),
          });

          const nextCondition = normalizeInputCondition(
            source === "profile"
              ? conditionFromProfile(p, DEFAULT_CONDITION)
              : source === "request" && latestRequest
                ? conditionFromRequest(latestRequest, DEFAULT_CONDITION)
                : source === "draft" && draftSnapshot
                  ? normalizeInputCondition(conditionFromSession(draftSnapshot, DEFAULT_CONDITION))
                  : source === "session" && sessionSnapshot
                    ? conditionFromSession(sessionSnapshot, DEFAULT_CONDITION)
                    : DEFAULT_CONDITION,
          );
          setCondition(nextCondition);
          const cachedRecommendations = consumeRecommendationPrefetchCache(
            nextCondition,
            true,
          );
          const hasCachedRecommendations = Boolean(cachedRecommendations);
          if (hasCachedRecommendations) {
            setRawRecommendations(cachedRecommendations as RawRecommendationItem[]);
            setHasEvaluatedOnce(true);
          }
          restoredConditionForAutoEvalRef.current = source !== "default";
          autoEvaluatedOnEntryRef.current = hasCachedRecommendations;

          if (useProfile) {
            setSavedConditionPreset((prev) =>
              buildSavedConditionBaseline(
                conditionFromProfile(p, prev ?? DEFAULT_CONDITION),
              ),
            );
          } else {
            setSavedConditionPreset(null);
          }

          if (draftSnapshot) {
            clearRecommendationConditionDraft();
          }
        } else if (active) {
          setHasSavedConditionPreset(false);
          setSavedConditionPreset(null);
          const draftSnapshot = loadRecommendationConditionDraft();
          const sessionSnapshot = loadConditionSession();
          const source = pickLoggedInConditionSource({
            hasProfile: false,
            hasRequest: Boolean(latestRequest),
            hasDraft: Boolean(draftSnapshot),
            hasSession: Boolean(sessionSnapshot),
          });
          if (source === "request" && latestRequest) {
            setCondition((prev) =>
              normalizeInputCondition(conditionFromRequest(latestRequest, prev)),
            );
          } else if (source === "draft" && draftSnapshot) {
            setCondition((prev) =>
              normalizeInputCondition(conditionFromSession(draftSnapshot, prev)),
            );
            clearRecommendationConditionDraft();
          } else if (source === "session" && sessionSnapshot) {
            setCondition((prev) =>
              normalizeInputCondition(conditionFromSession(sessionSnapshot, prev)),
            );
          }
          restoredConditionForAutoEvalRef.current = source !== "default";
          autoEvaluatedOnEntryRef.current = false;
          setHasEvaluatedOnce(false);
        }
      }
      setIsBootstrapping(false);
    }

    void load();

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
      abortControllerRef.current?.abort();
    };
  }, [supabase]);

  useEffect(() => {
    const previousIsLoggedIn = previousIsLoggedInRef.current;
    previousIsLoggedInRef.current = isLoggedIn;

    if (previousIsLoggedIn !== true || isLoggedIn !== false) return;

    setHasSavedConditionPreset(false);
    setSavedConditionPreset(null);
    clearConditionSession();
    clearRecommendationConditionDraft();
    setCondition(sanitizeGuestCondition(DEFAULT_CONDITION));
    setRawRecommendations([]);
    setSelectedId(null);
    setRequestError(null);
    setValidationError(null);
    hasUserTriggeredEvaluationRef.current = false;
    skipAutoEvalRef.current = false;
    restoredConditionForAutoEvalRef.current = false;
    autoEvaluatedOnEntryRef.current = false;
    setHasEvaluatedOnce(false);
  }, [isLoggedIn]);

  const metadataById = useMemo(() => {
    const map = new Map<number, OfferingMeta>();

    for (const row of rows) {
      const loc0 = row.property_locations?.[0] ?? null;
      const offering = mapPropertyRowToOffering(row, {
        addressShort: UXCopy.addressShort,
        regionShort: UXCopy.regionShort,
      });

      map.set(row.id, {
        offering,
        propertyType: row.property_type ?? null,
        rawStatus: row.status ?? null,
        regionSido: pickFirstNonEmpty(loc0?.region_1depth),
        regionSigungu: pickFirstNonEmpty(
          loc0?.region_2depth,
          loc0?.region_3depth,
        ),
      });
    }

    return map;
  }, [rows]);

  const results = useMemo(
    () =>
      rawRecommendations
        .map((item) => mergeRecommendationItem(item, metadataById))
        .filter((item): item is RecommendationItem => Boolean(item)),
    [metadataById, rawRecommendations],
  );

  const selectedItem = useMemo(
    () =>
      selectedId === null
        ? null
        : results.find((item) => item.property.id === selectedId) ?? null,
    [results, selectedId],
  );

  useEffect(() => {
    if (selectedId === null) return;

    const exists = results.some((item) => item.property.id === selectedId);
    if (!exists) {
      setSelectedId(null);
    }
  }, [results, selectedId]);

  const isConditionDirty = useMemo(
    () => !isSameSavedCondition(condition, savedConditionPreset),
    [condition, savedConditionPreset],
  );

  const runEvaluate = useCallback(async (nextCondition: RecommendationCondition) => {
    const seq = requestSeqRef.current + 1;
    requestSeqRef.current = seq;

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setRequestError(null);
    setIsEvaluating(true);

    try {
      const resolvedCreditGrade = resolveCreditGrade(nextCondition);
      if (resolvedCreditGrade === null) {
        setRequestError("신용 상태를 선택해주세요.");
        return false;
      }

      const response = await fetch("/api/condition-validation/recommend", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          customer: {
            available_cash: nextCondition.availableCash,
            monthly_income: nextCondition.monthlyIncome,
            credit_grade: resolvedCreditGrade,
            monthly_expenses: nextCondition.monthlyExpenses,
            employment_type: nextCondition.employmentType ?? "employee",
            house_ownership: nextCondition.houseOwnership ?? "none",
            purchase_purpose_v2: nextCondition.purchasePurposeV2 ?? "residence",
            purchase_timing: nextCondition.purchaseTiming ?? "over_1year",
            movein_timing: nextCondition.moveinTiming ?? "anytime",
            ltv_internal_score: nextCondition.ltvInternalScore,
            existing_monthly_repayment:
              nextCondition.existingMonthlyRepayment ?? "none",
          },
          options: {
            guest_mode: isLoggedIn === false,
            include_red: false,
            limit: 60,
          },
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | RawRecommendationResponse
        | null;

      if (controller.signal.aborted || seq !== requestSeqRef.current) {
        return false;
      }

      if (!response.ok || !payload?.ok) {
        setRequestError(
          payload?.error?.message ??
            "추천 현장 계산 중 오류가 발생했습니다.",
        );
        return false;
      }

      setHasEvaluatedOnce(true);
      setRawRecommendations(
        Array.isArray(payload.recommendations) ? payload.recommendations : [],
      );
      return true;
    } catch (error) {
      if (
        controller.signal.aborted ||
        seq !== requestSeqRef.current
      ) {
        return false;
      }

      const message =
        error instanceof Error && error.message
          ? error.message
          : "추천 현장 계산 중 네트워크 오류가 발생했습니다.";
      setRequestError(message);
      return false;
    } finally {
      if (seq === requestSeqRef.current) {
        setIsEvaluating(false);
      }
    }
  }, [isLoggedIn]);

  const isReadyToEvaluate =
    condition.availableCash > 0 &&
    condition.monthlyIncome > 0 &&
    condition.houseOwnership !== null &&
    condition.purchasePurposeV2 !== null &&
    (isLoggedIn ? condition.ltvInternalScore > 0 : condition.creditGrade !== null);

  useEffect(() => {
    if (!shouldAutoEvaluateRecommendations({
      isBootstrapping,
      hasRestoredCondition: restoredConditionForAutoEvalRef.current,
      alreadyAutoEvaluated: autoEvaluatedOnEntryRef.current,
      isReadyToEvaluate,
    })) {
      return;
    }

    const timer = setTimeout(() => {
      autoEvaluatedOnEntryRef.current = true;
      void runEvaluate(condition);
    }, 400);

    return () => clearTimeout(timer);
  }, [condition, isBootstrapping, isReadyToEvaluate, runEvaluate]);

  const updateCondition = useCallback(
    (patch: Partial<RecommendationCondition>) => {
      setValidationError(null);
      setCondition((prev) => {
        const nextCondition = {
          ...prev,
          ...patch,
        };

        const normalized = mode === "sim"
          ? normalizeSimulatorCondition(nextCondition, isLoggedIn)
          : normalizeInputCondition(nextCondition);

        return isLoggedIn ? normalized : sanitizeGuestCondition(normalized);
      });
    },
    [isLoggedIn, mode],
  );

  const evaluate = useCallback(async (override?: RecommendationCondition) => {
    const isSimulatorOverride = override != null && mode === "sim";
    const evalCondition =
      override == null
        ? condition
        : mode === "sim"
          ? normalizeSimulatorCondition(override, isLoggedIn)
          : normalizeInputCondition(override);

    if (!Number.isFinite(evalCondition.availableCash) || evalCondition.availableCash < 0) {
      setValidationError("가용 현금을 확인해주세요.");
      return false;
    }
    if (!Number.isFinite(evalCondition.monthlyIncome) || evalCondition.monthlyIncome < 0) {
      setValidationError("월 소득을 확인해주세요.");
      return false;
    }

    setValidationError(null);
    hasUserTriggeredEvaluationRef.current = true;
    setHasEvaluatedOnce(true);
    if (override != null && !isSimulatorOverride) {
      skipAutoEvalRef.current = true;
      setCondition(isLoggedIn ? evalCondition : sanitizeGuestCondition(evalCondition));
    }
    if (!isSimulatorOverride) {
      saveConditionSession(
        buildConditionSession(
          isLoggedIn ? evalCondition : sanitizeGuestCondition(evalCondition),
        ),
      );
    }
    restoredConditionForAutoEvalRef.current = false;
    autoEvaluatedOnEntryRef.current = true;
    return runEvaluate(evalCondition);
  }, [condition, isLoggedIn, mode, runEvaluate]);

  const changeMode = useCallback((nextMode: RecommendationMode) => {
    setValidationError(null);
    setMode(nextMode);
  }, []);

  const saveCondition = useCallback(async (): Promise<boolean> => {
    if (!isLoggedIn) return false;
    setIsSavingCondition(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { error, data: updated } = await supabase
        .from("profiles")
        .update({
          cv_available_cash_manwon: condition.availableCash || null,
          cv_monthly_income_manwon: condition.monthlyIncome || null,
          cv_employment_type: condition.employmentType,
          cv_monthly_expenses_manwon: condition.monthlyExpenses || null,
          cv_house_ownership: condition.houseOwnership,
          cv_purchase_purpose_v2: condition.purchasePurposeV2,
          cv_purchase_timing: condition.purchaseTiming,
          cv_movein_timing: condition.moveinTiming,
          cv_ltv_internal_score: condition.ltvInternalScore > 0 ? condition.ltvInternalScore : null,
          cv_existing_loan_amount: condition.existingLoan,
          cv_recent_delinquency: condition.recentDelinquency,
          cv_card_loan_usage: condition.cardLoanUsage,
          cv_loan_rejection: condition.loanRejection,
          cv_monthly_income_range: condition.monthlyIncomeRange,
          cv_existing_monthly_repayment: condition.existingMonthlyRepayment,
        })
        .eq("id", user.id)
        .select("id");

      if (error) {
        console.error("[saveCondition] profiles update failed:", error);
      }
      if (!error && (!updated || updated.length === 0)) {
        console.warn("[saveCondition] profiles update: 0 rows affected (RLS blocked or row missing)");
      }
      const saved = !error && Array.isArray(updated) && updated.length > 0;
      if (saved) {
        setHasSavedConditionPreset(true);
        setSavedConditionPreset(buildSavedConditionBaseline(condition));
        clearRecommendationConditionDraft();
      }
      return saved;
    } finally {
      setIsSavingCondition(false);
    }
  }, [condition, isLoggedIn, supabase]);

  const loginAndSaveCondition = useCallback(() => {
    const snapshot = buildConditionSession(condition);
    saveConditionSession(snapshot);

    try {
      window.localStorage.setItem(
        RECOMMENDATION_CONDITION_DRAFT_STORAGE_KEY,
        JSON.stringify({
          snapshot,
          saved_at: new Date().toISOString(),
        } satisfies RecommendationConditionDraft),
      );
    } catch {
      // ignore storage failure
    }

    router.push("/auth/login?next=/recommendations");
  }, [condition, router]);

  const restoreSavedCondition = useCallback(() => {
    if (!savedConditionPreset) return false;

    setValidationError(null);
    setCondition(savedConditionPreset);
    saveConditionSession(buildConditionSession(savedConditionPreset));
    return true;
  }, [savedConditionPreset]);

  return {
    condition,
    mode,
    results,
    selectedId,
    selectedItem,
    isBootstrapping,
    isEvaluating,
    isLoggedIn,
    catalogError,
    requestError,
    validationError,
    changeMode,
    updateCondition,
    evaluate,
    saveCondition,
    loginAndSaveCondition,
    restoreSavedCondition,
    isSavingCondition,
    hasSavedConditionPreset,
    hasEvaluatedOnce,
    isConditionDirty,
    setSelectedId,
  };
}
