"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ShieldCheck } from "lucide-react";

import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import ConditionWizard from "@/features/recommendations/components/ConditionWizard";
import { shouldAutoEvaluateDetailValidation } from "@/features/offerings/components/detail/conditionValidationAutoEvaluate";
import { grade5DetailLabel } from "@/features/condition-validation/lib/grade5Labels";
import { getGrade5ToneMeta } from "@/features/condition-validation/lib/grade5Theme";
import {
  loadConditionSession,
  saveConditionSession,
  type ConditionSessionSnapshot,
} from "@/features/condition-validation/lib/sessionCondition";
import type {
  CardLoanUsage,
  CreditGrade,
  DelinquencyCount,
  EmploymentType,
  ExistingLoanAmount,
  FullEvaluationResponse,
  GuestEvaluationResponse,
  FullPurchasePurpose,
  FinalGrade5,
  LoanRejection,
  MonthlyLoanRepayment,
  MonthlyIncomeRange,
  MoveinTiming,
  PurchaseTiming,
} from "@/features/condition-validation/domain/types";
import { creditGradeFromLtvInternalScore } from "@/features/condition-validation/domain/conditionState";
import type { ParsedCustomerInput } from "@/features/condition-validation/domain/validation";
import { formatManwonWithEok } from "@/lib/format/currency";
import type { RecommendationCondition } from "@/features/recommendations/hooks/useRecommendations";
import { createSupabaseClient } from "@/lib/supabaseClient";
import ConditionValidationCategoryPanel from "./ConditionValidationCategoryPanel";
import {
  buildFullConditionCategoryDisplay,
  buildGuestConditionCategoryDisplay,
  normalizeDetailUnitTypeResults,
} from "./conditionValidationDisplay";
import type { RecommendationUnitType } from "@/features/recommendations/lib/recommendationUnitTypes";

// ─── Types ────────────────────────────────────────────────────────────────────

type Grade5Meta = {
  color: string;
  borderColor: string;
  label: string;
};

type SavedConditionState = {
  availableCashManwon: number | null;
  monthlyIncomeManwon: number | null;
  monthlyExpensesManwon: number | null;
  employmentType: EmploymentType | null;
  houseOwnership: "none" | "one" | "two_or_more" | null;
  purchasePurposeV2: FullPurchasePurpose | null;
  purchaseTiming: PurchaseTiming | null;
  moveinTiming: MoveinTiming | null;
  ltvInternalScore: number | null;
  existingLoan: ExistingLoanAmount | null;
  recentDelinquency: DelinquencyCount | null;
  cardLoanUsage: CardLoanUsage | null;
  loanRejection: LoanRejection | null;
  monthlyIncomeRange: MonthlyIncomeRange | null;
  existingMonthlyRepayment: MonthlyLoanRepayment | null;
};

function grade5Meta(grade: FinalGrade5): Grade5Meta {
  switch (grade) {
    case "GREEN":
      return {
        color: "var(--oboon-grade-green)",
        borderColor: "var(--oboon-grade-green-border)",
        label: grade5DetailLabel(grade),
      };
    case "LIME":
      return {
        color: "var(--oboon-grade-lime)",
        borderColor: "var(--oboon-grade-lime-border)",
        label: grade5DetailLabel(grade),
      };
    case "YELLOW":
      return {
        color: "var(--oboon-grade-yellow)",
        borderColor: "var(--oboon-grade-yellow-border)",
        label: grade5DetailLabel(grade),
      };
    case "ORANGE":
      return {
        color: "var(--oboon-grade-orange)",
        borderColor: "var(--oboon-grade-orange-border)",
        label: grade5DetailLabel(grade),
      };
    case "RED":
      return {
        color: "var(--oboon-grade-red)",
        borderColor: "var(--oboon-grade-red-border)",
        label: grade5DetailLabel(grade),
      };
  }
}

type UnitTypeSummary = {
  title: string;
  count: number;
  leadTitle: string | null;
  leadUnit: RecommendationUnitType | null;
  units: RecommendationUnitType[];
  note: string;
};

function isPositiveGrade(grade: FinalGrade5) {
  return grade === "GREEN" || grade === "LIME";
}

function isAvailableUnit(unit: RecommendationUnitType) {
  if (!isPositiveGrade(unit.finalGrade)) return false;
  if (unit.categories.length === 0) return true;
  return unit.categories.every((category) => isPositiveGrade(category.grade));
}

function buildUnitTypeSummary(units: RecommendationUnitType[]): UnitTypeSummary | null {
  if (units.length === 0) return null;

  const availableUnits = units.filter(isAvailableUnit);
  const sourceUnits = availableUnits.length > 0 ? availableUnits : units;
  const topUnits = sourceUnits.slice(0, 2);
  const leadUnit = topUnits[0] ?? null;

  return {
    title: availableUnits.length > 0 ? "가능한 타입" : "대안 타입",
    count: sourceUnits.length,
    leadTitle: leadUnit ? `가장 유리한 타입은 ${leadUnit.title}입니다.` : null,
    leadUnit,
    units: topUnits,
    note: "전체 타입별 결과는 아래 분양가표에서 확인할 수 있습니다.",
  };
}

// ─── Input helpers ─────────────────────────────────────────────────────────────

function parseNullableNumericInput(value: string): number | null {
  const normalized = value.replaceAll(",", "").trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

function formatStoredAmount(value: number): string {
  return value.toLocaleString("ko-KR");
}

function hasStoredProfileAutoFill(profileAutoFill: ProfileAutoFillData | null | undefined): boolean {
  if (!profileAutoFill) return false;

  return Boolean(
    profileAutoFill.availableCashManwon != null ||
      profileAutoFill.monthlyIncomeManwon != null ||
      profileAutoFill.monthlyExpensesManwon != null ||
      profileAutoFill.employmentType ||
      profileAutoFill.houseOwnership ||
      profileAutoFill.purchasePurposeV2 ||
      profileAutoFill.purchaseTiming ||
      profileAutoFill.moveinTiming ||
      (profileAutoFill.ltvInternalScore ?? 0) > 0 ||
      profileAutoFill.existingLoan ||
      profileAutoFill.recentDelinquency ||
      profileAutoFill.cardLoanUsage ||
      profileAutoFill.loanRejection ||
      profileAutoFill.monthlyIncomeRange ||
      profileAutoFill.existingMonthlyRepayment != null,
  );
}

function toSavedConditionState(
  profileAutoFill: ProfileAutoFillData | null | undefined,
): SavedConditionState | null {
  if (!profileAutoFill || !hasStoredProfileAutoFill(profileAutoFill)) return null;

  return {
    availableCashManwon: profileAutoFill.availableCashManwon,
    monthlyIncomeManwon: profileAutoFill.monthlyIncomeManwon,
    monthlyExpensesManwon: profileAutoFill.monthlyExpensesManwon,
    employmentType: profileAutoFill.employmentType,
    houseOwnership: profileAutoFill.houseOwnership,
    purchasePurposeV2: profileAutoFill.purchasePurposeV2,
    purchaseTiming: profileAutoFill.purchaseTiming,
    moveinTiming: profileAutoFill.moveinTiming,
    ltvInternalScore: profileAutoFill.ltvInternalScore,
    existingLoan: profileAutoFill.existingLoan,
    recentDelinquency: profileAutoFill.recentDelinquency,
    cardLoanUsage: profileAutoFill.cardLoanUsage,
    loanRejection: profileAutoFill.loanRejection,
    monthlyIncomeRange: profileAutoFill.monthlyIncomeRange,
    existingMonthlyRepayment: profileAutoFill.existingMonthlyRepayment,
  };
}

// ─── Props ─────────────────────────────────────────────────────────────────────

/** 마이페이지에서 저장한 맞춤 정보 — 자동 채움 + 자동 검증에 사용 */
export type ProfileAutoFillData = {
  availableCashManwon: number | null;
  monthlyIncomeManwon: number | null;
  monthlyExpensesManwon: number | null;
  employmentType: EmploymentType | null;
  houseOwnership: "none" | "one" | "two_or_more" | null;
  purchasePurposeV2: FullPurchasePurpose | null;
  purchaseTiming: PurchaseTiming | null;
  moveinTiming: MoveinTiming | null;
  ltvInternalScore: number | null;
  existingLoan: ExistingLoanAmount | null;
  recentDelinquency: DelinquencyCount | null;
  cardLoanUsage: CardLoanUsage | null;
  loanRejection: LoanRejection | null;
  monthlyIncomeRange: MonthlyIncomeRange | null;
  existingMonthlyRepayment: MonthlyLoanRepayment | null;
};

type ConditionValidationCardProps = {
  propertyId?: number;
  propertyName?: string;
  presetCustomer?: {
    availableCash: number;
    monthlyIncome: number;
    ownedHouseCount: number;
    creditGrade: "good" | "normal" | "unstable";
    purchasePurpose: "residence" | "investment" | "both";
  } | null;
  /** 로그인 유저의 저장된 맞춤 정보 — 자동 채움 및 자동 검증에 사용 */
  profileAutoFill?: ProfileAutoFillData | null;
  isLoggedIn: boolean;
  onAlternativeRecommendRequest: (customer: ParsedCustomerInput) => Promise<void> | void;
  onLoginRequest: () => void;
};

// ─── Constants ─────────────────────────────────────────────────────────────────

// ─── Main Component ────────────────────────────────────────────────────────────

export default function ConditionValidationCard({
  propertyId,
  propertyName,
  // presetCustomer is kept for backward compatibility with parent components but not used in v2
  presetCustomer: _presetCustomer, // eslint-disable-line @typescript-eslint/no-unused-vars
  profileAutoFill,
  isLoggedIn,
  onAlternativeRecommendRequest,
  onLoginRequest,
}: ConditionValidationCardProps) {
  const supabase = createSupabaseClient();
  const toast = useToast();
  // Form state
  const [employmentType, setEmploymentType] = useState<EmploymentType | null>(null);
  const [availableCash, setAvailableCash] = useState("");
  const [monthlyIncome, setMonthlyIncome] = useState("");
  const [monthlyExpenses, setMonthlyExpenses] = useState("");
  const [houseOwnership, setHouseOwnership] = useState<"none" | "one" | "two_or_more" | null>(null);
  const [purchasePurpose, setPurchasePurpose] = useState<FullPurchasePurpose | null>(null);
  const [purchaseTiming, setPurchaseTiming] = useState<PurchaseTiming | null>(null);
  const [moveinTiming, setMoveinTiming] = useState<MoveinTiming | null>(null);

  // 비로그인 전용 간이 신용 상태 (로그인 시 LTV/DSR로 대체)
  const [guestCreditGrade, setGuestCreditGrade] = useState<CreditGrade | null>(null);

  const [ltvInternalScore, setLtvInternalScore] = useState<number | null>(null);
  const [existingLoan, setExistingLoan] = useState<ExistingLoanAmount | null>(null);
  const [recentDelinquency, setRecentDelinquency] = useState<DelinquencyCount | null>(null);
  const [cardLoanUsage, setCardLoanUsage] = useState<CardLoanUsage | null>(null);
  const [loanRejection, setLoanRejection] = useState<LoanRejection | null>(null);
  const [monthlyIncomeRange, setMonthlyIncomeRange] = useState<MonthlyIncomeRange | null>(null);
  const [existingMonthlyRepayment, setExistingMonthlyRepayment] =
    useState<MonthlyLoanRepayment | null>(null);

  // 비로그인 간편 검증 결과
  const [guestResponse, setGuestResponse] = useState<GuestEvaluationResponse | null>(null);
  const [guestLoading, setGuestLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [savedConditionState, setSavedConditionState] = useState<SavedConditionState | null>(
    () => toSavedConditionState(profileAutoFill),
  );

  // UI state
  const [isInputSectionVisible, setIsInputSectionVisible] = useState(true);
  const [loading, setLoading] = useState(false);
  const [recommendLoading, setRecommendLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [response, setResponse] = useState<FullEvaluationResponse | null>(null);
  const autoEvaluatedRef = useRef(false);
  const evaluateInFlightRef = useRef(false);

  // Derived
  const result = response?.ok ? response.result : undefined;
  const categories = response?.ok ? response.categories : undefined;
  const metrics = response?.ok ? response.metrics : undefined;
  const showModifyButton = !isInputSectionVisible;
  const availableCashManwon = parseNullableNumericInput(availableCash);
  const monthlyIncomeManwon = parseNullableNumericInput(monthlyIncome);
  const isFullPricePublic = response?.display?.price_visibility === "public";
  const isGuestPricePublic = guestResponse?.display?.price_visibility === "public";
  const guestCategoryItems = useMemo(
    () =>
      buildGuestConditionCategoryDisplay({
        categories: guestResponse?.categories,
        metrics: guestResponse?.metrics,
        inputs: {
          availableCash: availableCashManwon,
          houseOwnership,
          purchasePurpose,
        },
        isPricePublic: isGuestPricePublic,
      }),
    [
      availableCashManwon,
      guestResponse?.categories,
      guestResponse?.metrics,
      houseOwnership,
      isGuestPricePublic,
      purchasePurpose,
    ],
  );
  const fullCategoryItems = useMemo(
    () =>
      buildFullConditionCategoryDisplay({
        categories,
        metrics,
        inputs: {
          availableCash: availableCashManwon,
          monthlyIncome: monthlyIncomeManwon,
          employmentType,
          houseOwnership,
          purchasePurpose,
        },
        isPricePublic: isFullPricePublic,
      }),
    [
      availableCashManwon,
      categories,
      employmentType,
      houseOwnership,
      isFullPricePublic,
      metrics,
      monthlyIncomeManwon,
      purchasePurpose,
    ],
  );
  const guestUnitTypes = useMemo(
    () => normalizeDetailUnitTypeResults(guestResponse?.unit_type_results),
    [guestResponse?.unit_type_results],
  );
  const fullUnitTypes = useMemo(
    () => normalizeDetailUnitTypeResults(response?.unit_type_results),
    [response?.unit_type_results],
  );
  const fullUnitTypeSummary = useMemo(
    () => buildUnitTypeSummary(fullUnitTypes),
    [fullUnitTypes],
  );
  const guestUnitTypeSummary = useMemo(
    () => buildUnitTypeSummary(guestUnitTypes),
    [guestUnitTypes],
  );
  const isGuestResultVisible = Boolean(
    guestResponse?.ok && guestResponse.result && !isInputSectionVisible && !isLoggedIn,
  );
  const isFullResultVisible = Boolean(result && !isInputSectionVisible);

  const applySessionCondition = useCallback((snapshot: ConditionSessionSnapshot) => {
    setEmploymentType(snapshot.employmentType);
    setAvailableCash(snapshot.availableCash);
    setMonthlyIncome(snapshot.monthlyIncome);
    setMonthlyExpenses(snapshot.monthlyExpenses);
    setHouseOwnership(snapshot.houseOwnership);
    setPurchasePurpose(snapshot.purchasePurposeV2);
    setPurchaseTiming(snapshot.purchaseTiming);
    setMoveinTiming(snapshot.moveinTiming);
    setExistingLoan(snapshot.existingLoan);
    setRecentDelinquency(snapshot.recentDelinquency);
    setCardLoanUsage(snapshot.cardLoanUsage);
    setLoanRejection(snapshot.loanRejection);
    setMonthlyIncomeRange(snapshot.monthlyIncomeRange);
    setExistingMonthlyRepayment(snapshot.existingMonthlyRepayment);
    setLtvInternalScore(snapshot.ltvInternalScore);
  }, []);

  const validate = useCallback((): string | null => {
    if (!propertyId) return "현장 정보를 찾을 수 없습니다.";
    if (employmentType === null) return "직업 형태를 선택해주세요.";
    const cash = parseNullableNumericInput(availableCash);
    if (cash === null) return "가용 현금을 올바르게 입력해주세요.";
    const income = parseNullableNumericInput(monthlyIncome);
    if (income === null) return "월 세후 소득을 올바르게 입력해주세요.";
    const expenses = parseNullableNumericInput(monthlyExpenses);
    if (expenses === null) return "월 고정 지출을 올바르게 입력해주세요.";
    if (houseOwnership === null) return "주택 보유를 선택해주세요.";
    if (purchasePurpose === null) return "구매 목적을 선택해주세요.";
    if (purchaseTiming === null) return "분양 희망 시점을 선택해주세요.";
    if (moveinTiming === null) return "입주 가능 시점을 선택해주세요.";
    if (ltvInternalScore === null) return "신용 상태(LTV+DSR) 평가를 완료해주세요.";
    if (existingMonthlyRepayment === null) return "월 대출 상환액을 선택해주세요.";
    return null;
  }, [
    availableCash,
    employmentType,
    houseOwnership,
    existingMonthlyRepayment,
    ltvInternalScore,
    monthlyExpenses,
    monthlyIncome,
    moveinTiming,
    propertyId,
    purchasePurpose,
    purchaseTiming,
  ]);

  /** API를 직접 값으로 호출 — form state에 의존하지 않음 */
  const evaluateWithValues = useCallback(
    async (customer: {
      employment_type: EmploymentType;
      available_cash: number;
      monthly_income: number;
      monthly_expenses: number;
      house_ownership: "none" | "one" | "two_or_more";
      purchase_purpose: FullPurchasePurpose;
      purchase_timing: PurchaseTiming;
      movein_timing: MoveinTiming;
      ltv_internal_score: number;
      existing_monthly_repayment: MonthlyLoanRepayment;
    }) => {
      if (!propertyId) return;
      if (evaluateInFlightRef.current) return;
      evaluateInFlightRef.current = true;
      setLoading(true);
      setErrorMessage(null);
      try {
        const res = await fetch("/api/condition-validation/evaluate-v2", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ property_id: propertyId, customer }),
        });

        const data = (await res.json().catch(() => null)) as FullEvaluationResponse | null;

        if (!res.ok || !data?.ok) {
          if (res.status === 401) {
            onLoginRequest();
            return;
          }
          const fieldError = data?.error?.field_errors
            ? Object.values(data.error.field_errors).flat().find(Boolean)
            : null;
          setErrorMessage(fieldError ?? data?.error?.message ?? "조건 검증에 실패했습니다.");
          setResponse(data ?? null);
          return;
        }

        setResponse(data);
        setIsInputSectionVisible(false);
      } catch {
        setErrorMessage("조건 검증 처리 중 네트워크 오류가 발생했습니다.");
      } finally {
        evaluateInFlightRef.current = false;
        setLoading(false);
      }
    },
    [propertyId, onLoginRequest],
  );

  const handleEvaluate = async (): Promise<boolean> => {
    setErrorMessage(null);
    const validationError = validate();
    if (validationError) {
      setErrorMessage(validationError);
      return false;
    }

    saveConditionSession({
      availableCash,
      monthlyIncome,
      monthlyExpenses,
      employmentType,
      houseOwnership,
      purchasePurposeV2: purchasePurpose,
      purchaseTiming,
      moveinTiming,
      ltvInternalScore: ltvInternalScore ?? 0,
      existingLoan,
      recentDelinquency,
      cardLoanUsage,
      loanRejection,
      monthlyIncomeRange,
      existingMonthlyRepayment,
    });

    await evaluateWithValues({
      employment_type: employmentType ?? "employee",
      available_cash: parseNullableNumericInput(availableCash) ?? 0,
      monthly_income: parseNullableNumericInput(monthlyIncome) ?? 0,
      monthly_expenses: parseNullableNumericInput(monthlyExpenses) ?? 0,
      house_ownership: houseOwnership ?? "none",
      purchase_purpose: purchasePurpose ?? "residence",
      purchase_timing: purchaseTiming ?? "by_property",
      movein_timing: moveinTiming ?? "anytime",
      ltv_internal_score: ltvInternalScore ?? 0,
      existing_monthly_repayment: existingMonthlyRepayment!,
    });
    return true;
  };

  const handleGuestEvaluate = async (): Promise<boolean> => {
    setErrorMessage(null);
    if (!propertyId) {
      setErrorMessage("현장 정보를 찾을 수 없습니다.");
      return false;
    }
    const cash = parseNullableNumericInput(availableCash);
    if (cash === null) {
      setErrorMessage("가용 현금을 올바르게 입력해주세요.");
      return false;
    }
    const income = parseNullableNumericInput(monthlyIncome);
    if (income === null) {
      setErrorMessage("월 세후 소득을 올바르게 입력해주세요.");
      return false;
    }
    if (houseOwnership === null || purchasePurpose === null) {
      setErrorMessage("주택 보유와 구매 목적을 선택해주세요.");
      return false;
    }
    if (guestCreditGrade === null) {
      setErrorMessage("신용 상태를 선택해주세요.");
      return false;
    }

    setGuestLoading(true);
    try {
      const res = await fetch("/api/condition-validation/evaluate-guest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          property_id: propertyId,
          customer: {
            available_cash: cash,
            monthly_income: income,
            credit_grade: guestCreditGrade,
            house_ownership: houseOwnership,
            purchase_purpose: purchasePurpose,
          },
        }),
      });

      const data = (await res.json().catch(() => null)) as GuestEvaluationResponse | null;
      if (!res.ok || !data?.ok) {
        setErrorMessage(data?.error?.message ?? "조건 검증에 실패했습니다.");
        return false;
      }

      setGuestResponse(data);
      setIsInputSectionVisible(false);
      return true;
    } catch {
      setErrorMessage("조건 검증 처리 중 네트워크 오류가 발생했습니다.");
      return false;
    } finally {
      setGuestLoading(false);
    }
  };

  // ── 프로필/세션 자동 채움 ──────────────────────────────────────────────────
  useEffect(() => {
    autoEvaluatedRef.current = false;
  }, [propertyId]);

  useEffect(() => {
    setSavedConditionState(toSavedConditionState(profileAutoFill));
  }, [profileAutoFill]);

  useEffect(() => {
    if (!profileAutoFill) return;

    // 폼 필드 자동 채움
    if (profileAutoFill.employmentType) setEmploymentType(profileAutoFill.employmentType);
    if (profileAutoFill.availableCashManwon != null && profileAutoFill.availableCashManwon > 0)
      setAvailableCash(profileAutoFill.availableCashManwon.toLocaleString("ko-KR"));
    if (profileAutoFill.monthlyIncomeManwon != null && profileAutoFill.monthlyIncomeManwon > 0)
      setMonthlyIncome(profileAutoFill.monthlyIncomeManwon.toLocaleString("ko-KR"));
    if (profileAutoFill.monthlyExpensesManwon != null && profileAutoFill.monthlyExpensesManwon > 0)
      setMonthlyExpenses(profileAutoFill.monthlyExpensesManwon.toLocaleString("ko-KR"));
    if (profileAutoFill.houseOwnership) setHouseOwnership(profileAutoFill.houseOwnership);
    if (profileAutoFill.purchasePurposeV2) setPurchasePurpose(profileAutoFill.purchasePurposeV2);
    if (profileAutoFill.purchaseTiming) setPurchaseTiming(profileAutoFill.purchaseTiming);
    if (profileAutoFill.moveinTiming) setMoveinTiming(profileAutoFill.moveinTiming);
    if (profileAutoFill.existingLoan) setExistingLoan(profileAutoFill.existingLoan);
    if (profileAutoFill.recentDelinquency) setRecentDelinquency(profileAutoFill.recentDelinquency);
    if (profileAutoFill.cardLoanUsage) setCardLoanUsage(profileAutoFill.cardLoanUsage);
    if (profileAutoFill.loanRejection) setLoanRejection(profileAutoFill.loanRejection);
    if (profileAutoFill.monthlyIncomeRange) setMonthlyIncomeRange(profileAutoFill.monthlyIncomeRange);
    if (profileAutoFill.existingMonthlyRepayment)
      setExistingMonthlyRepayment(profileAutoFill.existingMonthlyRepayment);
    if (profileAutoFill.ltvInternalScore != null) {
      setLtvInternalScore(profileAutoFill.ltvInternalScore);
    }

    const autoCash = profileAutoFill.availableCashManwon;
    const autoIncome = profileAutoFill.monthlyIncomeManwon;
    const autoExpenses = profileAutoFill.monthlyExpensesManwon;
    const autoLtvScore = profileAutoFill.ltvInternalScore;
    if (
      propertyId == null ||
      autoCash == null ||
      autoCash < 0 ||
      autoIncome == null ||
      autoIncome < 0 ||
      autoExpenses == null ||
      autoExpenses < 0 ||
      autoLtvScore == null ||
      autoLtvScore <= 0
    ) {
      return;
    }

    if (
      !shouldAutoEvaluateDetailValidation({
        source: "profile_autofill",
        isLoggedIn,
        propertyId,
        alreadyEvaluated: autoEvaluatedRef.current,
      })
    ) {
      return;
    }

    autoEvaluatedRef.current = true;
    void evaluateWithValues({
      employment_type: profileAutoFill.employmentType ?? "employee",
      available_cash: autoCash,
      monthly_income: autoIncome,
      monthly_expenses: autoExpenses,
      house_ownership: profileAutoFill.houseOwnership ?? "none",
      purchase_purpose: profileAutoFill.purchasePurposeV2 ?? "residence",
      purchase_timing: profileAutoFill.purchaseTiming ?? "by_property",
      movein_timing: profileAutoFill.moveinTiming ?? "anytime",
      ltv_internal_score: autoLtvScore,
      existing_monthly_repayment: profileAutoFill.existingMonthlyRepayment ?? "none",
    });
  }, [evaluateWithValues, isLoggedIn, profileAutoFill, propertyId]);

  useEffect(() => {
    const sessionSnapshot = loadConditionSession();
    if (!sessionSnapshot) return;

    applySessionCondition(sessionSnapshot);

    const sessionCash = parseNullableNumericInput(sessionSnapshot.availableCash);
    const sessionIncome = parseNullableNumericInput(sessionSnapshot.monthlyIncome);
    const sessionExpenses = parseNullableNumericInput(sessionSnapshot.monthlyExpenses);
    if (
      propertyId == null ||
      sessionCash == null ||
      sessionIncome == null ||
      sessionExpenses == null ||
      sessionSnapshot.ltvInternalScore <= 0
    ) {
      return;
    }

    if (
      !shouldAutoEvaluateDetailValidation({
        source: "session_restore",
        isLoggedIn,
        propertyId,
        alreadyEvaluated: autoEvaluatedRef.current,
      })
    ) {
      return;
    }

    autoEvaluatedRef.current = true;
    void evaluateWithValues({
      employment_type: sessionSnapshot.employmentType ?? "employee",
      available_cash: sessionCash,
      monthly_income: sessionIncome,
      monthly_expenses: sessionExpenses,
      house_ownership: sessionSnapshot.houseOwnership ?? "none",
      purchase_purpose: sessionSnapshot.purchasePurposeV2 ?? "residence",
      purchase_timing: sessionSnapshot.purchaseTiming ?? "by_property",
      movein_timing: sessionSnapshot.moveinTiming ?? "anytime",
      ltv_internal_score: sessionSnapshot.ltvInternalScore,
      existing_monthly_repayment: sessionSnapshot.existingMonthlyRepayment ?? "none",
    });
  }, [applySessionCondition, evaluateWithValues, isLoggedIn, profileAutoFill, propertyId]);

  const handleAlternativeRecommend = async () => {
    setErrorMessage(null);
    const cash = parseNullableNumericInput(availableCash) ?? 0;
    const income = parseNullableNumericInput(monthlyIncome) ?? 0;

    // Convert new inputs to old ParsedCustomerInput format for backward compat
    const oldCustomerInput: ParsedCustomerInput = {
      available_cash: cash,
      monthly_income: income,
      owned_house_count:
        houseOwnership === "none" ? 0 : houseOwnership === "one" ? 1 : 2,
      credit_grade: "good",
      purchase_purpose:
        purchasePurpose === "residence"
          ? "residence"
          : purchasePurpose === "long_term"
            ? "both"
            : "investment",
    };

    setRecommendLoading(true);
    try {
      await onAlternativeRecommendRequest(oldCustomerInput);
    } catch {
      setErrorMessage("대안 현장 추천을 불러오지 못했습니다.");
    } finally {
      setRecommendLoading(false);
    }
  };

  const shouldShowAlternativeButton =
    result?.final_grade === "RED" || result?.final_grade === "ORANGE";

  const wizardCondition: RecommendationCondition = {
    availableCash: parseNullableNumericInput(availableCash) ?? 0,
    monthlyIncome: parseNullableNumericInput(monthlyIncome) ?? 0,
    ownedHouseCount:
      houseOwnership === "two_or_more" ? 2 : houseOwnership === "one" ? 1 : 0,
    creditGrade: guestCreditGrade,
    purchasePurpose:
      purchasePurpose === "residence"
        ? "residence"
        : purchasePurpose === "long_term"
          ? "both"
          : "investment",
    employmentType,
    monthlyExpenses: parseNullableNumericInput(monthlyExpenses) ?? 0,
    houseOwnership,
    purchasePurposeV2: purchasePurpose,
    purchaseTiming,
    moveinTiming,
    ltvInternalScore: ltvInternalScore ?? 0,
    existingLoan,
    recentDelinquency,
    cardLoanUsage,
    loanRejection,
    monthlyIncomeRange,
    existingMonthlyRepayment,
    regions: [],
  };

  const currentConditionState: SavedConditionState = useMemo(() => ({
    availableCashManwon: parseNullableNumericInput(availableCash),
    monthlyIncomeManwon: parseNullableNumericInput(monthlyIncome),
    monthlyExpensesManwon: parseNullableNumericInput(monthlyExpenses),
    employmentType,
    houseOwnership,
    purchasePurposeV2: purchasePurpose,
    purchaseTiming,
    moveinTiming,
    ltvInternalScore,
    existingLoan,
    recentDelinquency,
    cardLoanUsage,
    loanRejection,
    monthlyIncomeRange,
    existingMonthlyRepayment,
  }), [
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
    purchasePurpose,
    purchaseTiming,
    recentDelinquency,
  ]);

  const hasSavedConditionPreset = savedConditionState !== null;
  const isConditionDirty =
    savedConditionState !== null &&
    JSON.stringify(savedConditionState) !== JSON.stringify(currentConditionState);

  const handleWizardChange = (patch: Partial<RecommendationCondition>) => {
    if (patch.availableCash !== undefined) {
      setAvailableCash(
        patch.availableCash > 0 ? patch.availableCash.toLocaleString("ko-KR") : "",
      );
    }
    if (patch.monthlyIncome !== undefined) {
      setMonthlyIncome(
        patch.monthlyIncome > 0 ? patch.monthlyIncome.toLocaleString("ko-KR") : "",
      );
    }
    if (patch.monthlyExpenses !== undefined) {
      setMonthlyExpenses(
        patch.monthlyExpenses > 0 ? patch.monthlyExpenses.toLocaleString("ko-KR") : "",
      );
    }
    if (patch.employmentType !== undefined) setEmploymentType(patch.employmentType);
    if (patch.houseOwnership !== undefined) setHouseOwnership(patch.houseOwnership);
    if (patch.purchasePurposeV2 !== undefined) setPurchasePurpose(patch.purchasePurposeV2);
    if (patch.purchaseTiming !== undefined) setPurchaseTiming(patch.purchaseTiming);
    if (patch.moveinTiming !== undefined) setMoveinTiming(patch.moveinTiming);
    if (patch.creditGrade !== undefined) setGuestCreditGrade(patch.creditGrade);
    if (patch.ltvInternalScore !== undefined) {
      setLtvInternalScore(patch.ltvInternalScore);
      if (patch.creditGrade === undefined) {
        setGuestCreditGrade(creditGradeFromLtvInternalScore(patch.ltvInternalScore));
      }
    }
    if (patch.existingLoan !== undefined) setExistingLoan(patch.existingLoan);
    if (patch.recentDelinquency !== undefined) setRecentDelinquency(patch.recentDelinquency);
    if (patch.cardLoanUsage !== undefined) setCardLoanUsage(patch.cardLoanUsage);
    if (patch.loanRejection !== undefined) setLoanRejection(patch.loanRejection);
    if (patch.monthlyIncomeRange !== undefined) setMonthlyIncomeRange(patch.monthlyIncomeRange);
    if (patch.existingMonthlyRepayment !== undefined) {
      setExistingMonthlyRepayment(patch.existingMonthlyRepayment);
    }
  };

  const handleRestoreDefaultCondition = useCallback(() => {
    if (!savedConditionState) return false;

    setAvailableCash(
      savedConditionState.availableCashManwon == null
        ? ""
        : formatStoredAmount(savedConditionState.availableCashManwon),
    );
    setMonthlyIncome(
      savedConditionState.monthlyIncomeManwon == null
        ? ""
        : formatStoredAmount(savedConditionState.monthlyIncomeManwon),
    );
    setMonthlyExpenses(
      savedConditionState.monthlyExpensesManwon == null
        ? ""
        : formatStoredAmount(savedConditionState.monthlyExpensesManwon),
    );
    setEmploymentType(savedConditionState.employmentType);
    setHouseOwnership(savedConditionState.houseOwnership);
    setPurchasePurpose(savedConditionState.purchasePurposeV2);
    setPurchaseTiming(savedConditionState.purchaseTiming);
    setMoveinTiming(savedConditionState.moveinTiming);
    setLtvInternalScore(savedConditionState.ltvInternalScore);
    setGuestCreditGrade(
      creditGradeFromLtvInternalScore(savedConditionState.ltvInternalScore),
    );
    setExistingLoan(savedConditionState.existingLoan);
    setRecentDelinquency(savedConditionState.recentDelinquency);
    setCardLoanUsage(savedConditionState.cardLoanUsage);
    setLoanRejection(savedConditionState.loanRejection);
    setMonthlyIncomeRange(savedConditionState.monthlyIncomeRange);
    setExistingMonthlyRepayment(savedConditionState.existingMonthlyRepayment);
    return true;
  }, [savedConditionState]);

  useEffect(() => {
    if (!isInputSectionVisible || isLoggedIn === false) return;
    const latestSession = loadConditionSession();
    if (latestSession) {
      applySessionCondition(latestSession);
    }
  }, [isInputSectionVisible, isLoggedIn, applySessionCondition]);

  useEffect(() => {
    if (!propertyId || typeof window === "undefined") return;

    const unitTypeResults = isFullResultVisible ? response?.unit_type_results ?? null : null;

    window.dispatchEvent(
      new CustomEvent("oboon:detail-unit-type-results", {
        detail: {
          propertyId,
          unitTypeResults,
        },
      }),
    );

    return () => {
      window.dispatchEvent(
        new CustomEvent("oboon:detail-unit-type-results", {
          detail: {
            propertyId,
            unitTypeResults: null,
          },
        }),
      );
    };
  }, [
    isFullResultVisible,
    propertyId,
    response?.unit_type_results,
  ]);

  const handleSaveCondition = useCallback(async (): Promise<boolean> => {
    if (!isLoggedIn) {
      onLoginRequest();
      return false;
    }

    const validationError = validate();
    if (validationError) {
      setErrorMessage(validationError);
      return false;
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      onLoginRequest();
      return false;
    }

    setSaveLoading(true);
    setErrorMessage(null);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          cv_available_cash_manwon: currentConditionState.availableCashManwon,
          cv_monthly_income_manwon: currentConditionState.monthlyIncomeManwon,
          cv_monthly_expenses_manwon: currentConditionState.monthlyExpensesManwon,
          cv_employment_type: currentConditionState.employmentType,
          cv_house_ownership: currentConditionState.houseOwnership,
          cv_purchase_purpose_v2: currentConditionState.purchasePurposeV2,
          cv_purchase_timing: currentConditionState.purchaseTiming,
          cv_movein_timing: currentConditionState.moveinTiming,
          cv_ltv_internal_score: currentConditionState.ltvInternalScore,
          cv_existing_loan_amount: currentConditionState.existingLoan,
          cv_recent_delinquency: currentConditionState.recentDelinquency,
          cv_card_loan_usage: currentConditionState.cardLoanUsage,
          cv_loan_rejection: currentConditionState.loanRejection,
          cv_monthly_income_range: currentConditionState.monthlyIncomeRange,
          cv_existing_monthly_repayment:
            currentConditionState.existingMonthlyRepayment,
        })
        .eq("id", user.id);

      if (error) {
        setErrorMessage("조건 저장 중 오류가 발생했습니다.");
        return false;
      }

      setSavedConditionState(currentConditionState);
      toast.success(hasSavedConditionPreset ? "조건이 업데이트되었습니다." : "조건이 저장되었습니다.");
      return true;
    } catch {
      setErrorMessage("조건 저장 중 오류가 발생했습니다.");
      return false;
    } finally {
      setSaveLoading(false);
    }
  }, [
    currentConditionState,
    hasSavedConditionPreset,
    isLoggedIn,
    onLoginRequest,
    supabase,
    toast,
    validate,
  ]);

  const renderMetricsGrid = (sourceMetrics:
    | FullEvaluationResponse["metrics"]
    | GuestEvaluationResponse["metrics"]
    | undefined) => {
    if (!sourceMetrics) return null;

    const items = [
      { label: "계약금", value: formatManwonWithEok(sourceMetrics.contract_amount) },
      { label: "예상 대출", value: formatManwonWithEok(sourceMetrics.loan_amount) },
      { label: "월상환", value: formatManwonWithEok(sourceMetrics.monthly_payment_est) },
      {
        label: "월 부담률",
        value:
          sourceMetrics.monthly_burden_percent == null
            ? "계산 불가"
            : `${Math.round(sourceMetrics.monthly_burden_percent * 10) / 10}%`,
      },
    ];

    return (
      <div className="grid grid-cols-2 overflow-hidden rounded-2xl border border-(--oboon-border-default)">
        {items.map(({ label, value }, idx) => (
          <div
            key={label}
            className={`bg-(--oboon-bg-surface) px-3 py-2.5${
              idx % 2 === 0 ? " border-r border-(--oboon-border-default)" : ""
            }${idx < 2 ? " border-b border-(--oboon-border-default)" : ""}`}
          >
            <div className="ob-typo-caption text-(--oboon-text-muted)">{label}</div>
            <div className="mt-0.5 ob-typo-body2 font-semibold text-(--oboon-text-title)">
              {value}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderMatchCard = (params: {
    matchRate: number;
    grade: FinalGrade5;
    label: string;
    title?: string;
  }) => {
    const tone = getGrade5ToneMeta(params.grade);

    return (
      <div
        className="rounded-2xl border-2 bg-(--oboon-bg-surface) px-4 py-4 shadow-[0_0_0_1px_color-mix(in_srgb,var(--oboon-border-default)_35%,transparent)]"
        style={{ borderColor: tone.borderColor }}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="ob-typo-caption text-(--oboon-text-muted)">
              {params.title ?? "매칭률"}
            </div>
            <div className="mt-1 ob-typo-h2 font-bold leading-none text-(--oboon-text-title)">
              {params.matchRate}%
            </div>
          </div>
          <Badge
            className="shrink-0 bg-transparent"
            style={{ borderColor: tone.borderColor, color: tone.color }}
          >
            {params.label}
          </Badge>
        </div>
      </div>
    );
  };

  const renderUnitTypeSummary = (summary: UnitTypeSummary | null) => {
    if (!summary) {
      return (
        <div className="rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) px-4 py-4">
          <p className="ob-typo-body2 text-(--oboon-text-muted)">
            확인 가능한 타입 결과가 아직 없습니다.
          </p>
        </div>
      );
    }

    return (
      <div className="rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) px-4 py-4">
        <div className="ob-typo-caption font-semibold text-(--oboon-text-title)">
          {summary.title} {summary.count}개
        </div>
        {summary.leadTitle ? (
          <p className="mt-1 ob-typo-caption text-(--oboon-text-muted)">
            {summary.leadTitle}
          </p>
        ) : null}

        <div className="mt-3 space-y-2">
          {summary.units.map((unit) => {
            const tone = getGrade5ToneMeta(unit.finalGrade);
            return (
              <div
                key={unit.unitTypeId}
                className="rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle) px-3 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="ob-typo-body2 font-semibold text-(--oboon-text-title)">
                      {unit.title}
                    </div>
                    <div className="mt-1 ob-typo-caption text-(--oboon-text-muted)">
                      매칭률 {unit.totalScore == null ? "-" : `${Math.round(unit.totalScore)}%`}
                    </div>
                  </div>
                  <Badge
                    className="shrink-0 bg-transparent"
                    style={{ borderColor: tone.borderColor, color: tone.color }}
                  >
                    {unit.gradeLabel ?? tone.chipLabel}
                  </Badge>
                </div>
                <div className="mt-2 ob-typo-caption text-(--oboon-text-title)">
                  {unit.priceLabel} · 월 부담률{" "}
                  {unit.monthlyBurdenPercent == null
                    ? "계산 불가"
                    : `${Math.round(unit.monthlyBurdenPercent * 10) / 10}%`}
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-3 ob-typo-caption text-(--oboon-text-muted)">
          {summary.note}
        </p>
      </div>
    );
  };

  // ── Main render ───────────────────────────────────────────────────────────────
  return (
    <section className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <div className="mt-0.5 text-(--oboon-text-muted)">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="ob-typo-h3 text-(--oboon-text-title)">조건 검증</div>
            <p className="mt-0.5 ob-typo-caption text-(--oboon-text-muted)">
              {propertyName ? `${propertyName} 현장 기준` : "현장 기준"}으로 내 조건을 확인합니다.
            </p>
          </div>
        </div>
        {showModifyButton ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setErrorMessage(null);
              setIsInputSectionVisible(true);
            }}
          >
            수정
          </Button>
        ) : null}
      </div>

      {isInputSectionVisible ? (
        <Card className="p-3.5">
          {isLoggedIn && hasSavedConditionPreset && isConditionDirty ? (
            <div className="flex items-center justify-between gap-2 rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle) px-3 py-2">
              <p className="ob-typo-caption text-(--oboon-text-muted)">
                저장된 기본 조건과 다릅니다.
              </p>
              <button
                type="button"
                onClick={handleRestoreDefaultCondition}
                className="shrink-0 ob-typo-caption font-medium text-(--oboon-primary) underline underline-offset-4 hover:opacity-70"
              >
                기본 조건으로
              </button>
            </div>
          ) : null}
          <ConditionWizard
            condition={wizardCondition}
            isLoggedIn={isLoggedIn}
            hasSavedConditionPreset={hasSavedConditionPreset}
            isConditionDirty={isConditionDirty}
            onRestoreDefault={handleRestoreDefaultCondition}
            isLoading={isLoggedIn ? loading : guestLoading}
            isSaving={saveLoading}
            onChange={handleWizardChange}
            evaluateOnFinish
            finishLabel="평가하기"
            onSave={isLoggedIn ? handleSaveCondition : undefined}
            onEvaluate={() =>
              isLoggedIn ? handleEvaluate() : handleGuestEvaluate()
            }
            onLoginAndSave={async () => {
              onLoginRequest();
            }}
          />
        </Card>
      ) : null}

      {errorMessage ? (
        <div className="flex items-center gap-1.5 rounded-xl border border-(--oboon-danger-border) bg-(--oboon-danger-bg) px-3 py-2 text-(--oboon-danger-text)">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="ob-typo-caption">{errorMessage}</span>
        </div>
      ) : null}

      {isGuestResultVisible ? (
        <div className="space-y-3">
          {renderMatchCard({
            title: "간편 매칭률",
            matchRate: Math.round(
              ((guestResponse?.result?.total_score ?? 0) /
                (guestResponse?.result?.max_score ?? 1)) *
                100,
            ),
            grade: guestResponse?.result?.final_grade ?? "GREEN",
            label: guestResponse?.result?.grade_label ?? grade5DetailLabel("GREEN"),
          })}

          <div className="grid gap-3 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.95fr)]">
            <div className="space-y-3">
              <div className="grid gap-3">
                <h3 className="ob-typo-subtitle text-(--oboon-text-title)">카테고리별 상세 결과</h3>
                <div className="rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-3">
                  <ConditionValidationCategoryPanel items={guestCategoryItems} />
                </div>
              </div>

              <div className="grid gap-3">
                <h3 className="ob-typo-subtitle text-(--oboon-text-title)">핵심 수치</h3>
                {renderMetricsGrid(guestResponse?.metrics)}
              </div>
            </div>

            <div className="space-y-3 xl:sticky xl:top-24 xl:self-start">
              <div className="grid gap-3">
                <h3 className="ob-typo-subtitle text-(--oboon-text-title)">타입 결과 요약</h3>
                {renderUnitTypeSummary(guestUnitTypeSummary)}
              </div>

              <div className="rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle) px-3 py-3 text-center space-y-2">
                <p className="ob-typo-caption font-semibold text-(--oboon-text-title)">
                  로그인하면 더 정밀하게 검증할 수 있습니다
                </p>
                <p className="ob-typo-caption text-(--oboon-text-muted)">
                  직업·지출·신용 상세·분양·입주 시점까지 반영
                </p>
                <Button className="w-full" onClick={onLoginRequest}>
                  로그인 후 정밀 검증하기
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isFullResultVisible ? (
        <div className="space-y-3">
          {renderMatchCard({
            matchRate: Math.round(((result?.total_score ?? 0) / (result?.max_score ?? 1)) * 100),
            grade: result?.final_grade ?? "GREEN",
            label: result?.grade_label ?? grade5Meta(result?.final_grade ?? "GREEN").label,
          })}

          <div className="grid gap-3 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.95fr)]">
            <div className="space-y-3">
              <div className="grid gap-3">
                <h3 className="ob-typo-subtitle text-(--oboon-text-title)">카테고리별 상세 결과</h3>
                <div className="rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-3">
                  <ConditionValidationCategoryPanel items={fullCategoryItems} />
                </div>
              </div>

              <div className="grid gap-3">
                <h3 className="ob-typo-subtitle text-(--oboon-text-title)">핵심 수치</h3>
                {renderMetricsGrid(metrics)}
              </div>
            </div>

            <div className="space-y-3 xl:sticky xl:top-24 xl:self-start">
              <div className="grid gap-3">
                <h3 className="ob-typo-subtitle text-(--oboon-text-title)">타입 결과 요약</h3>
                {renderUnitTypeSummary(fullUnitTypeSummary)}
              </div>

              {shouldShowAlternativeButton ? (
                <div className="rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle) px-3 py-3 space-y-2">
                  <div className="ob-typo-caption font-semibold text-(--oboon-text-title)">
                    다음 액션
                  </div>
                  <p className="ob-typo-caption text-(--oboon-text-muted)">
                    현재 조건에서 더 잘 맞는 현장이 있는지 바로 비교해볼 수 있습니다.
                  </p>
                  <Button
                    className="w-full"
                    variant="secondary"
                    loading={recommendLoading}
                    onClick={() => void handleAlternativeRecommend()}
                  >
                    대안 현장 추천 보기
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <p className="ob-typo-caption text-(--oboon-text-muted)">
        * 본 검증은 참고용이며 실제 계약 가능 여부는 현장 상담을 통해 확인하세요.
      </p>
    </section>
  );
}
