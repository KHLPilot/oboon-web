"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, Lock } from "lucide-react";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import LtvDsrModal from "@/features/condition-validation/components/LtvDsrModal";
import { grade5DetailLabel } from "@/features/condition-validation/lib/grade5Labels";
import {
  loadConditionSession,
  saveConditionSession,
  type ConditionSessionSnapshot,
} from "@/features/condition-validation/lib/sessionCondition";
import { ltvScoreToPoints } from "@/features/condition-validation/domain/ltvDsrCalculator";
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
import { formatManwonPreview, formatManwonWithEok } from "@/lib/format/currency";

// ─── Types ────────────────────────────────────────────────────────────────────

type Grade5Meta = {
  color: string;
  bgColor: string;
  borderColor: string;
  label: string;
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

function formatNumericInput(value: string): string {
  const digitsOnly = value.replace(/[^\d]/g, "");
  if (!digitsOnly) return "";
  return Number(digitsOnly).toLocaleString("ko-KR");
}

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

const EMPLOYMENT_OPTIONS: { value: EmploymentType; label: string }[] = [
  { value: "employee", label: "직장인" },
  { value: "self_employed", label: "자영업" },
  { value: "freelancer", label: "프리랜서" },
  { value: "other", label: "기타" },
];

const OWNERSHIP_OPTIONS: { value: "none" | "one" | "two_or_more"; label: string }[] = [
  { value: "none", label: "무주택" },
  { value: "one", label: "1주택" },
  { value: "two_or_more", label: "2주택 이상" },
];

const PURPOSE_OPTIONS: { value: FullPurchasePurpose; label: string }[] = [
  { value: "residence", label: "실거주" },
  { value: "long_term", label: "장기보유" },
  { value: "investment_rent", label: "투자(임대)" },
  { value: "investment_capital", label: "투자(시세)" },
];

const PURCHASE_TIMING_OPTIONS: { value: PurchaseTiming; label: string }[] = [
  { value: "within_3months", label: "3개월 이내" },
  { value: "within_6months", label: "6개월 이내" },
  { value: "within_1year", label: "1년 이내" },
  { value: "over_1year", label: "1년 이후" },
  { value: "by_property", label: "현장에 따라" },
];

const MOVEIN_TIMING_OPTIONS: { value: MoveinTiming; label: string }[] = [
  { value: "immediate", label: "즉시" },
  { value: "within_1year", label: "1년 이내" },
  { value: "within_2years", label: "2년 이내" },
  { value: "within_3years", label: "3년 이내" },
  { value: "anytime", label: "상관없음" },
];

const CREDIT_GRADE_OPTIONS: { value: CreditGrade; label: string }[] = [
  { value: "good", label: "양호" },
  { value: "normal", label: "보통" },
  { value: "unstable", label: "불안정" },
];

const LTV_STATUS_LABELS: Record<string, string> = {
  not_set: "미설정 (클릭하여 평가)",
};

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
  // Form state
  const [employmentType, setEmploymentType] = useState<EmploymentType>("employee");
  const [availableCash, setAvailableCash] = useState("");
  const [monthlyIncome, setMonthlyIncome] = useState("");
  const [monthlyExpenses, setMonthlyExpenses] = useState("");
  const [houseOwnership, setHouseOwnership] = useState<"none" | "one" | "two_or_more">("none");
  const [purchasePurpose, setPurchasePurpose] = useState<FullPurchasePurpose>("residence");
  const [purchaseTiming, setPurchaseTiming] = useState<PurchaseTiming>("by_property");
  const [moveinTiming, setMoveinTiming] = useState<MoveinTiming>("anytime");

  // 비로그인 전용 간이 신용 상태 (로그인 시 LTV/DSR로 대체)
  const [guestCreditGrade, setGuestCreditGrade] = useState<CreditGrade>("good");

  // LTV/DSR state from modal
  const [ltvInternalScore, setLtvInternalScore] = useState<number | null>(null);
  const [ltvPoints, setLtvPoints] = useState<number | null>(null);
  const [existingLoan, setExistingLoan] = useState<ExistingLoanAmount | null>(null);
  const [recentDelinquency, setRecentDelinquency] = useState<DelinquencyCount | null>(null);
  const [cardLoanUsage, setCardLoanUsage] = useState<CardLoanUsage | null>(null);
  const [loanRejection, setLoanRejection] = useState<LoanRejection | null>(null);
  const [monthlyIncomeRange, setMonthlyIncomeRange] = useState<MonthlyIncomeRange | null>(null);
  const [existingMonthlyRepayment, setExistingMonthlyRepayment] =
    useState<MonthlyLoanRepayment>("none");
  const [ltvModalOpen, setLtvModalOpen] = useState(false);

  // 비로그인 간편 검증 결과
  const [guestResponse, setGuestResponse] = useState<GuestEvaluationResponse | null>(null);
  const [guestLoading, setGuestLoading] = useState(false);

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

  // Derived
  const result = response?.ok ? response.result : undefined;
  const categories = response?.ok ? response.categories : undefined;
  const metrics = response?.ok ? response.metrics : undefined;
  const showModifyButton = !isInputSectionVisible;

  const availableCashNum = parseNullableNumericInput(availableCash);
  const monthlyIncomeNum = parseNullableNumericInput(monthlyIncome);
  const availableCashPreview = availableCashNum !== null ? formatManwonPreview(availableCashNum) : "";
  const monthlyIncomePreview = monthlyIncomeNum !== null ? formatManwonPreview(monthlyIncomeNum) : "";

  const ltvStatusLabel =
    ltvInternalScore !== null && ltvPoints !== null
      ? `LTV 점수 ${ltvInternalScore}점 → ${ltvPoints}/10pt`
      : LTV_STATUS_LABELS.not_set;

  const ltvStatusColor =
    ltvInternalScore !== null && ltvPoints !== null
      ? ltvPoints >= 8
        ? "text-(--oboon-safe)"
        : ltvPoints >= 5
          ? "text-(--oboon-warning)"
          : "text-(--oboon-danger)"
      : "text-(--oboon-text-muted)";

  // Estimate loan payment for LTV modal preview
  // Using a rough 0.5% monthly payment estimate, no property price available on client
  const estimatedNewLoanPaymentManwon = 0;

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
      const { points } = ltvScoreToPoints(snapshot.ltvInternalScore);
      setLtvInternalScore(snapshot.ltvInternalScore);
      setLtvPoints(points);
    }
  }, []);

  const validate = (): string | null => {
    if (!propertyId) return "현장 정보를 찾을 수 없습니다.";
    const cash = parseNullableNumericInput(availableCash);
    if (cash === null) return "가용 현금을 올바르게 입력해주세요.";
    const income = parseNullableNumericInput(monthlyIncome);
    if (income === null) return "월 세후 소득을 올바르게 입력해주세요.";
    const expenses = parseNullableNumericInput(monthlyExpenses);
    if (expenses === null) return "월 고정 지출을 올바르게 입력해주세요.";
    if (ltvInternalScore === null) return "신용 상태(LTV+DSR) 평가를 완료해주세요.";
    return null;
  };

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
        setLoading(false);
      }
    },
    [propertyId, onLoginRequest],
  );

  const handleEvaluate = async () => {
    setErrorMessage(null);
    const validationError = validate();
    if (validationError) {
      setErrorMessage(validationError);
      return;
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
      employment_type: employmentType,
      available_cash: parseNullableNumericInput(availableCash) ?? 0,
      monthly_income: parseNullableNumericInput(monthlyIncome) ?? 0,
      monthly_expenses: parseNullableNumericInput(monthlyExpenses) ?? 0,
      house_ownership: houseOwnership,
      purchase_purpose: purchasePurpose,
      purchase_timing: purchaseTiming,
      movein_timing: moveinTiming,
      ltv_internal_score: ltvInternalScore ?? 0,
      existing_monthly_repayment: existingMonthlyRepayment,
    });
  };

  const handleGuestEvaluate = async () => {
    setErrorMessage(null);
    if (!propertyId) {
      setErrorMessage("현장 정보를 찾을 수 없습니다.");
      return;
    }
    const cash = parseNullableNumericInput(availableCash);
    if (cash === null) {
      setErrorMessage("가용 현금을 올바르게 입력해주세요.");
      return;
    }
    const income = parseNullableNumericInput(monthlyIncome);
    if (income === null) {
      setErrorMessage("월 세후 소득을 올바르게 입력해주세요.");
      return;
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
        return;
      }

      setGuestResponse(data);
      setIsInputSectionVisible(false);
    } catch {
      setErrorMessage("조건 검증 처리 중 네트워크 오류가 발생했습니다.");
    } finally {
      setGuestLoading(false);
    }
  };

  // ── 프로필/세션 자동 채움 ──────────────────────────────────────────────────
  useEffect(() => {
    autoEvaluatedRef.current = false;
  }, [propertyId]);

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
      const { points } = ltvScoreToPoints(profileAutoFill.ltvInternalScore);
      setLtvInternalScore(profileAutoFill.ltvInternalScore);
      setLtvPoints(points);
    }

    if (!isLoggedIn || autoEvaluatedRef.current) return;

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

    if (!isLoggedIn || autoEvaluatedRef.current) return;

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
          {isLoggedIn ? (
            <>
              {/* Employment type / Available cash */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="min-w-0">
                  <div className="mb-1 ob-typo-caption text-(--oboon-text-muted)">직업 형태</div>
                  <Select<EmploymentType>
                    value={employmentType}
                    onChange={setEmploymentType}
                    options={EMPLOYMENT_OPTIONS}
                  />
                </div>
                <div className="min-w-0">
                  <label className="mb-1 block ob-typo-caption text-(--oboon-text-muted)">
                    가용 현금 (만원)
                  </label>
                  <div className="relative">
                    <Input
                      value={availableCash}
                      onChange={(e) => setAvailableCash(formatNumericInput(e.target.value))}
                      inputMode="numeric"
                      placeholder="예: 5,000"
                      className={availableCashPreview ? "pr-16" : undefined}
                    />
                    {availableCashPreview ? (
                      <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center ob-typo-caption text-(--oboon-text-muted) truncate max-w-[56px]">
                        {availableCashPreview}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Monthly income / Monthly expenses */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="min-w-0">
                  <label className="mb-1 block ob-typo-caption text-(--oboon-text-muted)">
                    월 소득 (만원)
                  </label>
                  <div className="relative">
                    <Input
                      value={monthlyIncome}
                      onChange={(e) => setMonthlyIncome(formatNumericInput(e.target.value))}
                      inputMode="numeric"
                      placeholder="예: 400"
                      className={monthlyIncomePreview ? "pr-16" : undefined}
                    />
                    {monthlyIncomePreview ? (
                      <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center ob-typo-caption text-(--oboon-text-muted) truncate max-w-[56px]">
                        {monthlyIncomePreview}
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className="min-w-0">
                  <label className="mb-1 block ob-typo-caption text-(--oboon-text-muted)">
                    월 지출 (만원)
                  </label>
                  <Input
                    value={monthlyExpenses}
                    onChange={(e) => setMonthlyExpenses(formatNumericInput(e.target.value))}
                    inputMode="numeric"
                    placeholder="예: 150"
                  />
                </div>
              </div>

              {/* LTV/DSR button */}
              <div>
                <div className="mb-1 ob-typo-caption text-(--oboon-text-muted)">신용 상태 (LTV+DSR)</div>
                <button
                  type="button"
                  onClick={() => setLtvModalOpen(true)}
                  className="w-full rounded-lg border border-(--oboon-border-default) bg-(--oboon-bg-surface) px-3 py-2 text-left transition-colors hover:border-(--oboon-border-hover)"
                >
                  <span className={["ob-typo-caption", ltvStatusColor].join(" ")}>
                    {ltvStatusLabel}
                  </span>
                </button>
              </div>

              {/* House ownership / Purchase purpose */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <div className="mb-1 ob-typo-caption text-(--oboon-text-muted)">주택 보유</div>
                  <Select<"none" | "one" | "two_or_more">
                    value={houseOwnership}
                    onChange={setHouseOwnership}
                    options={OWNERSHIP_OPTIONS}
                  />
                </div>
                <div>
                  <div className="mb-1 ob-typo-caption text-(--oboon-text-muted)">구매 목적</div>
                  <Select<FullPurchasePurpose>
                    value={purchasePurpose}
                    onChange={setPurchasePurpose}
                    options={PURPOSE_OPTIONS}
                  />
                </div>
              </div>

              {/* Purchase timing / Move-in timing */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <div className="mb-1 ob-typo-caption text-(--oboon-text-muted)">분양 희망 시점</div>
                  <Select<PurchaseTiming>
                    value={purchaseTiming}
                    onChange={setPurchaseTiming}
                    options={PURCHASE_TIMING_OPTIONS}
                  />
                </div>
                <div>
                  <div className="mb-1 ob-typo-caption text-(--oboon-text-muted)">입주 가능 시점</div>
                  <Select<MoveinTiming>
                    value={moveinTiming}
                    onChange={setMoveinTiming}
                    options={MOVEIN_TIMING_OPTIONS}
                  />
                </div>
              </div>

              <Button className="w-full" loading={loading} onClick={() => void handleEvaluate()}>
                조건 검증하기
              </Button>
            </>
          ) : (
            <>
              {/* 비로그인: 기본 필드 (현금 / 소득) */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="min-w-0">
                  <label className="mb-1 block ob-typo-caption text-(--oboon-text-muted)">
                    가용 현금 (만원)
                  </label>
                  <div className="relative">
                    <Input
                      value={availableCash}
                      onChange={(e) => setAvailableCash(formatNumericInput(e.target.value))}
                      inputMode="numeric"
                      placeholder="예: 5,000"
                      className={availableCashPreview ? "pr-16" : undefined}
                    />
                    {availableCashPreview ? (
                      <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center ob-typo-caption text-(--oboon-text-muted) truncate max-w-[56px]">
                        {availableCashPreview}
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className="min-w-0">
                  <label className="mb-1 block ob-typo-caption text-(--oboon-text-muted)">
                    월 소득 (만원)
                  </label>
                  <div className="relative">
                    <Input
                      value={monthlyIncome}
                      onChange={(e) => setMonthlyIncome(formatNumericInput(e.target.value))}
                      inputMode="numeric"
                      placeholder="예: 400"
                      className={monthlyIncomePreview ? "pr-16" : undefined}
                    />
                    {monthlyIncomePreview ? (
                      <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center ob-typo-caption text-(--oboon-text-muted) truncate max-w-[56px]">
                        {monthlyIncomePreview}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* 비로그인: 기본 필드 (신용 상태) */}
              <div>
                <div className="mb-1 ob-typo-caption text-(--oboon-text-muted)">신용 상태</div>
                <Select<CreditGrade>
                  value={guestCreditGrade}
                  onChange={setGuestCreditGrade}
                  options={CREDIT_GRADE_OPTIONS}
                />
              </div>

              {/* 비로그인: 기본 필드 (주택 보유 / 구매 목적) */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <div className="mb-1 ob-typo-caption text-(--oboon-text-muted)">주택 보유</div>
                  <Select<"none" | "one" | "two_or_more">
                    value={houseOwnership}
                    onChange={setHouseOwnership}
                    options={OWNERSHIP_OPTIONS}
                  />
                </div>
                <div>
                  <div className="mb-1 ob-typo-caption text-(--oboon-text-muted)">구매 목적</div>
                  <Select<FullPurchasePurpose>
                    value={purchasePurpose}
                    onChange={setPurchasePurpose}
                    options={PURPOSE_OPTIONS}
                  />
                </div>
              </div>

              {/* 비로그인: soft gate — 잠긴 상세 조건 */}
              <div className="relative overflow-hidden rounded-xl border border-(--oboon-border-default)">
                {/* 블러 처리된 필드들 */}
                <div className="pointer-events-none select-none blur-sm opacity-50 p-3 space-y-2.5">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="min-w-0">
                      <div className="mb-1 ob-typo-caption text-(--oboon-text-muted)">직업 형태</div>
                      <Select<EmploymentType>
                        value={employmentType}
                        onChange={() => undefined}
                        options={EMPLOYMENT_OPTIONS}
                      />
                    </div>
                    <div className="min-w-0">
                      <label className="mb-1 block ob-typo-caption text-(--oboon-text-muted)">
                        월 지출 (만원)
                      </label>
                      <Input value="" onChange={() => undefined} placeholder="예: 150" />
                    </div>
                  </div>
                  <div>
                    <div className="mb-1 ob-typo-caption text-(--oboon-text-muted)">신용 상태 (LTV+DSR)</div>
                    <div className="w-full rounded-lg border border-(--oboon-border-default) bg-(--oboon-bg-surface) px-3 py-2">
                      <span className="ob-typo-caption text-(--oboon-text-muted)">미설정 (클릭하여 평가)</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <div className="mb-1 ob-typo-caption text-(--oboon-text-muted)">분양 희망 시점</div>
                      <Select<PurchaseTiming>
                        value={purchaseTiming}
                        onChange={() => undefined}
                        options={PURCHASE_TIMING_OPTIONS}
                      />
                    </div>
                    <div>
                      <div className="mb-1 ob-typo-caption text-(--oboon-text-muted)">입주 가능 시점</div>
                      <Select<MoveinTiming>
                        value={moveinTiming}
                        onChange={() => undefined}
                        options={MOVEIN_TIMING_OPTIONS}
                      />
                    </div>
                  </div>
                </div>

                {/* 잠금 오버레이 */}
                <button
                  type="button"
                  onClick={onLoginRequest}
                  className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-(--oboon-bg-surface)/80 backdrop-blur-[1px] transition-colors hover:bg-(--oboon-bg-subtle)/80"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-(--oboon-bg-elevated) border border-(--oboon-border-default) shadow-sm">
                    <Lock className="h-4 w-4 text-(--oboon-text-muted)" />
                  </div>
                  <div className="text-center px-4">
                    <p className="ob-typo-caption font-semibold text-(--oboon-text-title)">
                      로그인하면 더 자세한 조건으로 검증할 수 있습니다
                    </p>
                    <p className="mt-0.5 ob-typo-caption text-(--oboon-text-muted)">
                      직업 · 지출 · 신용 · 분양·입주 시점 추가 입력
                    </p>
                  </div>
                </button>
              </div>

              <Button
                className="w-full"
                loading={guestLoading}
                onClick={() => void handleGuestEvaluate()}
              >
                간편 검증하기
              </Button>
            </>
          )}
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

      {/* LTV/DSR Modal */}
      <LtvDsrModal
        open={ltvModalOpen}
        onClose={() => setLtvModalOpen(false)}
        onConfirm={(result) => {
          setLtvInternalScore(result.ltvInternalScore);
          setLtvPoints(result.ltvPoints);
          setExistingLoan(result.formValues.existingLoan);
          setRecentDelinquency(result.formValues.recentDelinquency);
          setCardLoanUsage(result.formValues.cardLoanUsage);
          setLoanRejection(result.formValues.loanRejection);
          setMonthlyIncomeRange(result.formValues.monthlyIncomeRange);
          setExistingMonthlyRepayment(result.existingMonthlyRepayment);
        }}
        initialEmploymentType={employmentType}
        initialHouseOwnership={houseOwnership}
        estimatedNewLoanPaymentManwon={estimatedNewLoanPaymentManwon}
        initialValues={{
          existingLoan,
          recentDelinquency,
          cardLoanUsage,
          loanRejection,
          monthlyIncomeRange,
          existingMonthlyRepayment,
        }}
        initialLtvInternalScore={ltvInternalScore ?? 0}
      />
    </Card>
  );
}
