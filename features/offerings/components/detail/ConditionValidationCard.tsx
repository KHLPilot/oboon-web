"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown } from "lucide-react";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import { oboonFieldBaseClass } from "@/lib/ui/formFieldStyles";

type FinalGrade = "GREEN" | "YELLOW" | "RED";

type EvaluationResponse = {
  ok: boolean;
  result?: {
    final_grade: FinalGrade;
    action: string;
    reason_codes: string[];
    reason_messages: string[];
    summary_message: string;
  };
  metrics?: {
    list_price: number;
    contract_amount: number;
    min_cash: number;
    recommended_cash: number;
    loan_ratio: number;
    loan_amount: number;
    interest_rate: number;
    monthly_payment_est: number;
    monthly_burden_ratio: number;
    monthly_burden_percent: number;
  };
  warnings?: string[];
  display?: {
    show_detailed_metrics?: boolean;
    price_visibility?: "public" | "non_public" | "unknown";
  };
  trace?: {
    step1_cash_grade: FinalGrade;
    step1_cash_reason_code:
      | "CASH_BELOW_MIN"
      | "CASH_BETWEEN_MIN_AND_RECOMMENDED"
      | "CASH_ABOVE_RECOMMENDED";
    step1_cash_reason_message: string;
    step2_burden_grade: FinalGrade;
    step2_burden_reason_code: "BURDEN_WARNING_40_TO_50" | "BURDEN_HIGH_OVER_50" | null;
    step2_burden_reason_message: string | null;
    step3_risk_grade: FinalGrade;
    step3_risk_reason_codes: Array<
      | "RISK_MULTI_HOME_REGULATED"
      | "RISK_CREDIT_UNSTABLE"
      | "RISK_INVESTMENT_TRANSFER_LIMITED"
    >;
    step3_risk_reason_messages: string[];
  };
  error?: {
    code?: string;
    message?: string;
    field_errors?: Record<string, string[] | undefined>;
  };
};

type RecommendationCustomerInput = {
  available_cash: number;
  monthly_income: number;
  owned_house_count: number;
  credit_grade: "good" | "normal" | "unstable";
  purchase_purpose: "residence" | "investment" | "both";
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
  isLoggedIn: boolean;
  hasBookableAgent: boolean;
  isBookingBlockedRole: boolean;
  onConsultationRequest: () => void;
  onAlternativeRecommendRequest: (
    customer: RecommendationCustomerInput,
  ) => Promise<void> | void;
  onLoginRequest: () => void;
};

function parseNumericInput(value: string): number {
  return Number(value.replaceAll(",", "").trim());
}

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

function formatManwonWithEok(value: number): string {
  const rounded = Math.round(value);
  if (rounded < 10000) {
    return `${rounded.toLocaleString("ko-KR")}만원`;
  }

  const eok = Math.floor(rounded / 10000);
  const restManwon = rounded % 10000;

  if (restManwon === 0) {
    return `${eok.toLocaleString("ko-KR")}억원`;
  }

  return `${eok.toLocaleString("ko-KR")}억 ${restManwon.toLocaleString("ko-KR")}만원`;
}

function formatManwonPreview(value: string): string {
  const parsed = parseNullableNumericInput(value);
  if (parsed === null) {
    return "";
  }

  const manwon = Math.round(parsed);
  if (manwon < 10000) {
    return `${manwon.toLocaleString("ko-KR")}만원`;
  }

  const eok = Math.floor(manwon / 10000);
  const restManwon = manwon % 10000;

  if (restManwon === 0) {
    return `${eok.toLocaleString("ko-KR")}억원`;
  }

  if (restManwon % 1000 === 0) {
    return `${eok.toLocaleString("ko-KR")}억 ${restManwon / 1000}천만원`;
  }

  return `${eok.toLocaleString("ko-KR")}억 ${restManwon.toLocaleString("ko-KR")}만원`;
}

function formatPercent(value: number): string {
  return `${value.toLocaleString("ko-KR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;
}

function gradeMeta(grade: FinalGrade): {
  label: string;
  badgeVariant: "success" | "warning" | "danger";
} {
  if (grade === "GREEN") {
    return { label: "진행 가능", badgeVariant: "success" };
  }
  if (grade === "YELLOW") {
    return { label: "상담 권장", badgeVariant: "warning" };
  }
  return { label: "리스크 높음", badgeVariant: "danger" };
}

function categoryCardClass(grade: FinalGrade): string {
  if (grade === "GREEN") {
    return "border-(--oboon-safe-border) bg-(--oboon-safe-bg)";
  }
  if (grade === "YELLOW") {
    return "border-(--oboon-warning-border) bg-(--oboon-warning-bg)";
  }
  return "border-(--oboon-danger-border) bg-(--oboon-danger-bg)";
}

export default function ConditionValidationCard({
  propertyId,
  propertyName,
  presetCustomer = null,
  isLoggedIn,
  hasBookableAgent,
  isBookingBlockedRole,
  onConsultationRequest,
  onAlternativeRecommendRequest,
  onLoginRequest,
}: ConditionValidationCardProps) {
  const [availableCash, setAvailableCash] = useState("");
  const [monthlyIncome, setMonthlyIncome] = useState("");
  const [ownedHouseCount, setOwnedHouseCount] = useState("0");
  const [creditGrade, setCreditGrade] = useState<"good" | "normal" | "unstable">("good");
  const [purchasePurpose, setPurchasePurpose] = useState<
    "residence" | "investment" | "both"
  >("residence");
  const [isInputSectionVisible, setIsInputSectionVisible] = useState(true);
  const [loading, setLoading] = useState(false);
  const [recommendLoading, setRecommendLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [response, setResponse] = useState<EvaluationResponse | null>(null);
  const [appliedPresetKey, setAppliedPresetKey] = useState<string | null>(null);
  const [showResultDetails, setShowResultDetails] = useState(false);

  const result = response?.ok ? response.result : undefined;
  const metrics = response?.ok ? response.metrics : undefined;
  const trace = response?.ok ? response.trace : undefined;
  const shouldShowDetailedMetrics = response?.ok
    ? response.display?.show_detailed_metrics !== false
    : true;
  const presetKey = useMemo(() => {
    if (!presetCustomer) return null;
    return [
      presetCustomer.availableCash,
      presetCustomer.monthlyIncome,
      presetCustomer.ownedHouseCount,
      presetCustomer.creditGrade,
      presetCustomer.purchasePurpose,
    ].join("|");
  }, [presetCustomer]);
  const hasPresetCustomer = Boolean(presetCustomer && presetKey);
  const showInputSection = isInputSectionVisible || (!result && !hasPresetCustomer);
  const showModifyButton = !showInputSection;
  const availableCashPreview = formatManwonPreview(availableCash);
  const monthlyIncomePreview = formatManwonPreview(monthlyIncome);

  useEffect(() => {
    if (!presetCustomer || !presetKey) return;
    if (appliedPresetKey === presetKey) return;

    setAvailableCash(Math.round(presetCustomer.availableCash).toLocaleString("ko-KR"));
    setMonthlyIncome(Math.round(presetCustomer.monthlyIncome).toLocaleString("ko-KR"));
    setOwnedHouseCount(String(Math.max(0, Math.round(presetCustomer.ownedHouseCount))));
    setCreditGrade(presetCustomer.creditGrade);
    setPurchasePurpose(presetCustomer.purchasePurpose);
    setErrorMessage(null);
    setResponse(null);
    setIsInputSectionVisible(false);
    setAppliedPresetKey(presetKey);
  }, [appliedPresetKey, presetCustomer, presetKey]);

  useEffect(() => {
    setShowResultDetails(false);
  }, [response]);

  const parseCustomerInput = (): RecommendationCustomerInput | null => {
    const availableCashNum = parseNumericInput(availableCash);
    const monthlyIncomeNum = parseNumericInput(monthlyIncome);
    const ownedHouseCountNum = parseNumericInput(ownedHouseCount || "0");

    if (!Number.isFinite(availableCashNum) || availableCashNum <= 0) {
      setErrorMessage("가용 현금을 올바르게 입력해주세요.");
      return null;
    }
    if (!Number.isInteger(availableCashNum)) {
      setErrorMessage("가용 현금은 만원 단위 정수로 입력해주세요.");
      return null;
    }
    if (!Number.isFinite(monthlyIncomeNum) || monthlyIncomeNum <= 0) {
      setErrorMessage("월 소득을 올바르게 입력해주세요.");
      return null;
    }
    if (!Number.isInteger(monthlyIncomeNum)) {
      setErrorMessage("월 소득은 만원 단위 정수로 입력해주세요.");
      return null;
    }
    if (
      !Number.isFinite(ownedHouseCountNum) ||
      ownedHouseCountNum < 0 ||
      !Number.isInteger(ownedHouseCountNum)
    ) {
      setErrorMessage("보유 주택 수는 0 이상의 정수로 입력해주세요.");
      return null;
    }

    return {
      available_cash: availableCashNum,
      monthly_income: monthlyIncomeNum,
      owned_house_count: ownedHouseCountNum,
      credit_grade: creditGrade,
      purchase_purpose: purchasePurpose,
    };
  };

  const handleEvaluate = async () => {
    setErrorMessage(null);

    if (!propertyId) {
      setErrorMessage("현장 정보를 찾을 수 없습니다.");
      return;
    }

    const customer = parseCustomerInput();
    if (!customer) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/condition-validation/evaluate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          property_id: propertyId,
          customer,
          options: {
            trace: true,
            strict_validation: false,
          },
        }),
      });

      const data = (await res.json().catch(() => null)) as EvaluationResponse | null;

      if (!res.ok || !data?.ok) {
        const fieldError = data?.error?.field_errors
          ? Object.values(data.error.field_errors).flat().find(Boolean)
          : null;
        const message = fieldError || data?.error?.message || "조건 검증에 실패했습니다.";
        setErrorMessage(message);
        setResponse(data ?? null);
        return;
      }

      setResponse(data);
      setIsInputSectionVisible(false);
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
    if (isBookingBlockedRole || !hasBookableAgent) {
      return;
    }
    onConsultationRequest();
  };

  const handleAlternativeRecommend = async () => {
    setErrorMessage(null);
    const customer = parseCustomerInput();
    if (!customer) return;

    setRecommendLoading(true);
    try {
      await onAlternativeRecommendRequest(customer);
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
    result?.final_grade === "RED" ||
    result?.action === "RECOMMEND_ALTERNATIVE_AND_CONSULT";

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="ob-typo-h3 text-(--oboon-text-title)">조건 검증</div>
          <p className="mt-1 ob-typo-caption text-(--oboon-text-muted)">
            {propertyName ? `${propertyName} 현장 기준` : "현장 기준"}으로 빠르게 확인합니다.
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

      {showInputSection ? (
        <>
          <div className="mt-3 grid grid-cols-1 gap-2.5">
            <div>
              <label className="mb-1 block ob-typo-caption text-(--oboon-text-muted)">
                가용 현금 (만원)
              </label>
              <div className="relative">
                <Input
                  value={availableCash}
                  onChange={(e) => setAvailableCash(formatNumericInput(e.target.value))}
                  inputMode="numeric"
                  placeholder="예: 8,000"
                  className={availableCashPreview ? "pr-28" : undefined}
                />
                {availableCashPreview ? (
                  <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center ob-typo-caption text-(--oboon-text-muted)">
                    {availableCashPreview}
                  </div>
                ) : null}
              </div>
            </div>

            <div>
              <label className="mb-1 block ob-typo-caption text-(--oboon-text-muted)">
                월 소득 (만원)
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

            <div>
              <label className="mb-1 block ob-typo-caption text-(--oboon-text-muted)">
                보유 주택 수
              </label>
              <Input
                value={ownedHouseCount}
                onChange={(e) => setOwnedHouseCount(formatNumericInput(e.target.value))}
                inputMode="numeric"
                placeholder="0"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="mb-1 block ob-typo-caption text-(--oboon-text-muted)">
                  신용
                </label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className={[
                        oboonFieldBaseClass,
                        "inline-flex items-center justify-between",
                      ].join(" ")}
                    >
                      <span>
                        {creditGrade === "good"
                          ? "양호"
                          : creditGrade === "normal"
                            ? "보통"
                            : "불안"}
                      </span>
                      <ChevronDown className="h-4 w-4 text-(--oboon-text-muted)" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" matchTriggerWidth>
                    <DropdownMenuItem
                      className={creditGrade === "good" ? "bg-(--oboon-bg-subtle)" : ""}
                      onClick={() => setCreditGrade("good")}
                    >
                      양호
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className={creditGrade === "normal" ? "bg-(--oboon-bg-subtle)" : ""}
                      onClick={() => setCreditGrade("normal")}
                    >
                      보통
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className={creditGrade === "unstable" ? "bg-(--oboon-bg-subtle)" : ""}
                      onClick={() => setCreditGrade("unstable")}
                    >
                      불안
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div>
                <label className="mb-1 block ob-typo-caption text-(--oboon-text-muted)">
                  목적
                </label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className={[
                        oboonFieldBaseClass,
                        "inline-flex items-center justify-between",
                      ].join(" ")}
                    >
                      <span>
                        {purchasePurpose === "residence"
                          ? "실거주"
                          : purchasePurpose === "investment"
                            ? "투자"
                            : "둘다"}
                      </span>
                      <ChevronDown className="h-4 w-4 text-(--oboon-text-muted)" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" matchTriggerWidth>
                    <DropdownMenuItem
                      className={purchasePurpose === "residence" ? "bg-(--oboon-bg-subtle)" : ""}
                      onClick={() => setPurchasePurpose("residence")}
                    >
                      실거주
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className={purchasePurpose === "investment" ? "bg-(--oboon-bg-subtle)" : ""}
                      onClick={() => setPurchasePurpose("investment")}
                    >
                      투자
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className={purchasePurpose === "both" ? "bg-(--oboon-bg-subtle)" : ""}
                      onClick={() => setPurchasePurpose("both")}
                    >
                      둘다
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>

          <div className="mt-3 flex gap-2">
            <Button className="flex-1" loading={loading} onClick={() => void handleEvaluate()}>
              조건 확인
            </Button>
          </div>
        </>
      ) : null}

      {!showInputSection && !result ? (
        <div className="mt-3 space-y-2">
          <div className="rounded-lg border border-(--oboon-border-default) bg-(--oboon-bg-subtle) p-2.5">
            <p className="ob-typo-caption text-(--oboon-text-muted)">
              맞춤 정보가 적용되었습니다. 바로 조건 확인을 진행할 수 있습니다.
            </p>
          </div>
          <Button className="w-full" loading={loading} onClick={() => void handleEvaluate()}>
            조건 확인
          </Button>
        </div>
      ) : null}

      {errorMessage ? (
        <div className="mt-3 flex items-center gap-1.5 rounded-xl border border-(--oboon-danger-border) bg-(--oboon-danger-bg) px-3 py-2 text-(--oboon-danger-text)">
          <AlertTriangle className="h-4 w-4" />
          <span className="ob-typo-caption">{errorMessage}</span>
        </div>
      ) : null}

      {result && metrics ? (
        <div className="mt-3 rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle) p-3">
          <div className="flex items-start justify-between gap-2 text-(--oboon-text-title)">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" />
              <span className="ob-typo-body">{result.summary_message}</span>
            </div>
            <Badge variant={gradeMeta(result.final_grade).badgeVariant}>
              {gradeMeta(result.final_grade).label}
            </Badge>
          </div>

          {result.reason_messages.length > 0 ? (
            <div className="mt-2 space-y-1">
              {result.reason_messages.map((message, idx) => (
                <p key={`${message}-${idx}`} className="ob-typo-caption text-(--oboon-text-muted)">
                  • {message}
                </p>
              ))}
            </div>
          ) : null}

          {trace || shouldShowDetailedMetrics ? (
            <Button
              className="mt-3 w-full"
              variant="secondary"
              size="sm"
              onClick={() => setShowResultDetails((prev) => !prev)}
            >
              {showResultDetails ? "상세 결과 숨기기" : "상세 결과 보기"}
            </Button>
          ) : null}

          {showResultDetails && trace ? (
            <div className="mt-3">
              <div className="ob-typo-caption text-(--oboon-text-muted)">카테고리 결과</div>
              <div className="mt-2 space-y-2">
                <div className={`rounded-md border p-2 ${categoryCardClass(trace.step1_cash_grade)}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="ob-typo-body font-semibold text-(--oboon-text-title)">자금</span>
                    <Badge variant="status">
                      {gradeMeta(trace.step1_cash_grade).label}
                    </Badge>
                  </div>
                  <p className="mt-1 ob-typo-caption text-(--oboon-text-muted)">
                    {trace.step1_cash_reason_message}
                  </p>
                </div>

                <div className={`rounded-md border p-2 ${categoryCardClass(trace.step2_burden_grade)}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="ob-typo-body font-semibold text-(--oboon-text-title)">월 부담</span>
                    <Badge variant="status">
                      {gradeMeta(trace.step2_burden_grade).label}
                    </Badge>
                  </div>
                  <p className="mt-1 ob-typo-caption text-(--oboon-text-muted)">
                    {trace.step2_burden_reason_message ?? "월 부담이 40% 이하입니다."}
                  </p>
                </div>

                <div className={`rounded-md border p-2 ${categoryCardClass(trace.step3_risk_grade)}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="ob-typo-body font-semibold text-(--oboon-text-title)">위험 요인</span>
                    <Badge variant="status">
                      {gradeMeta(trace.step3_risk_grade).label}
                    </Badge>
                  </div>
                  <p className="mt-1 ob-typo-caption text-(--oboon-text-muted)">
                    {trace.step3_risk_reason_messages.length > 0
                      ? trace.step3_risk_reason_messages.join(" · ")
                      : "추가 리스크 없음"}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {showResultDetails && shouldShowDetailedMetrics ? (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-2">
                <div className="ob-typo-caption text-(--oboon-text-muted)">최소 필요 현금</div>
                <div className="mt-1 ob-typo-body text-(--oboon-text-title)">
                  {formatManwonWithEok(metrics.min_cash)}
                </div>
              </div>
              <div className="rounded-lg border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-2">
                <div className="ob-typo-caption text-(--oboon-text-muted)">권장 현금</div>
                <div className="mt-1 ob-typo-body text-(--oboon-text-title)">
                  {formatManwonWithEok(metrics.recommended_cash)}
                </div>
              </div>
              <div className="rounded-lg border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-2">
                <div className="ob-typo-caption text-(--oboon-text-muted)">예상 월상환</div>
                <div className="mt-1 ob-typo-body text-(--oboon-text-title)">
                  {formatManwonWithEok(metrics.monthly_payment_est)}
                </div>
              </div>
              <div className="rounded-lg border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-2">
                <div className="ob-typo-caption text-(--oboon-text-muted)">월 부담률</div>
                <div className="mt-1 ob-typo-body text-(--oboon-text-title)">
                  {formatPercent(metrics.monthly_burden_percent)}
                </div>
              </div>
            </div>
          ) : null}

          {shouldShowAlternativeButton ? (
            <Button
              className="mt-3 w-full"
              variant="secondary"
              loading={recommendLoading}
              onClick={() => void handleAlternativeRecommend()}
            >
              대안 현장 추천 보기
            </Button>
          ) : null}

          <Button
            className="mt-3 w-full"
            variant={result.final_grade === "RED" ? "warning" : "primary"}
            disabled={isBookingBlockedRole || !hasBookableAgent}
            onClick={handleConsultAction}
          >
            {consultButtonLabel}
          </Button>

          {isBookingBlockedRole ? (
            <p className="mt-2 ob-typo-caption text-(--oboon-text-muted)">
              관리자/상담사 계정은 상담 예약을 진행할 수 없습니다.
            </p>
          ) : !hasBookableAgent ? (
            <p className="mt-2 ob-typo-caption text-(--oboon-text-muted)">
              현재 이 현장에는 예약 가능한 상담사가 없습니다.
            </p>
          ) : null}
        </div>
      ) : null}

      <p className="mt-3 ob-typo-caption text-(--oboon-text-muted)">
        조건 검증 결과는 참고용이며, 최종 진행 가능 여부는 실제 상담에서 재확인됩니다.
      </p>
    </Card>
  );
}
