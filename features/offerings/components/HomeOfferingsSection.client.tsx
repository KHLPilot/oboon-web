"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import ConditionBar, { type ConditionChip } from "@/components/ui/ConditionBar";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { type SelectOption } from "@/components/ui/Select";
import { ArrowRight, BusFront, GraduationCap, PawPrint, Pickaxe, SlidersHorizontal } from "lucide-react";
import ConditionDirtyBanner from "@/features/condition-validation/components/ConditionDirtyBanner";
import type {
  CardLoanUsage,
  CreditGrade,
  DelinquencyCount,
  EmploymentType,
  ExistingLoanAmount,
  FinalGrade5,
  FullPurchasePurpose,
  LoanRejection,
  MonthlyLoanRepayment,
  MonthlyIncomeRange,
  MoveinTiming,
  PurchaseTiming,
} from "@/features/condition-validation/domain/types";
import {
  clearConditionSession,
  loadConditionSession,
  saveConditionSession,
  sanitizeGuestConditionSessionSnapshot,
  type ConditionSessionSnapshot,
} from "@/features/condition-validation/lib/sessionCondition";
import {
  creditGradeFromLtvInternalScore,
  ltvInternalScoreFromCreditGrade,
} from "@/features/condition-validation/domain/conditionState";
import {
  pickLoggedInConditionSource,
  pickLoggedOutConditionSource,
} from "@/features/condition-validation/lib/conditionSourcePolicy";
import type { ConditionCategoryGrades } from "@/features/condition-validation/domain/types";
import OfferingCard from "@/features/offerings/components/OfferingCard";
import { OfferingCardSkeleton } from "@/features/offerings/components/OfferingCardSkeleton";
import { OFFERING_REGION_TABS } from "@/features/offerings/domain/offering.constants";
import type { OfferingRegionTab } from "@/features/offerings/domain/offering.types";
import {
  mapPropertyRowToOffering,
  type PropertyRow,
} from "@/features/offerings/mappers/offering.mapper";
import { fetchPropertiesForOfferings } from "@/features/offerings/services/offering.query";
import ConditionWizard from "@/features/recommendations/components/ConditionWizard";
import FlippableRecommendationCard from "@/features/recommendations/components/FlippableRecommendationCard";
import { RecommendationPreviewContent } from "@/features/recommendations/components/GaugeOverlay";
import type {
  RecommendationCondition,
  RecommendationItem,
} from "@/features/recommendations/hooks/useRecommendations";
import { normalizeRecommendationUnitTypes } from "@/features/recommendations/lib/recommendationUnitTypes";
import { EmptyState } from "@/components/ui/EmptyState";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { formatManwonPreview } from "@/lib/format/currency";
import { formatPriceRange } from "@/shared/price";
import { Copy } from "@/shared/copy";
import { toKoreanErrorMessage } from "@/shared/errorMessage";
import { UXCopy } from "@/shared/uxCopy";
import { ROUTES, type Offering } from "@/types/index";

const CREDIT_GRADE_OPTIONS: Array<{ value: CreditGrade; label: string }> = [
  { value: "good", label: "양호" },
  { value: "normal", label: "보통" },
  { value: "unstable", label: "불안정" },
];

const EMPLOYMENT_TYPE_OPTIONS: Array<{ value: EmploymentType; label: string }> = [
  { value: "employee", label: "직장인" },
  { value: "self_employed", label: "자영업" },
  { value: "freelancer", label: "프리랜서" },
  { value: "other", label: "기타" },
];

const HOUSE_OWNERSHIP_OPTIONS: Array<{
  value: "none" | "one" | "two_or_more";
  label: string;
}> = [
  { value: "none", label: "무주택" },
  { value: "one", label: "1주택" },
  { value: "two_or_more", label: "2주택이상" },
];

const PURPOSE_V2_OPTIONS: Array<{ value: FullPurchasePurpose; label: string }> = [
  { value: "residence", label: "실거주" },
  { value: "investment_rent", label: "투자(임대)" },
  { value: "investment_capital", label: "투자(시세)" },
  { value: "long_term", label: "실거주+투자" },
];

const PURCHASE_TIMING_OPTIONS: Array<SelectOption<PurchaseTiming>> = [
  { value: "within_3months", label: "3개월 이내" },
  { value: "within_6months", label: "6개월 이내" },
  { value: "within_1year", label: "1년 이내" },
  { value: "over_1year", label: "1년 이상" },
  { value: "by_property", label: "현장에 따라" },
];

const MOVEIN_TIMING_OPTIONS: Array<SelectOption<MoveinTiming>> = [
  { value: "immediate", label: "즉시입주" },
  { value: "within_1year", label: "1년 이내" },
  { value: "within_2years", label: "2년 이내" },
  { value: "within_3years", label: "3년 이내" },
  { value: "anytime", label: "언제든지" },
];

type HomeOfferingView = "consult" | "condition";

type ConditionValidationRequestRow = {
  id: string | number;
  available_cash_manwon: number;
  monthly_income_manwon: number;
  owned_house_count: number;
  credit_grade: "good" | "normal" | "unstable";
  purchase_purpose: "residence" | "investment" | "both";
  input_payload?: unknown;
};

type HomeRecommendationCustomerPayload = {
  available_cash: number;
  monthly_income: number;
  monthly_expenses: number;
  employment_type: EmploymentType;
  house_ownership: "none" | "one" | "two_or_more";
  purchase_purpose_v2: FullPurchasePurpose;
  purchase_timing: PurchaseTiming;
  movein_timing: MoveinTiming;
  ltv_internal_score: number;
  existing_loan: ExistingLoanAmount | null;
  recent_delinquency: DelinquencyCount | null;
  card_loan_usage: CardLoanUsage | null;
  loan_rejection: LoanRejection | null;
  monthly_income_range: MonthlyIncomeRange | null;
  existing_monthly_repayment: MonthlyLoanRepayment | null;
};

type HomeConditionDraft = {
  snapshot?: ConditionSessionSnapshot;
  customer?: unknown;
  regions?: OfferingRegionTab[];
  saved_at?: string;
};

const HOME_CONDITION_DRAFT_STORAGE_KEY = "oboon:home-condition-draft";

type SavedConditionPresetState = {
  available_cash: number | null;
  monthly_income: number | null;
  monthly_expenses: number | null;
  employment_type: EmploymentType | null;
  house_ownership: "none" | "one" | "two_or_more" | null;
  purchase_purpose_v2: FullPurchasePurpose | null;
  purchase_timing: PurchaseTiming | null;
  movein_timing: MoveinTiming | null;
  ltv_internal_score: number;
  existing_loan_amount: ExistingLoanAmount | null;
  recent_delinquency: DelinquencyCount | null;
  card_loan_usage: CardLoanUsage | null;
  loan_rejection: LoanRejection | null;
  monthly_income_range: MonthlyIncomeRange | null;
  existing_monthly_repayment: MonthlyLoanRepayment | null;
};

const HOME_OFFERING_LIMIT = 4;

type ConditionValidationProfilePresetRow = {
  cv_available_cash_manwon: number | null;
  cv_monthly_income_manwon: number | null;
  cv_owned_house_count: number | null;
  cv_credit_grade: "good" | "normal" | "unstable" | null;
  cv_purchase_purpose: "residence" | "investment" | "both" | null;
  // New v2 fields
  cv_employment_type: EmploymentType | null;
  cv_monthly_expenses_manwon: number | null;
  cv_house_ownership: "none" | "one" | "two_or_more" | null;
  cv_purchase_purpose_v2: FullPurchasePurpose | null;
  cv_purchase_timing: PurchaseTiming | null;
  cv_movein_timing: MoveinTiming | null;
  cv_ltv_internal_score: number | null;
  cv_existing_loan_amount: ExistingLoanAmount | null;
  cv_recent_delinquency: DelinquencyCount | null;
  cv_card_loan_usage: CardLoanUsage | null;
  cv_loan_rejection: LoanRejection | null;
  cv_monthly_income_range: MonthlyIncomeRange | null;
  cv_existing_monthly_repayment: MonthlyLoanRepayment | null;
};

type HomeRawCategory = {
  grade?: string;
  score?: number | null;
} | null | undefined;

type HomeRawRecommendation = {
  property_id?: number | string;
  final_grade?: string;
  grade_label?: string | null;
  total_score?: number | null;
  action?: string | null;
  summary_message?: string | null;
  reason_messages?: string[] | null;
  show_detailed_metrics?: boolean;
  categories?: {
    cash?: HomeRawCategory;
    income?: HomeRawCategory;
    ltv_dsr?: HomeRawCategory;
    ownership?: HomeRawCategory;
    purpose?: HomeRawCategory;
    timing?: HomeRawCategory;
  } | null;
  metrics?: {
    list_price?: number | null;
    min_cash?: number | null;
    recommended_cash?: number | null;
    monthly_payment_est?: number | null;
    monthly_burden_percent?: number | null;
  } | null;
  unit_type_results?: unknown[] | null;
};

const HOME_CASH_MAX_SCORE = 30;
const HOME_INCOME_MAX_SCORE = 25;
const HOME_LTV_DSR_MAX_SCORE = 20;
const HOME_OWNERSHIP_MAX_SCORE = 10;
const HOME_PURPOSE_MAX_SCORE = 5;
const HOME_TIMING_MAX_SCORE = 10;

const DEFAULT_EMPLOYMENT_TYPE: EmploymentType = "employee";
const DEFAULT_HOUSE_OWNERSHIP: "none" | "one" | "two_or_more" = "none";
const DEFAULT_PURCHASE_PURPOSE_V2: FullPurchasePurpose = "residence";
const DEFAULT_PURCHASE_TIMING: PurchaseTiming = "over_1year";
const DEFAULT_MOVEIN_TIMING: MoveinTiming = "anytime";
const DEFAULT_EXISTING_MONTHLY_REPAYMENT: MonthlyLoanRepayment | null = null;

function formatConditionRegionSummary(regions: OfferingRegionTab[]): string | null {
  if (regions.length === 0) return null;
  if (regions.length === 1) return regions[0];
  return `${regions[0]} 외 ${regions.length - 1}개`;
}

function buildAppliedConditionChips(args: {
  customer: {
    available_cash: number;
    monthly_income: number;
    monthly_expenses: number;
    house_ownership: "none" | "one" | "two_or_more" | null;
    purchase_purpose_v2: FullPurchasePurpose | null;
    employment_type: EmploymentType | null;
    ltv_internal_score: number;
    purchase_timing: PurchaseTiming | null;
    movein_timing: MoveinTiming | null;
  };
  guestMode: boolean;
  resolvedGuestCreditGrade: CreditGrade | null;
  conditionRegions: OfferingRegionTab[];
}): ConditionChip[] {
  const { customer, guestMode, resolvedGuestCreditGrade, conditionRegions } = args;
  const chips: ConditionChip[] = [];

  if (customer.available_cash > 0) {
    chips.push({
      key: "cash",
      label: "현금",
      value: formatManwonPreview(customer.available_cash),
    });
  }

  if (customer.monthly_income > 0) {
    chips.push({
      key: "income",
      label: "소득",
      value: formatManwonPreview(customer.monthly_income),
    });
  }

  const houseOpt = HOUSE_OWNERSHIP_OPTIONS.find(
    (option) => option.value === customer.house_ownership,
  );
  if (houseOpt) {
    chips.push({
      key: "house",
      label: "",
      value: houseOpt.label,
    });
  }

  const purposeOpt = PURPOSE_V2_OPTIONS.find(
    (option) => option.value === customer.purchase_purpose_v2,
  );
  if (purposeOpt) {
    chips.push({
      key: "purpose",
      label: "",
      value: purposeOpt.label,
    });
  }

  if (guestMode) {
    const creditOpt = CREDIT_GRADE_OPTIONS.find(
      (option) => option.value === resolvedGuestCreditGrade,
    );
    if (creditOpt) {
      chips.push({
        key: "credit_guest",
        label: "신용",
        value: creditOpt.label,
      });
    }
  } else {
    const empOpt = EMPLOYMENT_TYPE_OPTIONS.find(
      (option) => option.value === customer.employment_type,
    );
    if (empOpt) {
      chips.push({
        key: "employment",
        label: "",
        value: empOpt.label,
      });
    }

    if (customer.monthly_expenses > 0) {
      chips.push({
        key: "expenses",
        label: "지출",
        value: formatManwonPreview(customer.monthly_expenses),
      });
    }

    if (customer.ltv_internal_score > 0) {
      chips.push({
        key: "credit",
        label: "신용",
        value: `${customer.ltv_internal_score}점`,
      });
    }

    const timingOpt = PURCHASE_TIMING_OPTIONS.find(
      (option) => option.value === customer.purchase_timing,
    );
    if (timingOpt) {
      chips.push({
        key: "timing",
        label: "",
        value: timingOpt.label,
      });
    }

    const moveinOpt = MOVEIN_TIMING_OPTIONS.find(
      (option) => option.value === customer.movein_timing,
    );
    if (moveinOpt) {
      chips.push({
        key: "movein",
        label: "",
        value: moveinOpt.label,
      });
    }

    const regionSummary = formatConditionRegionSummary(conditionRegions);
    if (regionSummary) {
      chips.push({
        key: "region",
        label: "지역",
        value: regionSummary,
      });
    }
  }

  return chips;
}

function parseNullableNumericInput(value: string): number | null {
  const normalized = value.replaceAll(",", "").trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

function isValidEmploymentType(value: unknown): value is EmploymentType {
  return (
    value === "employee" ||
    value === "self_employed" ||
    value === "freelancer" ||
    value === "other"
  );
}

function isValidHouseOwnership(
  value: unknown,
): value is "none" | "one" | "two_or_more" {
  return value === "none" || value === "one" || value === "two_or_more";
}

function isValidFullPurchasePurpose(value: unknown): value is FullPurchasePurpose {
  return (
    value === "residence" ||
    value === "investment_rent" ||
    value === "investment_capital" ||
    value === "long_term"
  );
}

function isValidPurchaseTiming(value: unknown): value is PurchaseTiming {
  return (
    value === "by_property" ||
    value === "over_1year" ||
    value === "within_1year" ||
    value === "within_6months" ||
    value === "within_3months"
  );
}

function isValidMoveinTiming(value: unknown): value is MoveinTiming {
  return (
    value === "anytime" ||
    value === "within_3years" ||
    value === "within_2years" ||
    value === "within_1year" ||
    value === "immediate"
  );
}

function isValidMonthlyLoanRepayment(value: unknown): value is MonthlyLoanRepayment {
  return (
    value === "none" ||
    value === "under_50" ||
    value === "50to100" ||
    value === "100to200" ||
    value === "over_200"
  );
}

function toUnknownRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function toNonNegativeInt(value: unknown): number | null {
  const parsed = toFiniteNumber(value);
  if (parsed === null || parsed < 0) return null;
  return Math.round(parsed);
}

function houseOwnershipFromOwnedHouseCount(
  value: unknown,
): "none" | "one" | "two_or_more" | null {
  const count = toNonNegativeInt(value);
  if (count === null) return null;
  if (count >= 2) return "two_or_more";
  if (count === 1) return "one";
  return "none";
}

function ownedHouseCountFromHouseOwnership(
  value: "none" | "one" | "two_or_more",
): number {
  if (value === "two_or_more") return 2;
  if (value === "one") return 1;
  return 0;
}

function purchasePurposeV2FromLegacy(value: unknown): FullPurchasePurpose | null {
  if (value === "residence") return "residence";
  if (value === "investment") return "investment_capital";
  if (value === "both") return "long_term";
  return null;
}

function legacyPurchasePurposeFromV2(
  value: FullPurchasePurpose,
): "residence" | "investment" | "both" {
  if (value === "long_term") return "both";
  if (value === "investment_rent" || value === "investment_capital") {
    return "investment";
  }
  return "residence";
}

function formatStoredAmount(value: number): string {
  return Math.max(0, Math.round(value)).toLocaleString("ko-KR");
}

function isCreditGrade(value: unknown): value is CreditGrade {
  return value === "good" || value === "normal" || value === "unstable";
}

function buildCustomerPayloadFromRaw(
  raw: Record<string, unknown> | null,
): HomeRecommendationCustomerPayload | null {
  if (!raw) return null;

  const availableCash = toNonNegativeInt(raw.available_cash);
  const monthlyIncome = toNonNegativeInt(raw.monthly_income);
  if (availableCash === null || monthlyIncome === null) {
    return null;
  }

  const houseOwnership =
    isValidHouseOwnership(raw.house_ownership)
      ? raw.house_ownership
      : houseOwnershipFromOwnedHouseCount(raw.owned_house_count) ?? DEFAULT_HOUSE_OWNERSHIP;
  const purchasePurposeV2 =
    isValidFullPurchasePurpose(raw.purchase_purpose_v2)
      ? raw.purchase_purpose_v2
      : purchasePurposeV2FromLegacy(raw.purchase_purpose) ?? DEFAULT_PURCHASE_PURPOSE_V2;
  const ltvInternalScore =
    Math.min(
      100,
      Math.max(
        0,
        toNonNegativeInt(raw.ltv_internal_score) ??
          ltvInternalScoreFromCreditGrade(isCreditGrade(raw.credit_grade) ? raw.credit_grade : null) ??
          0,
      ),
    );

  return {
    available_cash: availableCash,
    monthly_income: monthlyIncome,
    monthly_expenses: toNonNegativeInt(raw.monthly_expenses) ?? 0,
    employment_type: isValidEmploymentType(raw.employment_type)
      ? raw.employment_type
      : DEFAULT_EMPLOYMENT_TYPE,
    house_ownership: houseOwnership,
    purchase_purpose_v2: purchasePurposeV2,
    purchase_timing: isValidPurchaseTiming(raw.purchase_timing)
      ? raw.purchase_timing
      : DEFAULT_PURCHASE_TIMING,
    movein_timing: isValidMoveinTiming(raw.movein_timing)
      ? raw.movein_timing
      : DEFAULT_MOVEIN_TIMING,
    ltv_internal_score: ltvInternalScore,
    existing_loan:
      raw.existing_loan === "none" ||
      raw.existing_loan === "under_1eok" ||
      raw.existing_loan === "1to3eok" ||
      raw.existing_loan === "over_3eok"
        ? raw.existing_loan
        : null,
    recent_delinquency:
      raw.recent_delinquency === "none" ||
      raw.recent_delinquency === "once" ||
      raw.recent_delinquency === "twice_or_more"
        ? raw.recent_delinquency
        : null,
    card_loan_usage:
      raw.card_loan_usage === "none" ||
      raw.card_loan_usage === "1to2" ||
      raw.card_loan_usage === "3_or_more"
        ? raw.card_loan_usage
        : null,
    loan_rejection:
      raw.loan_rejection === "none" || raw.loan_rejection === "yes"
        ? raw.loan_rejection
        : null,
    monthly_income_range:
      raw.monthly_income_range === "under_200" ||
      raw.monthly_income_range === "200to300" ||
      raw.monthly_income_range === "300to500" ||
      raw.monthly_income_range === "500to700" ||
      raw.monthly_income_range === "over_700"
        ? raw.monthly_income_range
        : null,
    existing_monthly_repayment: isValidMonthlyLoanRepayment(raw.existing_monthly_repayment)
      ? raw.existing_monthly_repayment
      : DEFAULT_EXISTING_MONTHLY_REPAYMENT,
  };
}

function buildCustomerFromSavedRow(
  source:
    | ConditionValidationRequestRow
    | ConditionValidationProfilePresetRow
    | null,
): HomeRecommendationCustomerPayload | null {
  if (!source) return null;

  if ("available_cash_manwon" in source) {
    const payloadRecord = toUnknownRecord(source.input_payload);
    const payloadCustomer = buildCustomerPayloadFromRaw(
      toUnknownRecord(payloadRecord?.customer),
    );
    if (payloadCustomer) return payloadCustomer;

    return buildCustomerPayloadFromRaw({
      available_cash: source.available_cash_manwon,
      monthly_income: source.monthly_income_manwon,
      owned_house_count: source.owned_house_count,
      credit_grade: source.credit_grade,
      purchase_purpose: source.purchase_purpose,
    });
  }

  return buildCustomerPayloadFromRaw({
    available_cash: source.cv_available_cash_manwon,
    monthly_income: source.cv_monthly_income_manwon,
    monthly_expenses: source.cv_monthly_expenses_manwon,
    employment_type: source.cv_employment_type,
    house_ownership:
      source.cv_house_ownership ?? houseOwnershipFromOwnedHouseCount(source.cv_owned_house_count),
    purchase_purpose_v2:
      source.cv_purchase_purpose_v2 ?? purchasePurposeV2FromLegacy(source.cv_purchase_purpose),
    purchase_timing: source.cv_purchase_timing,
    movein_timing: source.cv_movein_timing,
    ltv_internal_score:
      source.cv_ltv_internal_score ?? ltvInternalScoreFromCreditGrade(source.cv_credit_grade),
    existing_monthly_repayment: source.cv_existing_monthly_repayment,
  });
}

function buildCustomerFromSessionSnapshot(
  snapshot: ConditionSessionSnapshot | null,
): HomeRecommendationCustomerPayload | null {
  if (!snapshot) return null;

  const availableCash = parseNullableNumericInput(snapshot.availableCash);
  const monthlyIncome = parseNullableNumericInput(snapshot.monthlyIncome);
  if (availableCash === null || monthlyIncome === null) {
    return null;
  }

  return {
    available_cash: Math.max(0, Math.round(availableCash)),
    monthly_income: Math.max(0, Math.round(monthlyIncome)),
    monthly_expenses: parseNullableNumericInput(snapshot.monthlyExpenses) ?? 0,
    employment_type: snapshot.employmentType ?? DEFAULT_EMPLOYMENT_TYPE,
    house_ownership: snapshot.houseOwnership ?? DEFAULT_HOUSE_OWNERSHIP,
    purchase_purpose_v2: snapshot.purchasePurposeV2 ?? DEFAULT_PURCHASE_PURPOSE_V2,
    purchase_timing: snapshot.purchaseTiming ?? DEFAULT_PURCHASE_TIMING,
    movein_timing: snapshot.moveinTiming ?? DEFAULT_MOVEIN_TIMING,
    ltv_internal_score: Math.min(100, Math.max(0, snapshot.ltvInternalScore)),
    existing_loan: snapshot.existingLoan,
    recent_delinquency: snapshot.recentDelinquency,
    card_loan_usage: snapshot.cardLoanUsage,
    loan_rejection: snapshot.loanRejection,
    monthly_income_range: snapshot.monthlyIncomeRange,
    existing_monthly_repayment:
      snapshot.existingMonthlyRepayment ?? DEFAULT_EXISTING_MONTHLY_REPAYMENT,
  };
}

function sanitizeGuestConditionSnapshot(
  snapshot: ConditionSessionSnapshot,
): ConditionSessionSnapshot {
  return sanitizeGuestConditionSessionSnapshot(snapshot);
}

function loadHomeConditionDraft(): HomeConditionDraft | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(HOME_CONDITION_DRAFT_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as HomeConditionDraft;
  } catch {
    return null;
  }
}

function clearHomeConditionDraft(): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(HOME_CONDITION_DRAFT_STORAGE_KEY);
  } catch {
    // ignore storage cleanup failure
  }
}

function buildSavedConditionPresetSnapshot(
  profileData: ConditionValidationProfilePresetRow,
  customer: HomeRecommendationCustomerPayload,
): SavedConditionPresetState {
  const effectiveHouseOwnership =
    profileData.cv_house_ownership ??
    houseOwnershipFromOwnedHouseCount(profileData.cv_owned_house_count);
  const effectivePurposeV2 =
    profileData.cv_purchase_purpose_v2 ??
    purchasePurposeV2FromLegacy(profileData.cv_purchase_purpose);
  const effectiveLtvScore =
    profileData.cv_ltv_internal_score ??
    ltvInternalScoreFromCreditGrade(profileData.cv_credit_grade) ??
    0;

  return {
    available_cash: customer.available_cash,
    monthly_income: customer.monthly_income,
    monthly_expenses: profileData.cv_monthly_expenses_manwon ?? null,
    employment_type: profileData.cv_employment_type ?? null,
    house_ownership: effectiveHouseOwnership,
    purchase_purpose_v2: effectivePurposeV2,
    purchase_timing: profileData.cv_purchase_timing ?? null,
    movein_timing: profileData.cv_movein_timing ?? null,
    ltv_internal_score: Math.min(100, Math.max(0, effectiveLtvScore)),
    existing_loan_amount: profileData.cv_existing_loan_amount ?? null,
    recent_delinquency: profileData.cv_recent_delinquency ?? null,
    card_loan_usage: profileData.cv_card_loan_usage ?? null,
    loan_rejection: profileData.cv_loan_rejection ?? null,
    monthly_income_range: profileData.cv_monthly_income_range ?? null,
    existing_monthly_repayment:
      profileData.cv_existing_monthly_repayment ?? DEFAULT_EXISTING_MONTHLY_REPAYMENT,
  };
}

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

function toFinalGrade5(value: unknown): FinalGrade5 | null {
  return value === "GREEN" ||
    value === "LIME" ||
    value === "YELLOW" ||
    value === "ORANGE" ||
    value === "RED"
    ? value
    : null;
}

function buildHomePriceLabel(offering: Offering): string {
  if (offering.isPricePrivate) {
    return UXCopy.pricePrivateShort;
  }

  return formatPriceRange(offering.priceMin억, offering.priceMax억, {
    unknownLabel: UXCopy.priceRangeShort,
  });
}

function buildHomeRecommendationItem(
  offering: Offering,
  raw: HomeRawRecommendation,
): RecommendationItem | null {
  const finalGrade = toFinalGrade5(raw.final_grade);
  if (!finalGrade) return null;

  const totalScore = toFiniteNumber(raw.total_score);
  const cashScore = toFiniteNumber(raw.categories?.cash?.score);
  const incomeScore = toFiniteNumber(raw.categories?.income?.score);
  const ltvDsrScore = toFiniteNumber(raw.categories?.ltv_dsr?.score);
  const ownershipScore = toFiniteNumber(raw.categories?.ownership?.score);
  const purposeScore = toFiniteNumber(raw.categories?.purpose?.score);
  const timingScore = toFiniteNumber(raw.categories?.timing?.score);
  const minCash = toFiniteNumber(raw.metrics?.min_cash);
  const listPrice = toFiniteNumber(raw.metrics?.list_price);
  const recommendedCash = toFiniteNumber(raw.metrics?.recommended_cash);
  const monthlyPaymentEst = toFiniteNumber(raw.metrics?.monthly_payment_est);
  const monthlyBurdenPercent = toFiniteNumber(raw.metrics?.monthly_burden_percent);
  const isMasked =
    totalScore === null || cashScore === null || incomeScore === null || minCash === null;

  return {
    offering,
    property: {
      id: Number(offering.id),
      name: offering.title,
      addressShort: offering.addressShort,
      addressFull: offering.addressFull ?? offering.addressShort,
      regionLabel: offering.regionLabel ?? offering.region,
      regionSido:
        offering.regionLabel ?? offering.region ?? UXCopy.regionShort,
      regionSigungu: null,
      propertyType: offering.propertyType ?? null,
      status: offering.statusValue ?? null,
      statusLabel: offering.status,
      imageUrl: offering.imageUrl ?? null,
      lat: typeof offering.lat === "number" ? offering.lat : null,
      lng: typeof offering.lng === "number" ? offering.lng : null,
      priceLabel: buildHomePriceLabel(offering),
    },
    conditionCategories: {
      cash: {
        grade: toFinalGrade5(raw.categories?.cash?.grade) ?? finalGrade,
        score: cashScore ?? undefined,
      },
      burden: {
        grade: toFinalGrade5(raw.categories?.income?.grade) ?? finalGrade,
        score: incomeScore ?? undefined,
      },
      credit: {
        grade: toFinalGrade5(raw.categories?.ltv_dsr?.grade) ?? finalGrade,
        score: ltvDsrScore ?? undefined,
      },
      totalScore: totalScore ?? undefined,
    },
    evalResult: {
      finalGrade,
      gradeLabel: raw.grade_label ?? null,
      totalScore,
      action: typeof raw.action === "string" ? raw.action : null,
      summaryMessage:
        typeof raw.summary_message === "string" && raw.summary_message.trim().length > 0
          ? raw.summary_message
          : "조건을 다시 확인해주세요.",
      reasonMessages: Array.isArray(raw.reason_messages)
        ? raw.reason_messages.filter(
            (reason): reason is string =>
              typeof reason === "string" && reason.trim().length > 0,
          )
        : [],
      showDetailedMetrics: raw.show_detailed_metrics !== false,
      isMasked,
      categories: {
        cash: {
          grade: toFinalGrade5(raw.categories?.cash?.grade) ?? finalGrade,
          score: cashScore,
          maxScore: HOME_CASH_MAX_SCORE,
        },
        income: {
          grade: toFinalGrade5(raw.categories?.income?.grade) ?? finalGrade,
          score: incomeScore,
          maxScore: HOME_INCOME_MAX_SCORE,
        },
        ltvDsr: {
          grade: toFinalGrade5(raw.categories?.ltv_dsr?.grade) ?? finalGrade,
          score: ltvDsrScore,
          maxScore: HOME_LTV_DSR_MAX_SCORE,
        },
        ownership: {
          grade: toFinalGrade5(raw.categories?.ownership?.grade) ?? finalGrade,
          score: ownershipScore,
          maxScore: HOME_OWNERSHIP_MAX_SCORE,
        },
        purpose: {
          grade: toFinalGrade5(raw.categories?.purpose?.grade) ?? finalGrade,
          score: purposeScore,
          maxScore: HOME_PURPOSE_MAX_SCORE,
        },
        timing: {
          grade: toFinalGrade5(raw.categories?.timing?.grade) ?? finalGrade,
          score: timingScore,
          maxScore: HOME_TIMING_MAX_SCORE,
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
    unitTypes: normalizeRecommendationUnitTypes({ unit_type_results: raw.unit_type_results as never }),
    bestUnitType: null,
  };
}

export default function HomeOfferingsSection() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseClient(), []);

  const [rows, setRows] = useState<PropertyRow[]>([]);
  const [rowsLoaded, setRowsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [consultablePropertyIds, setConsultablePropertyIds] = useState<number[]>(
    [],
  );
  const [selectedRegion, setSelectedRegion] =
    useState<OfferingRegionTab>("전체");
  const [conditionRegions, setConditionRegions] = useState<OfferingRegionTab[]>([]);
  const [view, setView] = useState<HomeOfferingView>("consult");
  const [conditionModalOpen, setConditionModalOpen] = useState(false);
  const [availableCash, setAvailableCash] = useState("");
  const [monthlyIncome, setMonthlyIncome] = useState("");
  const [monthlyExpenses, setMonthlyExpenses] = useState("");
  const [employmentType, setEmploymentType] = useState<EmploymentType | null>(null);
  const [houseOwnership, setHouseOwnership] = useState<"none" | "one" | "two_or_more" | null>(null);
  const [purchasePurposeV2, setPurchasePurposeV2] = useState<FullPurchasePurpose | null>(null);
  const [purchaseTiming, setPurchaseTiming] = useState<PurchaseTiming | null>(null);
  const [moveinTiming, setMoveinTiming] = useState<MoveinTiming | null>(null);
  const [ltvInternalScore, setLtvInternalScore] = useState(0);
  const [existingLoan, setExistingLoan] = useState<ExistingLoanAmount | null>(null);
  const [recentDelinquency, setRecentDelinquency] = useState<DelinquencyCount | null>(null);
  const [cardLoanUsage, setCardLoanUsage] = useState<CardLoanUsage | null>(null);
  const [loanRejection, setLoanRejection] = useState<LoanRejection | null>(null);
  const [monthlyIncomeRange, setMonthlyIncomeRange] = useState<MonthlyIncomeRange | null>(null);
  const [existingMonthlyRepayment, setExistingMonthlyRepayment] = useState<MonthlyLoanRepayment | null>(DEFAULT_EXISTING_MONTHLY_REPAYMENT);
  const [conditionError, setConditionError] = useState<string | null>(null);
  const [conditionNotice, setConditionNotice] = useState<string | null>(null);
  const [conditionApplyLoading, setConditionApplyLoading] = useState(false);
  const [conditionSaveLoading, setConditionSaveLoading] = useState(false);
  const [recommendedPropertyIds, setRecommendedPropertyIds] = useState<number[] | null>(null);
  const [recommendedCategoriesById, setRecommendedCategoriesById] = useState<
    Map<number, ConditionCategoryGrades>
  >(new Map());
  const [recommendedRawById, setRecommendedRawById] = useState<
    Map<number, HomeRawRecommendation>
  >(new Map());
  const [appliedConditionChips, setAppliedConditionChips] = useState<ConditionChip[]>([]);
  const [showConditionSetupCard, setShowConditionSetupCard] = useState(true);
  const [homeUserId, setHomeUserId] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [guestCreditGrade, setGuestCreditGrade] = useState<CreditGrade | null>(null);
  const [hasSavedConditionPreset, setHasSavedConditionPreset] = useState(false);
  const [savedConditionPreset, setSavedConditionPreset] =
    useState<SavedConditionPresetState | null>(null);
  const [scrapedPropertyIds, setScrapedPropertyIds] = useState<Set<number>>(new Set());
  const wizardCondition = useMemo<RecommendationCondition>(
    () => ({
      availableCash: parseNullableNumericInput(availableCash) ?? 0,
      monthlyIncome: parseNullableNumericInput(monthlyIncome) ?? 0,
      ownedHouseCount:
        houseOwnership === "two_or_more" ? 2 : houseOwnership === "one" ? 1 : 0,
      creditGrade: guestCreditGrade,
      purchasePurpose:
        purchasePurposeV2 === "investment_rent" || purchasePurposeV2 === "investment_capital"
          ? "investment"
          : purchasePurposeV2 === "long_term"
            ? "both"
            : "residence",
      employmentType,
      monthlyExpenses: parseNullableNumericInput(monthlyExpenses) ?? 0,
      houseOwnership,
      purchasePurposeV2,
      purchaseTiming,
      moveinTiming,
      ltvInternalScore,
      existingLoan,
      recentDelinquency,
      cardLoanUsage,
      loanRejection,
      monthlyIncomeRange,
      existingMonthlyRepayment,
      regions: conditionRegions,
    }),
    [
      availableCash,
      monthlyIncome,
      houseOwnership,
      guestCreditGrade,
      purchasePurposeV2,
      employmentType,
      monthlyExpenses,
      purchaseTiming,
      moveinTiming,
      ltvInternalScore,
      existingLoan,
      recentDelinquency,
      cardLoanUsage,
      loanRejection,
      monthlyIncomeRange,
      existingMonthlyRepayment,
      conditionRegions,
    ],
  );

  const handleWizardChange = useCallback(
    (patch: Partial<RecommendationCondition>) => {
      if (patch.availableCash !== undefined) {
        setAvailableCash(
          patch.availableCash > 0 ? formatStoredAmount(patch.availableCash) : "",
        );
      }
      if (patch.monthlyIncome !== undefined) {
        setMonthlyIncome(
          patch.monthlyIncome > 0 ? formatStoredAmount(patch.monthlyIncome) : "",
        );
      }
      if (patch.monthlyExpenses !== undefined) {
        setMonthlyExpenses(
          patch.monthlyExpenses > 0 ? formatStoredAmount(patch.monthlyExpenses) : "",
        );
      }
      if (patch.employmentType !== undefined) setEmploymentType(patch.employmentType);
      if (patch.houseOwnership !== undefined) setHouseOwnership(patch.houseOwnership);
      if (patch.purchasePurposeV2 !== undefined) {
        setPurchasePurposeV2(patch.purchasePurposeV2);
      }
      if (patch.purchaseTiming !== undefined) setPurchaseTiming(patch.purchaseTiming);
      if (patch.moveinTiming !== undefined) setMoveinTiming(patch.moveinTiming);
      if (patch.ltvInternalScore !== undefined) {
        setLtvInternalScore(patch.ltvInternalScore);
        if (isLoggedIn === false) {
          setGuestCreditGrade(creditGradeFromLtvInternalScore(patch.ltvInternalScore));
        }
      }
      if (patch.creditGrade !== undefined) setGuestCreditGrade(patch.creditGrade);
      if (patch.existingLoan !== undefined) setExistingLoan(patch.existingLoan);
      if (patch.recentDelinquency !== undefined) {
        setRecentDelinquency(patch.recentDelinquency);
      }
      if (patch.cardLoanUsage !== undefined) setCardLoanUsage(patch.cardLoanUsage);
      if (patch.loanRejection !== undefined) setLoanRejection(patch.loanRejection);
      if (patch.monthlyIncomeRange !== undefined) {
        setMonthlyIncomeRange(patch.monthlyIncomeRange);
      }
      if (patch.existingMonthlyRepayment !== undefined) {
        setExistingMonthlyRepayment(patch.existingMonthlyRepayment);
      }
      if (patch.regions !== undefined) setConditionRegions(patch.regions);
    },
    [isLoggedIn],
  );

  // 저장된 조건과 현재 입력값이 다른지 감지
  const isConditionDirty = useMemo(() => {
    if (!savedConditionPreset) return false;
    const currentCash = parseNullableNumericInput(availableCash);
    const currentIncome = parseNullableNumericInput(monthlyIncome);
    const currentExpenses = parseNullableNumericInput(monthlyExpenses);
    const normalizedExpenses = currentExpenses !== null ? Math.max(0, Math.round(currentExpenses)) : null;
    return (
      currentCash !== savedConditionPreset.available_cash ||
      currentIncome !== savedConditionPreset.monthly_income ||
      normalizedExpenses !== savedConditionPreset.monthly_expenses ||
      employmentType !== savedConditionPreset.employment_type ||
      houseOwnership !== savedConditionPreset.house_ownership ||
      purchasePurposeV2 !== savedConditionPreset.purchase_purpose_v2 ||
      purchaseTiming !== savedConditionPreset.purchase_timing ||
      moveinTiming !== savedConditionPreset.movein_timing ||
      ltvInternalScore !== savedConditionPreset.ltv_internal_score ||
      existingLoan !== savedConditionPreset.existing_loan_amount ||
      recentDelinquency !== savedConditionPreset.recent_delinquency ||
      cardLoanUsage !== savedConditionPreset.card_loan_usage ||
      loanRejection !== savedConditionPreset.loan_rejection ||
      monthlyIncomeRange !== savedConditionPreset.monthly_income_range ||
      existingMonthlyRepayment !== savedConditionPreset.existing_monthly_repayment
    );
  }, [
    savedConditionPreset,
    availableCash, monthlyIncome, monthlyExpenses,
    employmentType, houseOwnership, purchasePurposeV2,
    purchaseTiming, moveinTiming, ltvInternalScore,
    existingLoan, recentDelinquency, cardLoanUsage, loanRejection, monthlyIncomeRange,
    existingMonthlyRepayment,
  ]);

  // 세션 내 입력값 자동 저장 — 비로그인 상태에서만 저장
  // (로그인 사용자의 조건이 세션에 오염되어 로그아웃 후 게스트에 노출되는 버그 방지)
  useEffect(() => {
    if (isLoggedIn !== false) return;
    saveConditionSession(
      sanitizeGuestConditionSnapshot({
        availableCash,
        monthlyIncome,
        monthlyExpenses,
        employmentType,
        houseOwnership,
        purchasePurposeV2,
        purchaseTiming,
        moveinTiming,
        ltvInternalScore,
        existingLoan,
        recentDelinquency,
        cardLoanUsage,
        loanRejection,
        monthlyIncomeRange,
        existingMonthlyRepayment,
      }),
    );
  }, [
    isLoggedIn,
    availableCash, monthlyIncome, monthlyExpenses,
    employmentType, houseOwnership, purchasePurposeV2,
    purchaseTiming, moveinTiming, ltvInternalScore,
    existingLoan, recentDelinquency, cardLoanUsage, loanRejection, monthlyIncomeRange,
    existingMonthlyRepayment,
  ]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data, error } = await fetchPropertiesForOfferings(supabase, {
        limit: 120,
      });

      if (!mounted) return;

      if (error) {
        setLoadError(toKoreanErrorMessage(error, "데이터를 불러오지 못했어요."));
        setRows([]);
        setRowsLoaded(true);
        return;
      }

      setLoadError(null);
      const nextRows = (data ?? []) as PropertyRow[];
      setRows(nextRows);
      setRowsLoaded(true);

      const propertyIds = nextRows
        .map((row) => Number(row.id))
        .filter((id) => Number.isFinite(id));

      if (propertyIds.length === 0) {
        setConsultablePropertyIds([]);
        return;
      }

      const agentResult = await supabase
        .from("property_agents")
        .select("property_id")
        .in("property_id", propertyIds)
        .eq("status", "approved");

      if (agentResult.error) {
        console.error("[home consultable properties] load error:", agentResult.error);
        setConsultablePropertyIds([]);
      } else {
        const uniqueIds = [
          ...new Set(
            (agentResult.data ?? [])
              .map((row) => Number(row.property_id))
              .filter((id) => Number.isFinite(id)),
          ),
        ];
        setConsultablePropertyIds(uniqueIds);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  const fallback = useMemo(
    () => ({
      addressShort: UXCopy.addressShort,
      regionShort: UXCopy.regionShort,
    }),
    [],
  );

  const offerings: Offering[] = useMemo(
    () => rows.map((row) => mapPropertyRowToOffering(row, fallback)),
    [rows, fallback],
  );

  const rowById = useMemo(() => {
    const map = new Map<number, PropertyRow>();
    for (const row of rows) {
      const id = Number(row.id);
      if (Number.isFinite(id)) map.set(id, row);
    }
    return map;
  }, [rows]);

  const consultableOfferingIdSet = useMemo(
    () => new Set(consultablePropertyIds),
    [consultablePropertyIds],
  );

  const consultableOfferings: Offering[] = useMemo(() => {
    return offerings
      .filter((offering) => consultableOfferingIdSet.has(Number(offering.id)))
      .slice(0, HOME_OFFERING_LIMIT);
  }, [consultableOfferingIdSet, offerings]);

  const regionCounts = useMemo(() => {
    const counts = OFFERING_REGION_TABS.reduce(
      (acc, region) => {
        acc[region] = 0;
        return acc;
      },
      {} as Record<OfferingRegionTab, number>,
    );
    counts.전체 = offerings.length;

    for (const offering of offerings) {
      if (offering.region !== "전체") {
        counts[offering.region] += 1;
      }
    }

    return counts;
  }, [offerings]);

  const enabledRegions = useMemo(
    () => OFFERING_REGION_TABS.filter((region) => regionCounts[region] > 0),
    [regionCounts],
  );

  const effectiveSelectedRegion = useMemo(
    () =>
      enabledRegions.includes(selectedRegion)
        ? selectedRegion
        : (enabledRegions[0] ?? "전체"),
    [enabledRegions, selectedRegion],
  );

  const getClickScore = useCallback(
    (offering: Offering) => {
      const id = Number(offering.id);
      const row = rowById.get(id);
      if (!row) return 0;

      const raw =
        row.click_count ?? row.total_click_count ?? row.view_count ?? 0;
      const value = Number(raw);
      return Number.isFinite(value) ? value : 0;
    },
    [rowById],
  );

  const popularOfferings: Offering[] = useMemo(() => {
    const base =
      effectiveSelectedRegion === "전체"
        ? offerings
        : offerings.filter((o) => o.region === effectiveSelectedRegion);

    return [...base]
      .sort((a, b) => {
        const scoreDiff = getClickScore(b) - getClickScore(a);
        if (scoreDiff !== 0) return scoreDiff;

        const aCreated = new Date(rowById.get(Number(a.id))?.created_at ?? 0).getTime();
        const bCreated = new Date(rowById.get(Number(b.id))?.created_at ?? 0).getTime();
        return bCreated - aCreated;
      })
      .slice(0, HOME_OFFERING_LIMIT);
  }, [effectiveSelectedRegion, getClickScore, offerings, rowById]);

  const offeringById = useMemo(() => {
    const map = new Map<number, Offering>();
    for (const offering of offerings) {
      const id = Number(offering.id);
      if (Number.isFinite(id)) map.set(id, offering);
    }
    return map;
  }, [offerings]);

  const conditionMatchedOfferings: Offering[] = useMemo(() => {
    if (!recommendedPropertyIds) return [];

    const ordered = recommendedPropertyIds
      .map((id) => offeringById.get(id))
      .filter((offering): offering is Offering => Boolean(offering));

    const filtered =
      conditionRegions.length === 0
        ? ordered
        : ordered.filter((offering) => conditionRegions.includes(offering.region));

    return filtered.slice(0, HOME_OFFERING_LIMIT);
  }, [conditionRegions, offeringById, recommendedPropertyIds]);

  const recommendedItemsById = useMemo(() => {
    const map = new Map<number, RecommendationItem>();

    for (const [id, raw] of recommendedRawById) {
      const offering = offeringById.get(id);
      if (!offering) continue;

      const item = buildHomeRecommendationItem(offering, raw);
      if (item) {
        map.set(id, item);
      }
    }

    return map;
  }, [offeringById, recommendedRawById]);
  const consultableOfferingsHref = "/offerings?agent=has";
  const popularOfferingsHref = useMemo(() => {
    if (effectiveSelectedRegion === "전체") {
      return "/offerings";
    }

    return `/offerings?region=${encodeURIComponent(effectiveSelectedRegion)}`;
  }, [effectiveSelectedRegion]);

  const parseCustomerInputFromState =
    useCallback((): HomeRecommendationCustomerPayload | null => {
    const parsedCash = parseNullableNumericInput(availableCash);
    if (parsedCash === null) {
      setConditionError("가용 현금은 만원 단위 정수로 입력해주세요.");
      return null;
    }
    const parsedIncome = parseNullableNumericInput(monthlyIncome);
    if (parsedIncome === null) {
      setConditionError("월 소득은 만원 단위 정수로 입력해주세요.");
      return null;
    }

    const parsedExpenses = parseNullableNumericInput(monthlyExpenses);

    return {
      available_cash: Math.max(0, Math.round(parsedCash)),
      monthly_income: Math.max(0, Math.round(parsedIncome)),
      monthly_expenses: parsedExpenses === null ? 0 : Math.max(0, Math.round(parsedExpenses)),
      employment_type: employmentType ?? DEFAULT_EMPLOYMENT_TYPE,
      house_ownership: houseOwnership ?? DEFAULT_HOUSE_OWNERSHIP,
      purchase_purpose_v2: purchasePurposeV2 ?? DEFAULT_PURCHASE_PURPOSE_V2,
      purchase_timing: purchaseTiming ?? DEFAULT_PURCHASE_TIMING,
      movein_timing: moveinTiming ?? DEFAULT_MOVEIN_TIMING,
      ltv_internal_score: Math.min(100, Math.max(0, Math.round(ltvInternalScore))),
      existing_loan: existingLoan,
      recent_delinquency: recentDelinquency,
      card_loan_usage: cardLoanUsage,
      loan_rejection: loanRejection,
      monthly_income_range: monthlyIncomeRange,
      existing_monthly_repayment: existingMonthlyRepayment,
    };
  }, [
    availableCash,
    cardLoanUsage,
    employmentType,
    existingLoan,
    existingMonthlyRepayment,
    houseOwnership,
    loanRejection,
    ltvInternalScore,
    monthlyExpenses,
    monthlyIncome,
    monthlyIncomeRange,
    moveinTiming,
    purchasePurposeV2,
    purchaseTiming,
    recentDelinquency,
  ]);

  const applySessionCondition = useCallback((snapshot: ConditionSessionSnapshot) => {
    setAvailableCash(snapshot.availableCash);
    setMonthlyIncome(snapshot.monthlyIncome);
    setMonthlyExpenses(snapshot.monthlyExpenses);
    setEmploymentType(snapshot.employmentType);
    setHouseOwnership(snapshot.houseOwnership);
    setPurchasePurposeV2(snapshot.purchasePurposeV2);
    setPurchaseTiming(snapshot.purchaseTiming);
    setMoveinTiming(snapshot.moveinTiming);
    setLtvInternalScore(snapshot.ltvInternalScore);
    setExistingLoan(snapshot.existingLoan);
    setRecentDelinquency(snapshot.recentDelinquency);
    setCardLoanUsage(snapshot.cardLoanUsage);
    setLoanRejection(snapshot.loanRejection);
    setMonthlyIncomeRange(snapshot.monthlyIncomeRange);
    setExistingMonthlyRepayment(snapshot.existingMonthlyRepayment);
    setGuestCreditGrade(
      creditGradeFromLtvInternalScore(snapshot.ltvInternalScore),
    );
  }, []);

  const applyCustomerStateFromRaw = useCallback((raw: Record<string, unknown>) => {
    const availableCash = toNonNegativeInt(raw.available_cash);
    const monthlyIncome = toNonNegativeInt(raw.monthly_income);
    const monthlyExpensesValue = toNonNegativeInt(raw.monthly_expenses);
    const derivedHouseOwnership =
      isValidHouseOwnership(raw.house_ownership)
        ? raw.house_ownership
        : houseOwnershipFromOwnedHouseCount(raw.owned_house_count);
    const derivedPurpose =
      isValidFullPurchasePurpose(raw.purchase_purpose_v2)
        ? raw.purchase_purpose_v2
        : purchasePurposeV2FromLegacy(raw.purchase_purpose);
    const derivedLtvScore =
      toNonNegativeInt(raw.ltv_internal_score) ??
      ltvInternalScoreFromCreditGrade(isCreditGrade(raw.credit_grade) ? raw.credit_grade : null) ??
      0;
    const derivedGuestCreditGrade = isCreditGrade(raw.credit_grade)
      ? raw.credit_grade
      : creditGradeFromLtvInternalScore(derivedLtvScore);

    setAvailableCash(availableCash === null ? "" : formatStoredAmount(availableCash));
    setMonthlyIncome(monthlyIncome === null ? "" : formatStoredAmount(monthlyIncome));
    setMonthlyExpenses(
      monthlyExpensesValue === null ? "" : formatStoredAmount(monthlyExpensesValue),
    );
    setEmploymentType(
      isValidEmploymentType(raw.employment_type) ? raw.employment_type : null,
    );
    setHouseOwnership(derivedHouseOwnership);
    setPurchasePurposeV2(derivedPurpose);
    setPurchaseTiming(
      isValidPurchaseTiming(raw.purchase_timing) ? raw.purchase_timing : null,
    );
    setMoveinTiming(isValidMoveinTiming(raw.movein_timing) ? raw.movein_timing : null);
    setLtvInternalScore(Math.min(100, Math.max(0, derivedLtvScore)));
    setGuestCreditGrade(derivedGuestCreditGrade);
    setExistingLoan(
      raw.existing_loan === "none" ||
        raw.existing_loan === "under_1eok" ||
        raw.existing_loan === "1to3eok" ||
        raw.existing_loan === "over_3eok"
        ? raw.existing_loan
        : null,
    );
    setRecentDelinquency(
      raw.recent_delinquency === "none" ||
        raw.recent_delinquency === "once" ||
        raw.recent_delinquency === "twice_or_more"
        ? raw.recent_delinquency
        : null,
    );
    setCardLoanUsage(
      raw.card_loan_usage === "none" ||
        raw.card_loan_usage === "1to2" ||
        raw.card_loan_usage === "3_or_more"
        ? raw.card_loan_usage
        : null,
    );
    setLoanRejection(
      raw.loan_rejection === "none" || raw.loan_rejection === "yes"
        ? raw.loan_rejection
        : null,
    );
    setMonthlyIncomeRange(
      raw.monthly_income_range === "under_200" ||
        raw.monthly_income_range === "200to300" ||
        raw.monthly_income_range === "300to500" ||
        raw.monthly_income_range === "500to700" ||
        raw.monthly_income_range === "over_700"
        ? raw.monthly_income_range
        : null,
    );
    setExistingMonthlyRepayment(
      isValidMonthlyLoanRepayment(raw.existing_monthly_repayment)
        ? raw.existing_monthly_repayment
        : DEFAULT_EXISTING_MONTHLY_REPAYMENT,
    );
  }, []);

  const applyProfileConditionPreset = useCallback(
    (
      profileData: ConditionValidationProfilePresetRow,
      customer: HomeRecommendationCustomerPayload,
    ) => {
      const effectiveHouseOwnership =
        profileData.cv_house_ownership ??
        houseOwnershipFromOwnedHouseCount(profileData.cv_owned_house_count);
      const effectivePurposeV2 =
        profileData.cv_purchase_purpose_v2 ??
        purchasePurposeV2FromLegacy(profileData.cv_purchase_purpose);
      const effectiveLtvScore =
        profileData.cv_ltv_internal_score ??
        ltvInternalScoreFromCreditGrade(profileData.cv_credit_grade) ??
        0;

      setAvailableCash(formatStoredAmount(customer.available_cash));
      setMonthlyIncome(formatStoredAmount(customer.monthly_income));
      setMonthlyExpenses(
        profileData.cv_monthly_expenses_manwon == null
          ? ""
          : formatStoredAmount(profileData.cv_monthly_expenses_manwon),
      );
      setEmploymentType(profileData.cv_employment_type ?? null);
      setHouseOwnership(effectiveHouseOwnership);
      setPurchasePurposeV2(effectivePurposeV2);
      setPurchaseTiming(profileData.cv_purchase_timing ?? null);
      setMoveinTiming(profileData.cv_movein_timing ?? null);
      setLtvInternalScore(Math.min(100, Math.max(0, effectiveLtvScore)));
      setGuestCreditGrade(creditGradeFromLtvInternalScore(effectiveLtvScore));
      setExistingLoan(profileData.cv_existing_loan_amount ?? null);
      setRecentDelinquency(profileData.cv_recent_delinquency ?? null);
      setCardLoanUsage(profileData.cv_card_loan_usage ?? null);
      setLoanRejection(profileData.cv_loan_rejection ?? null);
      setMonthlyIncomeRange(profileData.cv_monthly_income_range ?? null);
      setExistingMonthlyRepayment(
        profileData.cv_existing_monthly_repayment ?? DEFAULT_EXISTING_MONTHLY_REPAYMENT,
      );

      setSavedConditionPreset(
        buildSavedConditionPresetSnapshot(profileData, customer),
      );
    },
    [],
  );

  const applyRecommendationByCustomer = useCallback(
    async (
      customer: HomeRecommendationCustomerPayload,
      options?: {
        closeModal?: boolean;
        guestMode?: boolean;
        guestCreditGrade?: CreditGrade | null;
      },
    ): Promise<boolean> => {
      setConditionError(null);
      setConditionNotice(null);
      setConditionApplyLoading(true);
      try {
        const resolvedGuestCreditGrade =
          options?.guestCreditGrade ??
          creditGradeFromLtvInternalScore(customer.ltv_internal_score);
        if (options?.guestMode === true && resolvedGuestCreditGrade === null) {
          setConditionError("신용 상태를 선택해주세요.");
          return false;
        }
        const requestCustomer =
          options?.guestMode === true
            ? {
                available_cash: customer.available_cash,
                monthly_income: customer.monthly_income,
                house_ownership: customer.house_ownership,
                purchase_purpose_v2: customer.purchase_purpose_v2,
                credit_grade: resolvedGuestCreditGrade,
              }
            : {
                ...customer,
                existing_monthly_repayment:
                  customer.existing_monthly_repayment ?? "none",
              };
        const response = await fetch("/api/condition-validation/recommend", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            customer: requestCustomer,
            options: {
              guest_mode: options?.guestMode === true,
              include_red: false,
              limit: 60,
            },
          }),
        });
        const payload = (await response.json().catch(() => null)) as
        | {
            ok?: boolean;
            property_ids?: Array<number | string>;
            recommendations?: HomeRawRecommendation[];
            error?: { message?: string };
          }
        | null;

        if (!response.ok || !payload?.ok) {
          setConditionError(payload?.error?.message ?? "조건 추천을 불러오지 못했습니다.");
          return false;
        }

        const ids = (payload.property_ids ?? [])
          .map((id) => Number(id))
          .filter((id) => Number.isFinite(id));
        const nextCategories = new Map<number, ConditionCategoryGrades>();
        const nextRaw = new Map<number, HomeRawRecommendation>();
        for (const item of payload.recommendations ?? []) {
          const id = Number(item.property_id);
          if (!Number.isFinite(id) || !item.categories) continue;
          nextRaw.set(id, item);
          const cats = item.categories;
          const toGrade = (
            g?: string,
          ): ConditionCategoryGrades["cash"]["grade"] =>
            g === "GREEN" ||
            g === "LIME" ||
            g === "YELLOW" ||
            g === "ORANGE" ||
            g === "RED"
              ? g
              : "RED";
          nextCategories.set(id, {
            cash: {
              grade: toGrade(cats.cash?.grade),
              score: toFiniteNumber(cats.cash?.score) ?? undefined,
            },
            burden: {
              grade: toGrade(cats.income?.grade),
              score: toFiniteNumber(cats.income?.score) ?? undefined,
            },
            credit: {
              grade: toGrade(cats.ltv_dsr?.grade),
              score: toFiniteNumber(cats.ltv_dsr?.score) ?? undefined,
            },
            totalScore: toFiniteNumber(item.total_score) ?? undefined,
          });
        }
        setRecommendedPropertyIds(ids);
        setRecommendedCategoriesById(nextCategories);
        setRecommendedRawById(nextRaw);
        setShowConditionSetupCard(false);
        setAppliedConditionChips(
          buildAppliedConditionChips({
            customer,
            guestMode: options?.guestMode === true,
            resolvedGuestCreditGrade,
            conditionRegions,
          }),
        );

        if (homeUserId && ids.length > 0) {
          const { error: requestInsertError } = await supabase
            .from("condition_validation_requests")
            .insert({
              property_id: ids[0],
              customer_id: homeUserId,
              available_cash_manwon: customer.available_cash,
              monthly_income_manwon: customer.monthly_income,
              owned_house_count: ownedHouseCountFromHouseOwnership(
                customer.house_ownership,
              ),
              credit_grade: creditGradeFromLtvInternalScore(
                customer.ltv_internal_score,
              ),
              purchase_purpose: legacyPurchasePurposeFromV2(
                customer.purchase_purpose_v2,
              ),
              amount_unit_raw: "manwon",
              input_payload: {
                source: "home_recommendations",
                customer,
                regions: conditionRegions,
              },
            });

          if (requestInsertError) {
            console.error(
              "[home condition request] insert error:",
              requestInsertError,
            );
          }
        }

        if (options?.closeModal !== false) {
          setConditionModalOpen(false);
        }
        return true;
      } catch {
        setConditionError("조건 추천 요청 중 네트워크 오류가 발생했습니다.");
        return false;
      } finally {
        setConditionApplyLoading(false);
      }
    },
    [conditionRegions, homeUserId, supabase],
  );

  // ref 패턴: 최신 콜백을 ref로 유지 → 로딩 useEffect의 deps에서 제거 가능
  const applyRecommendationRef = useRef(applyRecommendationByCustomer);
  useEffect(() => {
    applyRecommendationRef.current = applyRecommendationByCustomer;
  });

  const handleApplyCondition = useCallback(async (): Promise<boolean> => {
    setConditionError(null);
    setConditionNotice(null);
    const customer = parseCustomerInputFromState();
    if (!customer) return false;
    return applyRecommendationByCustomer(customer, { closeModal: true });
  }, [applyRecommendationByCustomer, parseCustomerInputFromState]);

  const handleGuestApplyCondition = useCallback(async (): Promise<boolean> => {
    setConditionError(null);
    setConditionNotice(null);
    const parsedCash = parseNullableNumericInput(availableCash);
    if (parsedCash === null) {
      setConditionError("가용 현금은 만원 단위 정수로 입력해주세요.");
      return false;
    }
    const parsedIncome = parseNullableNumericInput(monthlyIncome);
    if (parsedIncome === null) {
      setConditionError("월 소득은 만원 단위 정수로 입력해주세요.");
      return false;
    }
    if (houseOwnership === null || purchasePurposeV2 === null) {
      setConditionError("보유 주택과 분양 목적을 선택해주세요.");
      return false;
    }
    if (guestCreditGrade === null) {
      setConditionError("신용 상태를 선택해주세요.");
      return false;
    }
    const customer: HomeRecommendationCustomerPayload = {
      available_cash: Math.max(0, Math.round(parsedCash)),
      monthly_income: Math.max(0, Math.round(parsedIncome)),
      monthly_expenses: 0,
      employment_type: DEFAULT_EMPLOYMENT_TYPE,
      house_ownership: houseOwnership,
      purchase_purpose_v2: purchasePurposeV2,
      purchase_timing: DEFAULT_PURCHASE_TIMING,
      movein_timing: DEFAULT_MOVEIN_TIMING,
      ltv_internal_score: 0,
      existing_loan: null,
      recent_delinquency: null,
      card_loan_usage: null,
      loan_rejection: null,
      monthly_income_range: null,
      existing_monthly_repayment: DEFAULT_EXISTING_MONTHLY_REPAYMENT,
    };
    const guestLtvInternalScore =
      ltvInternalScoreFromCreditGrade(guestCreditGrade) ?? 0;
    setLtvInternalScore(guestLtvInternalScore);
    saveConditionSession(
      sanitizeGuestConditionSnapshot({
        availableCash,
        monthlyIncome,
        monthlyExpenses,
        employmentType,
        houseOwnership,
        purchasePurposeV2,
        purchaseTiming,
        moveinTiming,
        ltvInternalScore: guestLtvInternalScore,
        existingLoan,
        recentDelinquency,
        cardLoanUsage,
        loanRejection,
        monthlyIncomeRange,
        existingMonthlyRepayment,
      }),
    );
    return applyRecommendationByCustomer(customer, {
      closeModal: true,
      guestMode: true,
      guestCreditGrade,
    });
  }, [
    availableCash,
    monthlyIncome,
    monthlyExpenses,
    employmentType,
    houseOwnership,
    purchasePurposeV2,
    purchaseTiming,
    moveinTiming,
    guestCreditGrade,
    existingLoan,
    recentDelinquency,
    cardLoanUsage,
    loanRejection,
    monthlyIncomeRange,
    existingMonthlyRepayment,
    applyRecommendationByCustomer,
  ]);

  const handleLoginAndSaveCondition = useCallback(() => {
    setConditionError(null);
    setConditionNotice(null);
    const customer = parseCustomerInputFromState();
    if (!customer) return;

    try {
      const resolvedGuestLtvInternalScore =
        isLoggedIn === false
          ? ltvInternalScoreFromCreditGrade(guestCreditGrade) ?? 0
          : ltvInternalScore;
      const snapshot: ConditionSessionSnapshot = {
        availableCash,
        monthlyIncome,
        monthlyExpenses,
        employmentType,
        houseOwnership,
        purchasePurposeV2,
        purchaseTiming,
        moveinTiming,
        ltvInternalScore: resolvedGuestLtvInternalScore,
        existingLoan,
        recentDelinquency,
        cardLoanUsage,
        loanRejection,
        monthlyIncomeRange,
        existingMonthlyRepayment,
      };
      const payload: HomeConditionDraft = {
        snapshot:
          isLoggedIn === false ? sanitizeGuestConditionSnapshot(snapshot) : snapshot,
        customer:
          isLoggedIn === false
            ? {
                ...customer,
                ltv_internal_score: resolvedGuestLtvInternalScore,
                credit_grade: guestCreditGrade,
              }
            : customer,
        regions: conditionRegions,
        saved_at: new Date().toISOString(),
      };
      localStorage.setItem(HOME_CONDITION_DRAFT_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore storage failure and continue to login.
    }

    router.push("/auth/login?next=/");
  }, [
    availableCash,
    cardLoanUsage,
    employmentType,
    existingLoan,
    existingMonthlyRepayment,
    houseOwnership,
    isLoggedIn,
    conditionRegions,
    guestCreditGrade,
    loanRejection,
    ltvInternalScore,
    monthlyExpenses,
    monthlyIncome,
    monthlyIncomeRange,
    moveinTiming,
    parseCustomerInputFromState,
    purchasePurposeV2,
    purchaseTiming,
    recentDelinquency,
    router,
  ]);

  const handleSaveConditionPreset = useCallback(async (): Promise<boolean> => {
    setConditionError(null);
    setConditionNotice(null);
    const customer = parseCustomerInputFromState();
    if (!customer || !homeUserId) return false;

    setConditionSaveLoading(true);
    const parsedExpenses = parseNullableNumericInput(monthlyExpenses);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          cv_available_cash_manwon: customer.available_cash,
          cv_monthly_income_manwon: customer.monthly_income,
          cv_owned_house_count: ownedHouseCountFromHouseOwnership(customer.house_ownership),
          cv_credit_grade: creditGradeFromLtvInternalScore(customer.ltv_internal_score),
          cv_purchase_purpose: legacyPurchasePurposeFromV2(customer.purchase_purpose_v2),
          // New v2 fields
          cv_employment_type: employmentType,
          cv_monthly_expenses_manwon: parsedExpenses !== null ? Math.max(0, Math.round(parsedExpenses)) : null,
          cv_house_ownership: houseOwnership,
          cv_purchase_purpose_v2: purchasePurposeV2,
          cv_purchase_timing: purchaseTiming,
          cv_movein_timing: moveinTiming,
          cv_ltv_internal_score: ltvInternalScore,
          cv_existing_loan_amount: existingLoan,
          cv_recent_delinquency: recentDelinquency,
          cv_card_loan_usage: cardLoanUsage,
          cv_loan_rejection: loanRejection,
          cv_monthly_income_range: monthlyIncomeRange,
          cv_existing_monthly_repayment: existingMonthlyRepayment,
        })
        .eq("id", homeUserId);

      if (error) {
        setConditionError("조건 저장 중 오류가 발생했습니다.");
        return false;
      }

      const isUpdate = hasSavedConditionPreset;
      const parsedExpensesForSnapshot = parsedExpenses !== null ? Math.max(0, Math.round(parsedExpenses)) : null;
      setSavedConditionPreset({
        available_cash: parseNullableNumericInput(availableCash),
        monthly_income: parseNullableNumericInput(monthlyIncome),
        monthly_expenses: parsedExpensesForSnapshot,
        employment_type: employmentType,
        house_ownership: houseOwnership,
        purchase_purpose_v2: purchasePurposeV2,
        purchase_timing: purchaseTiming,
        movein_timing: moveinTiming,
        ltv_internal_score: ltvInternalScore,
        existing_loan_amount: existingLoan,
        recent_delinquency: recentDelinquency,
        card_loan_usage: cardLoanUsage,
        loan_rejection: loanRejection,
        monthly_income_range: monthlyIncomeRange,
        existing_monthly_repayment: existingMonthlyRepayment,
      });
      setHasSavedConditionPreset(true);
      setConditionNotice(isUpdate ? "조건이 업데이트되었습니다." : "맞춤 정보에 현재 조건을 저장했습니다.");
      return true;
    } catch {
      setConditionError("조건 저장 중 네트워크 오류가 발생했습니다.");
      return false;
    } finally {
      setConditionSaveLoading(false);
    }
  }, [
    availableCash,
    cardLoanUsage,
    employmentType,
    existingLoan,
    existingMonthlyRepayment,
    hasSavedConditionPreset,
    homeUserId,
    houseOwnership,
    loanRejection,
    ltvInternalScore,
    monthlyExpenses,
    monthlyIncome,
    monthlyIncomeRange,
    moveinTiming,
    parseCustomerInputFromState,
    purchasePurposeV2,
    purchaseTiming,
    recentDelinquency,
    supabase,
  ]);

  // 저장된 기본 조건으로 복원 (로그인 사용자, 홈 모달용)
  const handleRestoreDefaultCondition = useCallback(() => {
    if (!savedConditionPreset) return false;
    setAvailableCash(
      savedConditionPreset.available_cash == null
        ? ""
        : formatStoredAmount(savedConditionPreset.available_cash),
    );
    setMonthlyIncome(
      savedConditionPreset.monthly_income == null
        ? ""
        : formatStoredAmount(savedConditionPreset.monthly_income),
    );
    setMonthlyExpenses(
      savedConditionPreset.monthly_expenses == null
        ? ""
        : formatStoredAmount(savedConditionPreset.monthly_expenses),
    );
    setEmploymentType(savedConditionPreset.employment_type);
    setHouseOwnership(savedConditionPreset.house_ownership);
    setPurchasePurposeV2(savedConditionPreset.purchase_purpose_v2);
    setPurchaseTiming(savedConditionPreset.purchase_timing);
    setMoveinTiming(savedConditionPreset.movein_timing);
    setLtvInternalScore(savedConditionPreset.ltv_internal_score);
    setGuestCreditGrade(creditGradeFromLtvInternalScore(savedConditionPreset.ltv_internal_score));
    setExistingLoan(savedConditionPreset.existing_loan_amount);
    setRecentDelinquency(savedConditionPreset.recent_delinquency);
    setCardLoanUsage(savedConditionPreset.card_loan_usage);
    setLoanRejection(savedConditionPreset.loan_rejection);
    setMonthlyIncomeRange(savedConditionPreset.monthly_income_range);
    setExistingMonthlyRepayment(savedConditionPreset.existing_monthly_repayment);
    return true;
  }, [savedConditionPreset]);

  // 모달이 열릴 때 세션에서 최신 조건 동기화
  // (맞춤 현장 페이지에서 평가 후 홈으로 돌아올 때 Next.js 캐시로 인해
  //  init effect가 재실행되지 않을 수 있으므로 모달 open 시 재동기화)
  useEffect(() => {
    if (!conditionModalOpen || isLoggedIn === false) return;
    const latestSession = loadConditionSession();
    if (latestSession) {
      applySessionCondition(latestSession);
    }
  }, [conditionModalOpen, isLoggedIn, applySessionCondition]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted) return;
      if (!user) {
        setHomeUserId(null);
        setIsLoggedIn(false);
        setHasSavedConditionPreset(false);
        setSavedConditionPreset(null);
        setConditionRegions([]);
        // 비로그인: 세션 임시 저장값 복원
        try {
          const snapshot = loadConditionSession();
          const homeDraft = loadHomeConditionDraft();
          const source = pickLoggedOutConditionSource({
            hasSession: Boolean(snapshot),
            hasDraft: Boolean(homeDraft?.snapshot || homeDraft?.customer),
          });
          if (source === "session" && snapshot) {
            const guestSnapshot = sanitizeGuestConditionSnapshot(snapshot);
            applySessionCondition(guestSnapshot);
            const sessionCustomer = buildCustomerFromSessionSnapshot(guestSnapshot);
            const sessionGuestCreditGrade = creditGradeFromLtvInternalScore(
              guestSnapshot.ltvInternalScore,
            );
            if (sessionCustomer && sessionGuestCreditGrade !== null) {
              setShowConditionSetupCard(false);
              await applyRecommendationRef.current(sessionCustomer, {
                closeModal: false,
                guestMode: true,
                guestCreditGrade: sessionGuestCreditGrade,
              });
            } else {
              setShowConditionSetupCard(true);
            }
          } else if (source === "draft" && homeDraft) {
            const draftSnapshot = homeDraft.snapshot
              ? sanitizeGuestConditionSnapshot(homeDraft.snapshot)
              : null;
            const draftCustomer = buildCustomerPayloadFromRaw(
              toUnknownRecord(homeDraft.customer),
            );
            const appliedRegions = Array.isArray(homeDraft.regions)
              ? homeDraft.regions.filter((value): value is OfferingRegionTab =>
                  OFFERING_REGION_TABS.includes(value),
                )
              : [];
            setConditionRegions(appliedRegions);

            if (draftSnapshot) {
              applySessionCondition(draftSnapshot);
            } else if (draftCustomer) {
              applyCustomerStateFromRaw(draftCustomer);
            }

            const guestCustomer =
              draftCustomer ??
              (draftSnapshot ? buildCustomerFromSessionSnapshot(draftSnapshot) : null);

            const draftGuestCreditGrade = creditGradeFromLtvInternalScore(
              guestCustomer?.ltv_internal_score ?? draftSnapshot?.ltvInternalScore ?? 0,
            );

            if (guestCustomer && draftGuestCreditGrade !== null) {
              setShowConditionSetupCard(false);
              await applyRecommendationRef.current(guestCustomer, {
                closeModal: false,
                guestMode: true,
                guestCreditGrade: draftGuestCreditGrade,
              });
              clearHomeConditionDraft();
            } else {
              setShowConditionSetupCard(true);
            }
          } else {
            setShowConditionSetupCard(true);
          }
        } catch {
          setShowConditionSetupCard(true);
        }
        return;
      }
      setHomeUserId(user.id);
      setIsLoggedIn(true);
      setConditionRegions([]);

      // 찜한 현장 ID 목록 로드
      const { data: scraps } = await supabase
        .from("offering_scraps")
        .select("property_id")
        .eq("profile_id", user.id);
      if (mounted && scraps) {
        setScrapedPropertyIds(
          new Set(scraps.map((r: { property_id: number }) => r.property_id))
        );
      }

      const [requestResult, profileResult] = await Promise.all([
        supabase
          .from("condition_validation_requests")
          .select(
            "id, available_cash_manwon, monthly_income_manwon, owned_house_count, credit_grade, purchase_purpose, input_payload",
          )
          .eq("customer_id", user.id)
          .order("requested_at", { ascending: false })
          .limit(1),
        supabase
          .from("profiles")
          .select(
            "cv_available_cash_manwon, cv_monthly_income_manwon, cv_owned_house_count, cv_credit_grade, cv_purchase_purpose, cv_employment_type, cv_monthly_expenses_manwon, cv_house_ownership, cv_purchase_purpose_v2, cv_purchase_timing, cv_movein_timing, cv_ltv_internal_score, cv_existing_loan_amount, cv_recent_delinquency, cv_card_loan_usage, cv_loan_rejection, cv_monthly_income_range, cv_existing_monthly_repayment",
          )
          .eq("id", user.id)
          .maybeSingle(),
      ]);

      if (!mounted) return;
      const presetCustomer = buildCustomerFromSavedRow(
        (profileResult.data ?? null) as ConditionValidationProfilePresetRow | null,
      );
      setHasSavedConditionPreset(Boolean(presetCustomer));
      const profileData = profileResult.data as ConditionValidationProfilePresetRow | null;
      if (profileData && presetCustomer) {
        setSavedConditionPreset(
          buildSavedConditionPresetSnapshot(profileData, presetCustomer),
        );
      } else {
        setSavedConditionPreset(null);
      }

      if (profileResult.error) {
        console.error("[home condition preset] load error:", profileResult.error);
        setShowConditionSetupCard(true);
        return;
      }

      const homeDraft = loadHomeConditionDraft();

      if (requestResult.error) {
        console.error("[home condition request] load error:", requestResult.error);
      }
      const latest = (requestResult.data?.[0] ?? null) as ConditionValidationRequestRow | null;
      const latestCustomer = latest ? buildCustomerFromSavedRow(latest) : null;
      const sessionSnapshot = loadConditionSession();
      const source = pickLoggedInConditionSource({
        hasProfile: Boolean(profileData && presetCustomer),
        hasRequest: Boolean(latest && latestCustomer),
        hasDraft: Boolean(homeDraft?.snapshot || homeDraft?.customer),
        hasSession: Boolean(sessionSnapshot),
      });

      // session을 사용하지 않는 경우에만 클리어.
      // (이전 사용자의 게스트 세션이 로그인 사용자에게 보이는 것을 방지)
      if (source !== "session") {
        clearConditionSession();
      }

      if (source === "request" && latest && latestCustomer) {
          const requestPayload = toUnknownRecord(latest.input_payload);
          const requestCustomer = toUnknownRecord(requestPayload?.customer) ?? {
            available_cash: latest.available_cash_manwon,
            monthly_income: latest.monthly_income_manwon,
            owned_house_count: latest.owned_house_count,
            credit_grade: latest.credit_grade,
            purchase_purpose: latest.purchase_purpose,
          };
          applyCustomerStateFromRaw(requestCustomer);
          setShowConditionSetupCard(false);
          await applyRecommendationRef.current(latestCustomer, { closeModal: false });
          return;
      }

      if (source === "profile" && profileData && presetCustomer) {
        applyProfileConditionPreset(profileData, presetCustomer);
        setShowConditionSetupCard(false);
        await applyRecommendationRef.current(presetCustomer, { closeModal: false });
        clearHomeConditionDraft();
        return;
      }

      if (source === "draft" && homeDraft) {
        const draftCustomer = buildCustomerPayloadFromRaw(
          toUnknownRecord(homeDraft.customer),
        );
        const draftSnapshot = homeDraft.snapshot ?? null;
        const draftRegions = Array.isArray(homeDraft.regions)
          ? homeDraft.regions.filter((value): value is OfferingRegionTab =>
              OFFERING_REGION_TABS.includes(value),
            )
          : [];
        setConditionRegions(draftRegions);

        if (draftSnapshot) {
          applySessionCondition(draftSnapshot);
        } else if (draftCustomer) {
          applyCustomerStateFromRaw(draftCustomer);
        }

        const restoredCustomer =
          draftCustomer ??
          (draftSnapshot ? buildCustomerFromSessionSnapshot(draftSnapshot) : null);
        if (restoredCustomer) {
          setShowConditionSetupCard(false);
          await applyRecommendationRef.current(restoredCustomer, {
            closeModal: false,
          });
          clearHomeConditionDraft();
          return;
        }
      }

      if (source === "session" && sessionSnapshot) {
        try {
          applySessionCondition(sessionSnapshot);
          const sessionCustomer = buildCustomerFromSessionSnapshot(sessionSnapshot);
          if (sessionCustomer) {
            setShowConditionSetupCard(false);
            await applyRecommendationRef.current(sessionCustomer, {
              closeModal: false,
            });
            return;
          }
        } catch {
          // Ignore session restore failures and fall back to empty state.
        }
      }

      setShowConditionSetupCard(true);
    })();

    return () => {
      mounted = false;
    };
  // applyRecommendationRef는 항상 최신 콜백을 참조하므로 deps에서 제외
  // → 유저가 필드를 수정해도 이 effect가 재실행되지 않음
  }, [applyCustomerStateFromRaw, applyProfileConditionPreset, applySessionCondition, supabase]);

  return (
    <>
      <div className="flex justify-end" role="tablist" aria-label="홈 현장 전환">
        <div className="relative inline-grid grid-cols-2 rounded-full border border-(--oboon-border-default) bg-(--oboon-bg-default) p-1 shadow-(--oboon-shadow-card)">
          <span
            aria-hidden="true"
            className={[
              "pointer-events-none absolute bottom-1 top-1 w-[calc(50%-4px)] rounded-full bg-(--oboon-primary) transition-transform duration-300 ease-out",
              view === "consult" ? "translate-x-0 left-1" : "translate-x-full left-1",
            ].join(" ")}
          />
        <button
          type="button"
          role="tab"
          aria-selected={view === "consult"}
          className={[
            "relative z-10 rounded-full px-4 py-1.5 ob-typo-body2 transition-colors",
            view === "consult"
              ? "text-(--oboon-on-primary)"
              : "text-(--oboon-text-muted) hover:text-(--oboon-text-title)",
          ].join(" ")}
          onClick={() => setView("consult")}
        >
          상담 현장
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === "condition"}
          className={[
            "relative z-10 rounded-full px-4 py-1.5 ob-typo-body2 transition-colors",
            view === "condition"
              ? "text-(--oboon-on-primary)"
              : "text-(--oboon-text-muted) hover:text-(--oboon-text-title)",
          ].join(" ")}
          onClick={() => setView("condition")}
        >
          맞춤 현장
        </button>
        </div>
      </div>

      {view === "consult" ? (
        <>
          {/* 상담 신청 가능 현장 */}
          <section className="mt-3 flex flex-col gap-2">
            <SectionHeader
              title={Copy.home.consultable.title}
              caption={Copy.home.consultable.subtitle}
              rightLink={{ href: consultableOfferingsHref, label: "전체보기" }}
            />

            {!rowsLoaded ? (
              <div className="space-y-3 sm:grid sm:grid-cols-2 sm:gap-4 sm:space-y-0 lg:grid-cols-3">
                {[0, 1, 2].map((i) => (
                  <OfferingCardSkeleton key={i} mobileRecommendationLayout seed={i} />
                ))}
              </div>
            ) : consultableOfferings.length === 0 ? (
              <EmptyState
                title={Copy.home.consultable.empty.title}
                description={Copy.home.consultable.empty.subtitle}
              />
            ) : (
              <ResponsiveOfferingRow
                items={consultableOfferings}
                scrapedPropertyIds={scrapedPropertyIds}
                isLoggedIn={isLoggedIn === true}
                mobileLayout="stack"
                mobileCardLayout
                consultableOfferingIds={consultableOfferingIdSet}
              />
            )}
          </section>

          {/* 지역별 인기 분양 */}
          <section className="mt-8 sm:mt-10 flex flex-col gap-2">
            <SectionHeader
              title={Copy.home.regional.title}
              caption={Copy.home.regional.subtitle}
              rightLink={{ href: popularOfferingsHref, label: "전체보기" }}
            />
            {loadError && (
              <div className="ob-typo-caption text-(--oboon-danger)">
                데이터를 불러오지 못했어요. ({loadError})
              </div>
            )}
            <div>
              <RegionFilterRow
                value={effectiveSelectedRegion}
                onChange={setSelectedRegion}
                enabledRegions={enabledRegions}
              />
            </div>

            {!rowsLoaded ? (
              <div className="space-y-3 sm:grid sm:grid-cols-2 sm:gap-4 sm:space-y-0 lg:grid-cols-3">
                {[0, 1, 2].map((i) => (
                  <OfferingCardSkeleton key={i} mobileRecommendationLayout seed={i + 3} />
                ))}
              </div>
            ) : popularOfferings.length === 0 ? (
              <EmptyState
                title={Copy.home.regional.empty.title}
                description={Copy.home.regional.empty.subtitle}
              />
            ) : (
              <ResponsiveOfferingRow
                items={popularOfferings}
                scrapedPropertyIds={scrapedPropertyIds}
                isLoggedIn={isLoggedIn === true}
                mobileLayout="stack"
                mobileCardLayout
              />
            )}
          </section>
        </>
      ) : (
        <>
          {showConditionSetupCard ? (
            /* ── 조건 미설정: 소개 카드만 표시 ── */
            <section className="-mt-1">
              <Card className="overflow-hidden border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-4 shadow-(--oboon-shadow-card) md:p-6">
                <div className="grid gap-5 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-6">
                  <div className="p-2">
                    <h2 className="ob-typo-h2 text-(--oboon-text-title)">
                      교통·학군·개발호재
                      <br />
                      반려동물 여부까지
                    </h2>
                    <p className="mt-3 ob-typo-subtitle text-(--oboon-text-muted)">
                      관심 현장의 모든 조건을 한눈에 검증합니다.
                      <br />
                      기존 조건 검증 기준으로 자동 추천해 드려요.
                    </p>

                    <Button
                      type="button"
                      size="lg"
                      variant="primary"
                      className="mt-5 h-11 px-5 shadow-(--oboon-shadow-card)"
                      onClick={() => {
                        if (window.innerWidth < 1024) {
                          router.push("/recommendations/conditions/step/1");
                        } else {
                          setConditionModalOpen(true);
                        }
                      }}
                    >
                      {Copy.home.customMatch.cta}
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-1">
                    <ConditionFeatureItem
                      title={Copy.home.customMatch.conditions.traffic.label}
                      description={Copy.home.customMatch.conditions.traffic.description}
                      icon={<BusFront className="h-5 w-5" />}
                      iconToneClass="bg-[color-mix(in_srgb,var(--oboon-primary)_16%,transparent)] text-(--oboon-primary)"
                    />
                    <ConditionFeatureItem
                      title={Copy.home.customMatch.conditions.school.label}
                      description={Copy.home.customMatch.conditions.school.description}
                      icon={<GraduationCap className="h-5 w-5" />}
                      iconToneClass="bg-(--oboon-safe-bg) text-(--oboon-safe-text)"
                    />
                    <ConditionFeatureItem
                      title={Copy.home.customMatch.conditions.development.label}
                      description={Copy.home.customMatch.conditions.development.description}
                      icon={<Pickaxe className="h-5 w-5" />}
                      iconToneClass="bg-[color-mix(in_srgb,var(--oboon-warning-text)_16%,transparent)] text-(--oboon-warning-text)"
                    />
                    <ConditionFeatureItem
                      title={Copy.home.customMatch.conditions.pets.label}
                      description={Copy.home.customMatch.conditions.pets.description}
                      icon={<PawPrint className="h-5 w-5" />}
                      iconToneClass="bg-[color-mix(in_srgb,var(--oboon-text-muted)_14%,transparent)] text-(--oboon-text-muted)"
                    />
                  </div>
                </div>
              </Card>
            </section>
          ) : (
            /* ── 조건 적용 후: 리스트 + 수정 버튼 ── */
            <section className="mt-1 flex flex-col gap-2">
              <div className="mb-3 sm:mb-4 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="ob-typo-h2 text-(--oboon-text-title)">{Copy.home.customMatch.listTitle}</h2>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (window.innerWidth < 1024) {
                          router.push("/recommendations/conditions/step/1");
                        } else {
                          setConditionModalOpen(true);
                        }
                      }}
                      className="inline-flex h-8 items-center gap-1.5 rounded-full border border-(--oboon-border-default) px-3 ob-typo-caption text-(--oboon-text-muted) transition-colors hover:border-(--oboon-primary)/60 hover:text-(--oboon-primary)"
                    >
                      <SlidersHorizontal className="h-3 w-3" />
                      조건 수정
                    </button>
                    <Link
                      href="/recommendations"
                      className="shrink-0 ob-typo-body text-(--oboon-text-muted) hover:text-(--oboon-primary)"
                    >
                      전체보기
                    </Link>
                  </div>
                </div>
                {appliedConditionChips.length > 0 ? (
                  <ConditionBar chips={appliedConditionChips} />
                ) : (
                  <p className="ob-typo-caption text-(--oboon-text-muted)">
                    {Copy.home.customMatch.listSubtitle}
                  </p>
                )}
              </div>

              {loadError && (
                <div className="ob-typo-caption text-(--oboon-danger)">
                  데이터를 불러오지 못했어요. ({loadError})
                </div>
              )}

              {conditionMatchedOfferings.length === 0 ? (
                <Card className="p-6 ob-typo-body text-(--oboon-text-muted)">
                  선택한 조건에 맞는 분양이 아직 없어요.
                </Card>
              ) : (
                <ResponsiveOfferingRow
                  items={conditionMatchedOfferings}
                  recommendedCategoriesById={recommendedCategoriesById}
                  recommendedItemsById={recommendedItemsById}
                  scrapedPropertyIds={scrapedPropertyIds}
                  isLoggedIn={isLoggedIn === true}
                  mobileLayout="stack"
                />
              )}
            </section>
          )}
        </>
      )}

      <Modal
        open={conditionModalOpen}
        onClose={() => setConditionModalOpen(false)}
        size="sm"
      >
        <div>
          <h3 className="ob-typo-h3 text-(--oboon-text-title)">맞춤 조건 설정</h3>
          <p className="mt-1 ob-typo-subtitle text-(--oboon-text-muted)">
            조건을 입력하면 맞춤 현장을 계산해요.
          </p>
          <div className="mt-4 space-y-3">
            {isLoggedIn !== false && hasSavedConditionPreset && isConditionDirty ? (
              <ConditionDirtyBanner onRestoreDefault={handleRestoreDefaultCondition} />
            ) : null}
            <ConditionWizard
              condition={wizardCondition}
              isLoggedIn={isLoggedIn !== false}
              hasSavedConditionPreset={hasSavedConditionPreset}
              isConditionDirty={isConditionDirty}
              onRestoreDefault={handleRestoreDefaultCondition}
              evaluateOnFinish
              isLoading={conditionApplyLoading}
              isSaving={conditionSaveLoading}
              onChange={handleWizardChange}
              onEvaluate={() =>
                isLoggedIn === false
                  ? handleGuestApplyCondition()
                  : handleApplyCondition()
              }
              onSave={handleSaveConditionPreset}
              onLoginAndSave={async () => {
                handleLoginAndSaveCondition();
              }}
            />
          </div>

          <div className="mt-3 flex items-center justify-end gap-3">
            {conditionError ? (
              <p className="ob-typo-caption text-(--oboon-danger)">{conditionError}</p>
            ) : conditionNotice ? (
              <p className="ob-typo-caption text-(--oboon-primary)">{conditionNotice}</p>
            ) : null}
          </div>
        </div>
      </Modal>
    </>
  );
}

function ConditionFeatureItem({
  title,
  description,
  icon,
  iconToneClass,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  iconToneClass: string;
}) {
  return (
    <div
      className={[
        "flex items-center gap-3 rounded-2xl border bg-(--oboon-bg-surface) border-(--oboon-border-default) px-3.5 py-3"
      ].join(" ")}
    >
      <div className={["inline-flex h-10 w-10 items-center justify-center rounded-full", iconToneClass].join(" ")}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="ob-typo-subtitle text-(--oboon-text-title)">{title}</p>
        </div>
        <p className="mt-0.5 hidden sm:block ob-typo-body text-(--oboon-text-muted)">
          {description}
        </p>
      </div>
    </div>
  );
}

function SectionHeader({
  title,
  caption,
  rightLink,
}: {
  title: string;
  caption?: string;
  rightLink?: { href: string; label: string };
}) {
  return (
    <div className="mb-1.5 sm:mb-2 flex items-baseline justify-between gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="ob-typo-h2 text-(--oboon-text-title)">{title}</h2>
        {caption && (
          <p className="ob-typo-body text-(--oboon-text-muted)">{caption}</p>
        )}
      </div>

      {rightLink ? (
        <Link
          href={rightLink.href}
          className="shrink-0 ob-typo-body text-(--oboon-text-muted) hover:text-(--oboon-primary)"
        >
          {rightLink.label}
        </Link>
      ) : null}
    </div>
  );
}

function HomeMobileRecommendationDetailSheet({
  item,
  onClose,
}: {
  item: RecommendationItem | null;
  onClose: () => void;
}) {
  if (!item) return null;

  return (
    <div className="sm:hidden">
      <div
        className="fixed inset-0 z-(--oboon-z-modal) bg-(--oboon-overlay) backdrop-blur-sm"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onClose();
        }}
        aria-hidden="true"
      />
      <div className="fixed inset-x-0 bottom-0 z-(--oboon-z-modal) flex max-h-[88dvh] flex-col rounded-t-xl border border-b-0 border-(--oboon-border-default) bg-(--oboon-bg-surface) shadow-(--oboon-shadow-card)">
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <RecommendationPreviewContent
            property={item.property}
            evalResult={item.evalResult}
            showFinalBadge={false}
            showSummary={false}
          />
        </div>

        <div className="shrink-0 border-t border-(--oboon-border-default) bg-(--oboon-bg-subtle) px-5 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
          <Button asChild variant="primary" shape="pill" className="w-full">
            <Link href={ROUTES.offerings.detail(item.property.id)}>
              현장 상세 보기
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function ResponsiveOfferingRow({
  items,
  recommendedCategoriesById,
  recommendedItemsById,
  scrapedPropertyIds,
  isLoggedIn,
  mobileLayout = "carousel",
  mobileCardLayout = false,
  consultableOfferingIds,
}: {
  items: Offering[];
  recommendedCategoriesById?: Map<number, ConditionCategoryGrades>;
  recommendedItemsById?: Map<number, RecommendationItem>;
  scrapedPropertyIds?: Set<number>;
  isLoggedIn?: boolean;
  mobileLayout?: "carousel" | "stack";
  mobileCardLayout?: boolean;
  consultableOfferingIds?: Set<number>;
}) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [flippedId, setFlippedId] = useState<number | null>(null);

  const [mobileDetailItem, setMobileDetailItem] = useState<RecommendationItem | null>(null);
  const itemIds = useMemo(
    () => new Set(items.map((item) => Number(item.id))),
    [items],
  );
  const activeSelectedId =
    selectedId !== null && itemIds.has(selectedId) ? selectedId : null;
  const activeFlippedId =
    flippedId !== null && itemIds.has(flippedId) ? flippedId : null;

  const activeMobileDetailItem =
    mobileDetailItem && itemIds.has(mobileDetailItem.property.id)
      ? mobileDetailItem
      : null;

  const handleSelect = useCallback((id: number) => {
    setSelectedId(id);
  }, []);

  const handleFlip = useCallback((id: number) => {
    setSelectedId(id);
    setFlippedId((prev) => (prev === id ? null : id));
  }, []);

  const handleMobileDetailOpen = useCallback((item: RecommendationItem) => {
    setSelectedId(item.property.id);
    setMobileDetailItem(item);
  }, []);

  const handleMobileDetailClose = useCallback(() => {
    setMobileDetailItem(null);
    setSelectedId(null);
  }, []);

  function renderMobileOrTabletItem(offering: Offering, index: number) {
    const numericId = Number(offering.id);
    const recommendationItem = recommendedItemsById?.get(numericId) ?? null;
    const isConsultable = consultableOfferingIds?.has(numericId) ?? false;

    if (recommendationItem) {
      return (
        <OfferingCard
          offering={recommendationItem.offering}
          evalResult={recommendationItem.evalResult}
          recommendationTier="primary"
          isSelected={activeSelectedId === Number(recommendationItem.offering.id)}
          navigateOnClick={false}
          onCardClick={() => handleMobileDetailOpen(recommendationItem)}
          interactionMode="button"
          isLoggedIn={isLoggedIn ?? false}
          initialScrapped={scrapedPropertyIds?.has(numericId) ?? false}
          priority={index === 0}
        />
      );
    }

    return (
      <OfferingCard
        offering={offering}
        conditionCategories={recommendedCategoriesById?.get(numericId)}
        mobileRecommendationLayout={mobileCardLayout}
        isConsultable={isConsultable}
        initialScrapped={scrapedPropertyIds?.has(numericId) ?? false}
        isLoggedIn={isLoggedIn ?? false}
        priority={index === 0}
      />
    );
  }

  function renderDesktopItem(offering: Offering, index: number) {
    const numericId = Number(offering.id);
    const recommendationItem = recommendedItemsById?.get(numericId) ?? null;
    const isConsultable = consultableOfferingIds?.has(numericId) ?? false;

    if (recommendationItem) {
      return (
        <FlippableRecommendationCard
          item={recommendationItem}
          isSelected={activeSelectedId === recommendationItem.property.id}
          isFlipped={activeFlippedId === recommendationItem.property.id}
          disableFlip={recommendationItem.evalResult.isMasked}
          initialScrapped={scrapedPropertyIds?.has(numericId) ?? false}
          isLoggedIn={isLoggedIn ?? false}
          priority={index === 0}
          onFlip={() => handleFlip(recommendationItem.property.id)}
          onSelect={() => handleSelect(recommendationItem.property.id)}
        />
      );
    }

    return (
      <OfferingCard
        offering={offering}
        conditionCategories={recommendedCategoriesById?.get(numericId)}
        mobileRecommendationLayout={mobileCardLayout}
        isConsultable={isConsultable}
        initialScrapped={scrapedPropertyIds?.has(numericId) ?? false}
        isLoggedIn={isLoggedIn ?? false}
        priority={index === 0}
      />
    );
  }

  return (
    <>
      <div className="md:hidden">
        {mobileLayout === "stack" ? (
          <div className="space-y-3">
            {items.map((offering, index) => (
              <div key={offering.id} className="min-w-0">
                {renderMobileOrTabletItem(offering, index)}
              </div>
            ))}
          </div>
        ) : (
          <div className="-mx-4">
            <div className="relative">
              <div
                className={[
                  "flex gap-3 overflow-x-auto pb-3 px-4",
                  "snap-x snap-mandatory",
                  "[-webkit-overflow-scrolling:touch]",
                  "scrollbar-none",
                  "scroll-pl-4 scroll-pr-4",
                ].join(" ")}
              >
                {items.map((offering, index) => (
                  <div
                    key={offering.id}
                    className="w-[17.5rem] shrink-0 snap-start"
                  >
                    {renderMobileOrTabletItem(offering, index)}
                  </div>
                ))}

                <div className="shrink-0 w-4" />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="hidden md:block lg:hidden">
        <div className="-mx-4 overflow-visible md:-mx-5">
          <div
            className={[
              "flex gap-3 overflow-x-auto overflow-y-visible px-4 py-3 pb-8 md:gap-4 md:px-5",
              "snap-x snap-mandatory",
              "[-webkit-overflow-scrolling:touch]",
              "scrollbar-none",
              "scroll-pl-4 scroll-pr-4 scroll-pb-8 md:scroll-pl-5 md:scroll-pr-5",
            ].join(" ")}
          >
            {items.map((offering, index) => (
              <div
                key={offering.id}
                className="w-[calc((100%-1rem)/2)] shrink-0 snap-start"
              >
                {renderMobileOrTabletItem(offering, index)}
              </div>
            ))}

            <div className="shrink-0 w-4" />
          </div>
        </div>
      </div>

      <div className="hidden lg:block">
        <ProjectRow>
          {items.slice(0, 3).map((offering, index) => (
            <div key={offering.id} className="min-w-0">
              {renderDesktopItem(offering, index)}
            </div>
          ))}
        </ProjectRow>
      </div>

      <HomeMobileRecommendationDetailSheet
        item={activeMobileDetailItem}
        onClose={handleMobileDetailClose}
      />
    </>
  );
}

function ProjectRow({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 lg:grid-cols-3">{children}</div>;
}

function RegionFilterRow({
  value,
  onChange,
  enabledRegions,
}: {
  value: OfferingRegionTab;
  onChange: (v: OfferingRegionTab) => void;
  enabledRegions: OfferingRegionTab[];
}) {
  return (
    <>
      {/* Mobile: horizontal scroll chips */}
      <div className="sm:hidden -mx-4 pl-4">
        <div className="flex gap-2 overflow-x-auto pb-2 pr-4 [-webkit-overflow-scrolling:touch] scrollbar-none">
          {enabledRegions.map((region) => {
            const isActive = value === region;
            return (
              <Button
                key={region}
                type="button"
                size="sm"
                shape="pill"
                variant={isActive ? "primary" : "secondary"}
                onClick={() => onChange(region)}
                className="shrink-0"
                aria-pressed={isActive}
              >
                {region}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Tablet/Desktop: 기존 버튼 UI 유지 */}
      <div className="hidden sm:flex flex-wrap gap-2">
        {enabledRegions.map((region) => {
          const isActive = value === region;
          return (
            <Button
              key={region}
              type="button"
              size="sm"
              shape="pill"
              variant={isActive ? "primary" : "secondary"}
              onClick={() => onChange(region)}
            >
              {region}
            </Button>
          );
        })}
      </div>
    </>
  );
}
