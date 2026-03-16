"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Lock } from "lucide-react";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import type {
  ConditionEvaluationResponse,
  FinalGrade,
} from "@/features/condition-validation/domain/types";
import {
  parseCustomerInput,
  type ParsedCustomerInput,
} from "@/features/condition-validation/domain/validation";
import {
  formatManwonPreview,
  formatManwonWithEok,
  formatPercent,
} from "@/lib/format/currency";
const CREDIT_OPTIONS = [
  { label: "양호", value: "good" },
  { label: "보통", value: "normal" },
  { label: "불안", value: "unstable" },
] as const;

const PURPOSE_OPTIONS = [
  { label: "실거주", value: "residence" },
  { label: "투자", value: "investment" },
  { label: "둘다", value: "both" },
] as const;

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
    customer: ParsedCustomerInput,
  ) => Promise<void> | void;
  onLoginRequest: () => void;
};

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

function scoreToneClass(grade: FinalGrade): string {
  if (grade === "GREEN") return "text-(--oboon-safe)";
  if (grade === "YELLOW") return "text-(--oboon-warning)";
  return "text-(--oboon-danger)";
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
  const [response, setResponse] = useState<ConditionEvaluationResponse | null>(null);
  const [appliedPresetKey, setAppliedPresetKey] = useState<string | null>(null);
  const [showResultDetails, setShowResultDetails] = useState(false);

  const result = response?.ok ? response.result : undefined;
  const metrics = response?.ok ? response.metrics : undefined;
  const categories = response?.ok ? response.categories : undefined;
  const isMasked = response?.ok ? response.display?.masked === true : false;
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
  const availableCashPreviewValue = parseNullableNumericInput(availableCash);
  const monthlyIncomePreviewValue = parseNullableNumericInput(monthlyIncome);
  const availableCashPreview =
    availableCashPreviewValue === null ? "" : formatManwonPreview(availableCashPreviewValue);
  const monthlyIncomePreview =
    monthlyIncomePreviewValue === null ? "" : formatManwonPreview(monthlyIncomePreviewValue);
  let monthlyBurdenPercentLabel = "계산 불가";
  if (isMasked) {
    monthlyBurdenPercentLabel = "비공개";
  } else if (metrics && metrics.monthly_burden_percent !== null) {
    monthlyBurdenPercentLabel = formatPercent(metrics.monthly_burden_percent);
  }

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

  const parseCustomerInputFromState = (): ParsedCustomerInput | null => {
    const parsed = parseCustomerInput({
      availableCash,
      monthlyIncome,
      ownedHouseCount,
      creditGrade,
      purchasePurpose,
    });

    if (!parsed.ok) {
      setErrorMessage(parsed.error);
      return null;
    }

    return parsed.data;
  };

  const handleEvaluate = async () => {
    setErrorMessage(null);

    if (!propertyId) {
      setErrorMessage("현장 정보를 찾을 수 없습니다.");
      return;
    }

    const customer = parseCustomerInputFromState();
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

      const data = (await res.json().catch(() => null)) as ConditionEvaluationResponse | null;

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
    const customer = parseCustomerInputFromState();
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
                <Select
                  value={creditGrade}
                  onChange={setCreditGrade}
                  options={CREDIT_OPTIONS}
                />
              </div>
              <div>
                <label className="mb-1 block ob-typo-caption text-(--oboon-text-muted)">
                  목적
                </label>
                <Select
                  value={purchasePurpose}
                  onChange={setPurchasePurpose}
                  options={PURPOSE_OPTIONS}
                />
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

      {result ? (
        <div className="mt-3 rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle) p-3">
          <div className="flex items-start justify-between gap-2 text-(--oboon-text-title)">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" />
              <span className="ob-typo-body">{result.summary_message}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-right">
                <div className={["ob-typo-subtitle font-semibold", scoreToneClass(result.final_grade)].join(" ")}>
                  매칭률 {Math.round(result.total_score)}%
                </div>
                <div className="ob-typo-caption text-(--oboon-text-muted)">조건 적합도</div>
              </div>
              <Badge variant={gradeMeta(result.final_grade).badgeVariant}>
                {gradeMeta(result.final_grade).label}
              </Badge>
            </div>
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

          {categories || shouldShowDetailedMetrics || isMasked ? (
            <Button
              className="mt-3 w-full"
              variant="secondary"
              size="sm"
              onClick={() => setShowResultDetails((prev) => !prev)}
            >
              {showResultDetails ? "상세 결과 숨기기" : "상세 결과 보기"}
            </Button>
          ) : null}

          {showResultDetails && categories ? (
            <div className="mt-3">
              <div className="ob-typo-caption text-(--oboon-text-muted)">카테고리 결과</div>
              <div className="relative mt-2">
                <div className={isMasked ? "pointer-events-none select-none blur-[6px]" : ""}>
                  <div className="space-y-2">
                    <div className={`rounded-md border p-2 ${categoryCardClass(categories.cash.grade)}`}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="ob-typo-body font-semibold text-(--oboon-text-title)">자금</span>
                        <div className="flex items-center gap-2">
                          <span className="ob-typo-caption font-semibold text-(--oboon-text-title)">
                            {categories.cash.score ?? 0} / {categories.cash.max_score}
                          </span>
                          <Badge variant="status">
                            {gradeMeta(categories.cash.grade).label}
                          </Badge>
                        </div>
                      </div>
                      <p className="mt-1 ob-typo-caption text-(--oboon-text-muted)">
                        {categories.cash.reason_message ?? "로그인 후 자금 분석을 확인할 수 있어요."}
                      </p>
                    </div>

                    <div className={`rounded-md border p-2 ${categoryCardClass(categories.burden.grade)}`}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="ob-typo-body font-semibold text-(--oboon-text-title)">월 부담</span>
                        <div className="flex items-center gap-2">
                          <span className="ob-typo-caption font-semibold text-(--oboon-text-title)">
                            {categories.burden.score ?? 0} / {categories.burden.max_score}
                          </span>
                          <Badge variant="status">
                            {gradeMeta(categories.burden.grade).label}
                          </Badge>
                        </div>
                      </div>
                      <p className="mt-1 ob-typo-caption text-(--oboon-text-muted)">
                        {categories.burden.reason_message ?? "로그인 후 월부담 분석을 확인할 수 있어요."}
                      </p>
                    </div>

                    <div className={`rounded-md border p-2 ${categoryCardClass(categories.risk.grade)}`}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="ob-typo-body font-semibold text-(--oboon-text-title)">리스크</span>
                        <div className="flex items-center gap-2">
                          <span className="ob-typo-caption font-semibold text-(--oboon-text-title)">
                            {categories.risk.score ?? 0} / {categories.risk.max_score}
                          </span>
                          <Badge variant="status">
                            {gradeMeta(categories.risk.grade).label}
                          </Badge>
                        </div>
                      </div>
                      <p className="mt-1 ob-typo-caption text-(--oboon-text-muted)">
                        {categories.risk.reason_message ?? "로그인 후 리스크 분석을 확인할 수 있어요."}
                      </p>
                    </div>
                  </div>
                </div>

                {isMasked ? (
                  <button
                    type="button"
                    onClick={onLoginRequest}
                    className="absolute inset-0 flex items-center justify-center rounded-xl border border-dashed border-(--oboon-border-default) bg-black/45 px-4 text-center backdrop-blur-[1px]"
                  >
                    <div>
                      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white">
                        <Lock className="h-4 w-4" />
                      </div>
                      <p className="mt-2 ob-typo-body font-semibold text-white">
                        로그인하면 상세 분석을 볼 수 있어요
                      </p>
                      <p className="mt-1 ob-typo-caption text-white/75">
                        상세 분석과 판단 근거를 바로 확인할 수 있습니다.
                      </p>
                    </div>
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}

          {showResultDetails && (shouldShowDetailedMetrics || isMasked) ? (
            <div className="relative mt-3">
              <div className={isMasked ? "pointer-events-none select-none blur-[6px]" : ""}>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-2">
                    <div className="ob-typo-caption text-(--oboon-text-muted)">최소 필요 현금</div>
                    <div className="mt-1 ob-typo-body text-(--oboon-text-title)">
                      {metrics?.min_cash == null ? "비공개" : formatManwonWithEok(metrics.min_cash)}
                    </div>
                  </div>
                  <div className="rounded-lg border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-2">
                    <div className="ob-typo-caption text-(--oboon-text-muted)">권장 현금</div>
                    <div className="mt-1 ob-typo-body text-(--oboon-text-title)">
                      {metrics?.recommended_cash == null ? "비공개" : formatManwonWithEok(metrics.recommended_cash)}
                    </div>
                  </div>
                  <div className="rounded-lg border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-2">
                    <div className="ob-typo-caption text-(--oboon-text-muted)">예상 월상환</div>
                    <div className="mt-1 ob-typo-body text-(--oboon-text-title)">
                      {metrics?.monthly_payment_est == null ? "비공개" : formatManwonWithEok(metrics.monthly_payment_est)}
                    </div>
                  </div>
                  <div className="rounded-lg border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-2">
                    <div className="ob-typo-caption text-(--oboon-text-muted)">월 부담률</div>
                    <div className="mt-1 ob-typo-body text-(--oboon-text-title)">
                      {monthlyBurdenPercentLabel}
                    </div>
                  </div>
                </div>
              </div>

              {isMasked ? (
                <button
                  type="button"
                  onClick={onLoginRequest}
                  className="absolute inset-0 flex items-center justify-center rounded-xl border border-dashed border-(--oboon-border-default) bg-black/45 px-4 text-center backdrop-blur-[1px]"
                >
                  <div>
                    <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white">
                      <Lock className="h-4 w-4" />
                    </div>
                    <p className="mt-2 ob-typo-body font-semibold text-white">
                      로그인하면 상세 분석을 볼 수 있어요
                    </p>
                  </div>
                </button>
              ) : null}
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
