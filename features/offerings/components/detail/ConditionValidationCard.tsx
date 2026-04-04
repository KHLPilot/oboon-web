"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import ConditionWizard from "@/features/recommendations/components/ConditionWizard";
import { shouldAutoEvaluateDetailValidation } from "@/features/offerings/components/detail/conditionValidationAutoEvaluate";
import { grade5DetailLabel } from "@/features/condition-validation/lib/grade5Labels";
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
  UnitTypeResultItem,
} from "@/features/condition-validation/domain/types";
import type { ParsedCustomerInput } from "@/features/condition-validation/domain/validation";
import { formatManwonWithEok } from "@/lib/format/currency";
import type { RecommendationCondition } from "@/features/recommendations/hooks/useRecommendations";
import { createSupabaseClient } from "@/lib/supabaseClient";

// ─── Types ────────────────────────────────────────────────────────────────────

type Grade5Meta = {
  color: string;
  bgColor: string;
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
        bgColor: "var(--oboon-grade-green-bg)",
        borderColor: "var(--oboon-grade-green-border)",
        label: grade5DetailLabel(grade),
      };
    case "LIME":
      return {
        color: "var(--oboon-grade-lime)",
        bgColor: "var(--oboon-grade-lime-bg)",
        borderColor: "var(--oboon-grade-lime-border)",
        label: grade5DetailLabel(grade),
      };
    case "YELLOW":
      return {
        color: "var(--oboon-grade-yellow)",
        bgColor: "var(--oboon-grade-yellow-bg)",
        borderColor: "var(--oboon-grade-yellow-border)",
        label: grade5DetailLabel(grade),
      };
    case "ORANGE":
      return {
        color: "var(--oboon-grade-orange)",
        bgColor: "var(--oboon-grade-orange-bg)",
        borderColor: "var(--oboon-grade-orange-border)",
        label: grade5DetailLabel(grade),
      };
    case "RED":
      return {
        color: "var(--oboon-grade-red)",
        bgColor: "var(--oboon-grade-red-bg)",
        borderColor: "var(--oboon-grade-red-border)",
        label: grade5DetailLabel(grade),
      };
  }
}

// ─── Input helpers ─────────────────────────────────────────────────────────────

function parseNullableNumericInput(value: string): number | null {
  const normalized = value.replaceAll(",", "").trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

function formatAreaLabel(area: number | null) {
  if (area === null) return null;
  return `${area.toLocaleString("ko-KR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}㎡`;
}

function formatUnitTypeTitle(item: UnitTypeResultItem) {
  const rawName = item.unit_type_name?.trim();
  if (rawName) {
    if (
      rawName.includes("타입") ||
      rawName.includes("㎡") ||
      /[A-Za-z]$/.test(rawName)
    ) {
      return rawName;
    }
    return `${rawName}타입`;
  }

  const areaLabel = formatAreaLabel(item.exclusive_area);
  if (areaLabel) {
    return `전용 ${areaLabel}`;
  }

  return `타입 ${item.unit_type_id}`;
}

function getUnitTypeStatusMeta(item: UnitTypeResultItem) {
  const label = item.grade_label?.trim() || grade5DetailLabel(item.final_grade);
  switch (item.final_grade) {
    case "GREEN":
      return { key: "green" as const, label };
    case "LIME":
      return { key: "lime" as const, label };
    case "YELLOW":
      return { key: "yellow" as const, label };
    case "ORANGE":
      return { key: "orange" as const, label };
    case "RED":
      return { key: "red" as const, label };
  }
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
      (profileAutoFill.existingMonthlyRepayment &&
        profileAutoFill.existingMonthlyRepayment !== "none"),
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
  hasBookableAgent: boolean;
  isBookingBlockedRole: boolean;
  onConsultationRequest: () => void;
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
  hasBookableAgent,
  isBookingBlockedRole,
  onConsultationRequest,
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
  const [guestCreditGrade, setGuestCreditGrade] = useState<CreditGrade>("good");

  const [ltvInternalScore, setLtvInternalScore] = useState<number | null>(null);
  const [existingLoan, setExistingLoan] = useState<ExistingLoanAmount | null>(null);
  const [recentDelinquency, setRecentDelinquency] = useState<DelinquencyCount | null>(null);
  const [cardLoanUsage, setCardLoanUsage] = useState<CardLoanUsage | null>(null);
  const [loanRejection, setLoanRejection] = useState<LoanRejection | null>(null);
  const [monthlyIncomeRange, setMonthlyIncomeRange] = useState<MonthlyIncomeRange | null>(null);
  const [existingMonthlyRepayment, setExistingMonthlyRepayment] =
    useState<MonthlyLoanRepayment>("none");

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
  const [showResultDetails, setShowResultDetails] = useState(false);
  const [showUnitTypeDetails, setShowUnitTypeDetails] = useState(false);
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [openUnitTypeGroup, setOpenUnitTypeGroup] = useState<string | null>(null);
  const [openUnitType, setOpenUnitType] = useState<string | null>(null);
  const autoEvaluatedRef = useRef(false);
  const evaluateInFlightRef = useRef(false);

  // Derived
  const result = response?.ok ? response.result : undefined;
  const categories = response?.ok ? response.categories : undefined;
  const metrics = response?.ok ? response.metrics : undefined;
  const showModifyButton = !isInputSectionVisible;

  const applySessionCondition = useCallback((snapshot: ConditionSessionSnapshot) => {
    if (snapshot.employmentType) setEmploymentType(snapshot.employmentType);
    if (snapshot.availableCash) setAvailableCash(snapshot.availableCash);
    if (snapshot.monthlyIncome) setMonthlyIncome(snapshot.monthlyIncome);
    if (snapshot.monthlyExpenses) setMonthlyExpenses(snapshot.monthlyExpenses);
    if (snapshot.houseOwnership) setHouseOwnership(snapshot.houseOwnership);
    if (snapshot.purchasePurposeV2) setPurchasePurpose(snapshot.purchasePurposeV2);
    if (snapshot.purchaseTiming) setPurchaseTiming(snapshot.purchaseTiming);
    if (snapshot.moveinTiming) setMoveinTiming(snapshot.moveinTiming);
    if (snapshot.existingLoan) setExistingLoan(snapshot.existingLoan);
    if (snapshot.recentDelinquency) setRecentDelinquency(snapshot.recentDelinquency);
    if (snapshot.cardLoanUsage) setCardLoanUsage(snapshot.cardLoanUsage);
    if (snapshot.loanRejection) setLoanRejection(snapshot.loanRejection);
    if (snapshot.monthlyIncomeRange) setMonthlyIncomeRange(snapshot.monthlyIncomeRange);
    setExistingMonthlyRepayment(snapshot.existingMonthlyRepayment);
    if (snapshot.ltvInternalScore > 0) {
      setLtvInternalScore(snapshot.ltvInternalScore);
    }
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
    return null;
  }, [
    availableCash,
    employmentType,
    houseOwnership,
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
        setShowResultDetails(false);
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
      existing_monthly_repayment: existingMonthlyRepayment,
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
    if (hasStoredProfileAutoFill(profileAutoFill)) return;

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
      existing_monthly_repayment:
        sessionSnapshot.existingMonthlyRepayment ?? "none",
    });
  }, [applySessionCondition, evaluateWithValues, isLoggedIn, profileAutoFill, propertyId]);

  const handleConsultAction = () => {
    if (!isLoggedIn) {
      onLoginRequest();
      return;
    }
    if (isBookingBlockedRole || !hasBookableAgent) return;
    onConsultationRequest();
  };

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

  const consultButtonLabel = !isLoggedIn
    ? "로그인 후 상담 연결"
    : isBookingBlockedRole
      ? "일반 회원만 이용 가능"
      : !hasBookableAgent
        ? "상담 가능 상담사 없음"
        : "이 조건으로 상담 예약";

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
    if (patch.ltvInternalScore !== undefined) setLtvInternalScore(patch.ltvInternalScore);
    if (patch.existingLoan !== undefined) setExistingLoan(patch.existingLoan);
    if (patch.recentDelinquency !== undefined) setRecentDelinquency(patch.recentDelinquency);
    if (patch.cardLoanUsage !== undefined) setCardLoanUsage(patch.cardLoanUsage);
    if (patch.loanRejection !== undefined) setLoanRejection(patch.loanRejection);
    if (patch.monthlyIncomeRange !== undefined) setMonthlyIncomeRange(patch.monthlyIncomeRange);
    if (patch.existingMonthlyRepayment !== undefined) {
      setExistingMonthlyRepayment(patch.existingMonthlyRepayment);
    }
  };

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

  const renderUnitTypeResults = (
    items: UnitTypeResultItem[],
    prefix: "guest" | "full",
  ) => {
    const groupedItems = [
      {
        key: "green" as const,
        label: grade5DetailLabel("GREEN"),
        items: items.filter((item) => getUnitTypeStatusMeta(item).key === "green"),
      },
      {
        key: "lime" as const,
        label: grade5DetailLabel("LIME"),
        items: items.filter((item) => getUnitTypeStatusMeta(item).key === "lime"),
      },
      {
        key: "yellow" as const,
        label: grade5DetailLabel("YELLOW"),
        items: items.filter((item) => getUnitTypeStatusMeta(item).key === "yellow"),
      },
      {
        key: "orange" as const,
        label: grade5DetailLabel("ORANGE"),
        items: items.filter((item) => getUnitTypeStatusMeta(item).key === "orange"),
      },
      {
        key: "red" as const,
        label: grade5DetailLabel("RED"),
        items: items.filter((item) => getUnitTypeStatusMeta(item).key === "red"),
      },
    ].filter((group) => group.items.length > 0);

    return (
      <div className="max-h-[min(34vh,18rem)] overflow-y-auto overscroll-contain rounded-lg border border-(--oboon-border-default)">
        {groupedItems.map((group, groupIdx, groups) => (
          <div
            key={`${prefix}-${group.key}`}
            className={groupIdx < groups.length - 1 ? "border-b border-(--oboon-border-default)" : ""}
          >
            {(() => {
              const groupKey = `${prefix}-${group.key}`;
              const isGroupOpen = openUnitTypeGroup === groupKey;
              return (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setOpenUnitTypeGroup(isGroupOpen ? null : groupKey);
                      if (isGroupOpen) {
                        setOpenUnitType((current) =>
                          current?.startsWith(`${prefix}-`) ? null : current,
                        );
                      }
                    }}
                    className="flex w-full items-center justify-between gap-3 bg-(--oboon-bg-subtle) px-3 py-1.5"
                  >
                    <span className="ob-typo-caption font-semibold text-(--oboon-text-title)">
                      {group.label}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="ob-typo-caption text-(--oboon-text-muted)">
                        {group.items.length}개
                      </span>
                      {isGroupOpen ? (
                        <ChevronUp className="h-3.5 w-3.5 text-(--oboon-text-muted)" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5 text-(--oboon-text-muted)" />
                      )}
                    </div>
                  </button>
                  {isGroupOpen
                    ? group.items.map((item, idx, arr) => {
              const meta = grade5Meta(item.final_grade);
              const { label: unitLabel } = getUnitTypeStatusMeta(item);
              const unitKey = `${prefix}-${item.unit_type_id}`;
              const isOpen = openUnitType === unitKey;
              return (
                <div
                  key={unitKey}
                  className={idx < arr.length - 1 ? "border-b border-(--oboon-border-default)" : ""}
                >
                  <button
                    type="button"
                    onClick={() => setOpenUnitType(isOpen ? null : unitKey)}
                    className="flex w-full items-center justify-between gap-2 px-3 py-2"
                    style={{ backgroundColor: meta.bgColor }}
                  >
                    <span className="ob-typo-caption font-medium text-(--oboon-text-title) text-left">
                      {formatUnitTypeTitle(item)}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className="ob-typo-caption font-semibold"
                        style={{ color: meta.color }}
                      >
                        ● {unitLabel}
                      </span>
                      {isOpen ? (
                        <ChevronUp className="h-3 w-3 text-(--oboon-text-muted)" />
                      ) : (
                        <ChevronDown className="h-3 w-3 text-(--oboon-text-muted)" />
                      )}
                    </div>
                  </button>
                  {isOpen ? (
                    <div
                      className="space-y-1.5 px-3 pb-2 ob-typo-caption text-(--oboon-text-muted)"
                      style={{ backgroundColor: meta.bgColor }}
                    >
                      {item.exclusive_area !== null ? (
                        <div className="flex items-center justify-between gap-3">
                          <span>전용면적</span>
                          <span className="font-semibold text-(--oboon-text-title)">
                            {formatAreaLabel(item.exclusive_area)}
                          </span>
                        </div>
                      ) : null}
                      <div className="flex items-center justify-between gap-3">
                        <span>분양가</span>
                        <span className="font-semibold text-(--oboon-text-title)">
                          {formatManwonWithEok(item.list_price_manwon)}
                        </span>
                      </div>
                      {item.summary_message ? (
                        <p>{item.summary_message}</p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
                    })
                    : null}
                </>
              );
            })()}
          </div>
        ))}
      </div>
    );
  };

  // ── Main render ───────────────────────────────────────────────────────────────
  return (
    <Card className="p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="ob-typo-h3 text-(--oboon-text-title)">조건 검증</div>
          <p className="mt-0.5 ob-typo-caption text-(--oboon-text-muted)">
            {propertyName ? `${propertyName} 현장 기준` : "현장 기준"}으로 내 조건을 확인합니다.
          </p>
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

      {/* Input Section */}
      {isInputSectionVisible ? (
        <div className="mt-2.5 space-y-2.5">
          <ConditionWizard
            condition={wizardCondition}
            isLoggedIn={isLoggedIn}
            hasSavedConditionPreset={hasSavedConditionPreset}
            isConditionDirty={isConditionDirty}
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
        </div>
      ) : null}

      {/* Guest Result */}
      {guestResponse?.ok && guestResponse.result && !isInputSectionVisible && !isLoggedIn ? (
        <div className="mt-2.5 space-y-2">
          {/* Grade summary */}
          {(() => {
            const meta = grade5Meta(guestResponse.result.final_grade);
            const matchRate = Math.round(
              (guestResponse.result.total_score / guestResponse.result.max_score) * 100,
            );
            return (
              <div
                className="rounded-xl border px-3 py-3 flex items-center justify-between gap-3"
                style={{ borderColor: meta.borderColor, backgroundColor: meta.bgColor }}
              >
                <div>
                  <div className="ob-typo-caption text-(--oboon-text-muted)">간편 매칭률</div>
                  <div className="mt-0.5 ob-typo-h2 font-bold text-(--oboon-text-title) leading-none">
                    {matchRate}%
                  </div>
                </div>
                <div
                  className="rounded-full px-3 py-1 ob-typo-caption font-semibold text-(--oboon-text-title) shrink-0"
                  style={{ backgroundColor: meta.color }}
                >
                  {guestResponse.result.grade_label}
                </div>
              </div>
            );
          })()}

          {/* Category breakdown */}
          {guestResponse.categories ? (
            <div className="rounded-lg border border-(--oboon-border-default) overflow-hidden">
              {(
                [
                  { key: "cash" as const, label: "자금력" },
                  { key: "income" as const, label: "소득/부담" },
                  { key: "credit" as const, label: "신용" },
                  { key: "ownership" as const, label: "주택 보유" },
                  { key: "purpose" as const, label: "구매 목적" },
                ] as const
              ).map(({ key, label }, idx, arr) => {
                const cat = guestResponse.categories![key];
                const meta = grade5Meta(cat.grade);
                const catKey = `guest-${key}`;
                const isOpen = openCategory === catKey;
                return (
                  <div
                    key={key}
                    className={idx < arr.length - 1 ? "border-b border-(--oboon-border-default)" : ""}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenCategory(isOpen ? null : catKey)}
                      className="flex w-full items-center justify-between gap-2 px-3 py-2"
                      style={{ backgroundColor: meta.bgColor }}
                    >
                      <span className="ob-typo-caption font-medium text-(--oboon-text-title) shrink-0">
                        {label}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="ob-typo-caption font-semibold text-(--oboon-text-title)">
                          {grade5DetailLabel(cat.grade)}
                        </span>
                        {isOpen ? (
                          <ChevronUp className="h-3 w-3 text-(--oboon-text-muted)" />
                        ) : (
                          <ChevronDown className="h-3 w-3 text-(--oboon-text-muted)" />
                        )}
                      </div>
                    </button>
                    {isOpen ? (
                      <div
                        className="px-3 pb-2 ob-typo-caption text-(--oboon-text-muted)"
                        style={{ backgroundColor: meta.bgColor }}
                      >
                        {cat.reason}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : null}

          {/* Unit type results */}
          {guestResponse.unit_type_results && guestResponse.unit_type_results.length > 0 ? (
            <>
              <button
                type="button"
                onClick={() => setShowUnitTypeDetails((prev) => !prev)}
                className="flex w-full items-center justify-between rounded-lg border border-(--oboon-border-default) bg-(--oboon-bg-subtle) px-3 py-1.5 ob-typo-caption text-(--oboon-text-muted) hover:border-(--oboon-border-hover) transition-colors"
              >
                <span>타입별 확인</span>
                {showUnitTypeDetails ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </button>
              {showUnitTypeDetails
                ? renderUnitTypeResults(guestResponse.unit_type_results, "guest")
                : null}
            </>
          ) : null}

          {/* Login CTA */}
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
      ) : null}

      {/* Error */}
      {errorMessage ? (
        <div className="mt-2.5 flex items-center gap-1.5 rounded-xl border border-(--oboon-danger-border) bg-(--oboon-danger-bg) px-3 py-2 text-(--oboon-danger-text)">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="ob-typo-caption">{errorMessage}</span>
        </div>
      ) : null}

      {/* Result */}
      {result && !isInputSectionVisible ? (
        <div className="mt-2.5 space-y-2">
          {/* Grade summary */}
          {(() => {
            const meta = grade5Meta(result.final_grade);
            const matchRate = Math.round((result.total_score / result.max_score) * 100);
            return (
              <div
                className="rounded-xl border px-3 py-3 flex items-center justify-between gap-3"
                style={{ borderColor: meta.borderColor, backgroundColor: meta.bgColor }}
              >
                <div>
                  <div className="ob-typo-caption text-(--oboon-text-muted)">매칭률</div>
                  <div className="mt-0.5 ob-typo-h2 font-bold text-(--oboon-text-title) leading-none">
                    {matchRate}%
                  </div>
                </div>
                <div
                  className="rounded-full px-3 py-1 ob-typo-caption font-semibold text-(--oboon-text-title) shrink-0"
                  style={{ backgroundColor: meta.color }}
                >
                  {result.grade_label ?? meta.label}
                </div>
              </div>
            );
          })()}

          {/* Category detail toggle */}
          {categories ? (
            <button
              type="button"
              onClick={() => setShowResultDetails((prev) => !prev)}
              className="flex w-full items-center justify-between rounded-lg border border-(--oboon-border-default) bg-(--oboon-bg-subtle) px-3 py-1.5 ob-typo-caption text-(--oboon-text-muted) hover:border-(--oboon-border-hover) transition-colors"
            >
              <span>카테고리별 상세 결과</span>
              {showResultDetails ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </button>
          ) : null}

          {/* Category breakdown */}
          {showResultDetails && categories ? (
            <div className="rounded-lg border border-(--oboon-border-default) overflow-hidden">
              {(
                [
                  { key: "cash" as const, label: "자금력" },
                  { key: "income" as const, label: "소득" },
                  { key: "ltv_dsr" as const, label: "LTV+DSR" },
                  { key: "ownership" as const, label: "주택 보유" },
                  { key: "purpose" as const, label: "구매 목적" },
                ] as const
              ).map(({ key, label }, idx, arr) => {
                const cat = categories[key];
                const meta = grade5Meta(cat.grade);
                const catKey = `full-${key}`;
                const isOpen = openCategory === catKey;
                return (
                  <div
                    key={key}
                    className={idx < arr.length - 1 ? "border-b border-(--oboon-border-default)" : ""}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenCategory(isOpen ? null : catKey)}
                      className="flex w-full items-center justify-between gap-2 px-3 py-2"
                      style={{ backgroundColor: meta.bgColor }}
                    >
                      <span className="ob-typo-caption font-medium text-(--oboon-text-title) shrink-0">{label}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="ob-typo-caption font-semibold text-(--oboon-text-title)">
                          {grade5DetailLabel(cat.grade)}
                        </span>
                        {isOpen ? (
                          <ChevronUp className="h-3 w-3 text-(--oboon-text-muted)" />
                        ) : (
                          <ChevronDown className="h-3 w-3 text-(--oboon-text-muted)" />
                        )}
                      </div>
                    </button>
                    {isOpen ? (
                      <div
                        className="px-3 pb-2 ob-typo-caption text-(--oboon-text-muted)"
                        style={{ backgroundColor: meta.bgColor }}
                      >
                        {cat.reason}
                      </div>
                    ) : null}
                  </div>
                );
              })}

              {/* Metrics */}
              {metrics ? (
                <div className="grid grid-cols-2 border-t border-(--oboon-border-default)">
                  {[
                    { label: "계약금", value: formatManwonWithEok(metrics.contract_amount) },
                    { label: "예상 대출", value: formatManwonWithEok(metrics.loan_amount) },
                    { label: "월상환", value: formatManwonWithEok(metrics.monthly_payment_est) },
                    { label: "월 잉여", value: formatManwonWithEok(metrics.monthly_surplus) },
                  ].map(({ label, value }, idx) => (
                    <div
                      key={label}
                      className={`px-3 py-2${idx % 2 === 0 ? " border-r border-(--oboon-border-default)" : ""}${idx < 2 ? " border-b border-(--oboon-border-default)" : ""}`}
                    >
                      <div className="ob-typo-caption text-(--oboon-text-muted)">{label}</div>
                      <div className="mt-0.5 ob-typo-caption font-semibold text-(--oboon-text-title)">{value}</div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          {/* Unit type results */}
          {response?.unit_type_results && response.unit_type_results.length > 0 ? (
            <>
              <button
                type="button"
                onClick={() => setShowUnitTypeDetails((prev) => !prev)}
                className="flex w-full items-center justify-between rounded-lg border border-(--oboon-border-default) bg-(--oboon-bg-subtle) px-3 py-1.5 ob-typo-caption text-(--oboon-text-muted) hover:border-(--oboon-border-hover) transition-colors"
              >
                <span>타입별 확인</span>
                {showUnitTypeDetails ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </button>
              {showUnitTypeDetails
                ? renderUnitTypeResults(response.unit_type_results, "full")
                : null}
            </>
          ) : null}

          {/* Alternative recommend button */}
          {shouldShowAlternativeButton ? (
            <Button
              className="w-full"
              variant="secondary"
              loading={recommendLoading}
              onClick={() => void handleAlternativeRecommend()}
            >
              대안 현장 추천 보기
            </Button>
          ) : null}

          {/* Consult button */}
          <Button
            className="w-full"
            variant={result.final_grade === "RED" ? "warning" : "primary"}
            disabled={isBookingBlockedRole || !hasBookableAgent}
            onClick={handleConsultAction}
          >
            {consultButtonLabel}
          </Button>

          {isBookingBlockedRole ? (
            <p className="ob-typo-caption text-(--oboon-text-muted)">
              관리자/상담사 계정은 상담 예약을 진행할 수 없습니다.
            </p>
          ) : !hasBookableAgent ? (
            <p className="ob-typo-caption text-(--oboon-text-muted)">
              현재 이 현장에는 예약 가능한 상담사가 없습니다.
            </p>
          ) : null}
        </div>
      ) : null}

      <p className="mt-2 ob-typo-caption text-(--oboon-text-muted)">
        * 본 검증은 참고용이며 실제 계약 가능 여부는 현장 상담을 통해 확인하세요.
      </p>
    </Card>
  );
}
