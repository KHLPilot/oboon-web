"use client";

import { useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, Lock } from "lucide-react";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import LtvDsrModal from "@/features/condition-validation/components/LtvDsrModal";
import type {
  EmploymentType,
  FullEvaluationResponse,
  FullPurchasePurpose,
  FinalGrade5,
  MonthlyLoanRepayment,
  MoveinTiming,
  PurchaseTiming,
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
        label: "계약 가능",
      };
    case "LIME":
      return {
        color: "var(--oboon-grade-lime)",
        bgColor: "var(--oboon-grade-lime-bg)",
        borderColor: "var(--oboon-grade-lime-border)",
        label: "계약 가능 (확인 필요)",
      };
    case "YELLOW":
      return {
        color: "var(--oboon-grade-yellow)",
        bgColor: "var(--oboon-grade-yellow-bg)",
        borderColor: "var(--oboon-grade-yellow-border)",
        label: "확인 필요",
      };
    case "ORANGE":
      return {
        color: "var(--oboon-grade-orange)",
        bgColor: "var(--oboon-grade-orange-bg)",
        borderColor: "var(--oboon-grade-orange-border)",
        label: "계약 어려울 수 있음",
      };
    case "RED":
      return {
        color: "var(--oboon-grade-red)",
        bgColor: "var(--oboon-grade-red-bg)",
        borderColor: "var(--oboon-grade-red-border)",
        label: "계약 어려움",
      };
  }
}

// ─── Inline RadioGroup ─────────────────────────────────────────────────────────

type RadioGroupProps<T extends string> = {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
};

function RadioGroup<T extends string>({
  label,
  value,
  onChange,
  options,
}: RadioGroupProps<T>) {
  return (
    <div>
      <div className="mb-1.5 ob-typo-caption text-(--oboon-text-muted)">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={[
              "rounded-lg border px-2.5 py-1 ob-typo-caption transition-colors",
              value === opt.value
                ? "border-(--oboon-primary) bg-(--oboon-primary-bg) text-(--oboon-primary) font-semibold"
                : "border-(--oboon-border-default) bg-(--oboon-bg-surface) text-(--oboon-text-muted) hover:border-(--oboon-border-hover)",
            ].join(" ")}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
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

// ─── Props ─────────────────────────────────────────────────────────────────────

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

const LTV_STATUS_LABELS: Record<string, string> = {
  not_set: "미설정 (클릭하여 평가)",
};

// ─── Main Component ────────────────────────────────────────────────────────────

export default function ConditionValidationCard({
  propertyId,
  propertyName,
  // presetCustomer is kept for backward compatibility with parent components but not used in v2
  presetCustomer: _presetCustomer, // eslint-disable-line @typescript-eslint/no-unused-vars
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

  // LTV/DSR state from modal
  const [ltvInternalScore, setLtvInternalScore] = useState<number | null>(null);
  const [ltvPoints, setLtvPoints] = useState<number | null>(null);
  const [existingMonthlyRepayment, setExistingMonthlyRepayment] =
    useState<MonthlyLoanRepayment>("none");
  const [ltvModalOpen, setLtvModalOpen] = useState(false);

  // UI state
  const [isInputSectionVisible, setIsInputSectionVisible] = useState(true);
  const [loading, setLoading] = useState(false);
  const [recommendLoading, setRecommendLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [response, setResponse] = useState<FullEvaluationResponse | null>(null);
  const [showResultDetails, setShowResultDetails] = useState(false);

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

  const handleEvaluate = async () => {
    setErrorMessage(null);
    const validationError = validate();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/condition-validation/evaluate-v2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          property_id: propertyId,
          customer: {
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
          },
        }),
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
        const message = fieldError ?? data?.error?.message ?? "조건 검증에 실패했습니다.";
        setErrorMessage(message);
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
  };

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

  // ── Login gate ────────────────────────────────────────────────────────────────
  if (!isLoggedIn) {
    return (
      <Card className="p-4">
        <div className="ob-typo-h3 text-(--oboon-text-title)">조건 검증</div>
        <p className="mt-1 ob-typo-caption text-(--oboon-text-muted)">
          {propertyName ? `${propertyName} 현장 기준` : "현장 기준"}으로 내 조건을 확인합니다.
        </p>
        <div className="mt-4 flex flex-col items-center gap-3 rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle) py-8 px-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-(--oboon-border-default) bg-(--oboon-bg-surface)">
            <Lock className="h-5 w-5 text-(--oboon-text-muted)" />
          </div>
          <div>
            <p className="ob-typo-body font-semibold text-(--oboon-text-title)">
              로그인이 필요합니다
            </p>
            <p className="mt-1 ob-typo-caption text-(--oboon-text-muted)">
              내 조건에 맞는 현장인지 확인하려면 로그인하세요.
            </p>
          </div>
          <Button onClick={onLoginRequest} className="mt-1">
            로그인하기
          </Button>
        </div>
      </Card>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────────
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="ob-typo-h3 text-(--oboon-text-title)">조건 검증</div>
          <p className="mt-1 ob-typo-caption text-(--oboon-text-muted)">
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
        <div className="mt-3 space-y-3">
          {/* Employment type */}
          <div>
            <div className="mb-1.5 ob-typo-caption text-(--oboon-text-muted)">직업 형태</div>
            <Select<EmploymentType>
              value={employmentType}
              onChange={setEmploymentType}
              options={EMPLOYMENT_OPTIONS}
            />
          </div>

          {/* Available cash */}
          <div>
            <label className="mb-1 block ob-typo-caption text-(--oboon-text-muted)">
              가용 현금 (만원)
            </label>
            <div className="relative">
              <Input
                value={availableCash}
                onChange={(e) => setAvailableCash(formatNumericInput(e.target.value))}
                inputMode="numeric"
                placeholder="예: 5,000"
                className={availableCashPreview ? "pr-28" : undefined}
              />
              {availableCashPreview ? (
                <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center ob-typo-caption text-(--oboon-text-muted)">
                  {availableCashPreview}
                </div>
              ) : null}
            </div>
          </div>

          {/* Monthly income */}
          <div>
            <label className="mb-1 block ob-typo-caption text-(--oboon-text-muted)">
              월 세후 소득 (만원)
            </label>
            <div className="relative">
              <Input
                value={monthlyIncome}
                onChange={(e) => setMonthlyIncome(formatNumericInput(e.target.value))}
                inputMode="numeric"
                placeholder="예: 400"
                className={monthlyIncomePreview ? "pr-28" : undefined}
              />
              {monthlyIncomePreview ? (
                <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center ob-typo-caption text-(--oboon-text-muted)">
                  {monthlyIncomePreview}
                </div>
              ) : null}
            </div>
          </div>

          {/* Monthly expenses */}
          <div>
            <label className="mb-1 block ob-typo-caption text-(--oboon-text-muted)">
              월 고정 지출 (만원)
            </label>
            <Input
              value={monthlyExpenses}
              onChange={(e) => setMonthlyExpenses(formatNumericInput(e.target.value))}
              inputMode="numeric"
              placeholder="예: 150"
            />
          </div>

          {/* LTV/DSR button */}
          <div>
            <div className="mb-1 ob-typo-caption text-(--oboon-text-muted)">
              신용 상태 (LTV+DSR)
            </div>
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="mb-1.5 ob-typo-caption text-(--oboon-text-muted)">주택 보유</div>
              <Select<"none" | "one" | "two_or_more">
                value={houseOwnership}
                onChange={setHouseOwnership}
                options={OWNERSHIP_OPTIONS}
              />
            </div>
            <div>
              <div className="mb-1.5 ob-typo-caption text-(--oboon-text-muted)">구매 목적</div>
              <Select<FullPurchasePurpose>
                value={purchasePurpose}
                onChange={setPurchasePurpose}
                options={PURPOSE_OPTIONS}
              />
            </div>
          </div>

          {/* Purchase timing */}
          <RadioGroup
            label="분양 희망 시점"
            value={purchaseTiming}
            onChange={setPurchaseTiming}
            options={PURCHASE_TIMING_OPTIONS}
          />

          {/* Move-in timing */}
          <RadioGroup
            label="입주 가능 시점"
            value={moveinTiming}
            onChange={setMoveinTiming}
            options={MOVEIN_TIMING_OPTIONS}
          />

          <Button className="w-full" loading={loading} onClick={() => void handleEvaluate()}>
            조건 검증하기
          </Button>
        </div>
      ) : null}

      {/* Error */}
      {errorMessage ? (
        <div className="mt-3 flex items-center gap-1.5 rounded-xl border border-(--oboon-danger-border) bg-(--oboon-danger-bg) px-3 py-2 text-(--oboon-danger-text)">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="ob-typo-caption">{errorMessage}</span>
        </div>
      ) : null}

      {/* Result */}
      {result && !isInputSectionVisible ? (
        <div className="mt-3 space-y-3">
          {/* Grade badge */}
          {(() => {
            const meta = grade5Meta(result.final_grade);
            return (
              <div
                className="rounded-xl border p-3"
                style={{
                  borderColor: meta.borderColor,
                  backgroundColor: meta.bgColor,
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="ob-typo-caption text-(--oboon-text-muted)">종합 점수</div>
                    <div
                      className="mt-0.5 ob-typo-subtitle font-bold"
                      style={{ color: meta.color }}
                    >
                      {Math.round(result.total_score)}/{result.max_score}점
                    </div>
                  </div>
                  <div
                    className="rounded-full border px-3 py-1 ob-typo-caption font-semibold"
                    style={{
                      color: meta.color,
                      borderColor: meta.borderColor,
                      backgroundColor: meta.bgColor,
                    }}
                  >
                    {meta.label}
                  </div>
                </div>
                <p className="mt-2 ob-typo-caption text-(--oboon-text-muted)">
                  {result.summary_message}
                </p>
              </div>
            );
          })()}

          {/* Category detail toggle */}
          {categories ? (
            <button
              type="button"
              onClick={() => setShowResultDetails((prev) => !prev)}
              className="flex w-full items-center justify-between rounded-lg border border-(--oboon-border-default) bg-(--oboon-bg-subtle) px-3 py-2 ob-typo-caption text-(--oboon-text-muted) hover:border-(--oboon-border-hover) transition-colors"
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
            <div className="space-y-2">
              {(
                [
                  { key: "cash" as const, label: "자금력" },
                  { key: "income" as const, label: "소득" },
                  { key: "ltv_dsr" as const, label: "LTV+DSR" },
                  { key: "ownership" as const, label: "주택 보유" },
                  { key: "purpose" as const, label: "구매 목적" },
                  { key: "timing" as const, label: "분양·입주 시점" },
                ] as const
              ).map(({ key, label }) => {
                const cat = categories[key];
                const meta = grade5Meta(cat.grade);
                return (
                  <div
                    key={key}
                    className="rounded-lg border p-2.5"
                    style={{
                      borderColor: meta.borderColor,
                      backgroundColor: meta.bgColor,
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="ob-typo-body font-semibold text-(--oboon-text-title)">
                        {label}
                      </span>
                      <span
                        className="ob-typo-caption font-semibold"
                        style={{ color: meta.color }}
                      >
                        {cat.score}/{cat.max_score}
                      </span>
                    </div>
                    <p className="mt-1 ob-typo-caption text-(--oboon-text-muted)">
                      {cat.reason}
                    </p>
                  </div>
                );
              })}

              {/* Metrics */}
              {metrics ? (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="rounded-lg border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-2">
                    <div className="ob-typo-caption text-(--oboon-text-muted)">계약금</div>
                    <div className="mt-1 ob-typo-body text-(--oboon-text-title)">
                      {formatManwonWithEok(metrics.contract_amount)}
                    </div>
                  </div>
                  <div className="rounded-lg border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-2">
                    <div className="ob-typo-caption text-(--oboon-text-muted)">예상 대출</div>
                    <div className="mt-1 ob-typo-body text-(--oboon-text-title)">
                      {formatManwonWithEok(metrics.loan_amount)}
                    </div>
                  </div>
                  <div className="rounded-lg border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-2">
                    <div className="ob-typo-caption text-(--oboon-text-muted)">예상 월상환</div>
                    <div className="mt-1 ob-typo-body text-(--oboon-text-title)">
                      {formatManwonWithEok(metrics.monthly_payment_est)}
                    </div>
                  </div>
                  <div className="rounded-lg border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-2">
                    <div className="ob-typo-caption text-(--oboon-text-muted)">월 잉여</div>
                    <div className="mt-1 ob-typo-body text-(--oboon-text-title)">
                      {formatManwonWithEok(metrics.monthly_surplus)}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
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

      <p className="mt-3 ob-typo-caption text-(--oboon-text-muted)">
        * 본 검증은 참고용이며 실제 계약 가능 여부는 현장 상담을 통해 확인하세요.
      </p>

      {/* LTV/DSR Modal */}
      <LtvDsrModal
        open={ltvModalOpen}
        onClose={() => setLtvModalOpen(false)}
        onConfirm={(result) => {
          setLtvInternalScore(result.ltvInternalScore);
          setLtvPoints(result.ltvPoints);
          setExistingMonthlyRepayment(result.existingMonthlyRepayment);
        }}
        initialEmploymentType={employmentType}
        initialHouseOwnership={houseOwnership}
        estimatedNewLoanPaymentManwon={estimatedNewLoanPaymentManwon}
      />
    </Card>
  );
}
