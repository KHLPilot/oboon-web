"use client";

import { Lock } from "lucide-react";
import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import Select from "@/components/ui/Select";
import { calculateLtvDsrPreview } from "@/features/condition-validation/domain/ltvDsrCalculator";
import type {
  CardLoanUsage,
  CreditGrade,
  DelinquencyCount,
  ExistingLoanAmount,
  LoanRejection,
  LtvDsrInput,
  MonthlyIncomeRange,
  MonthlyLoanRepayment,
} from "@/features/condition-validation/domain/types";
import type { RecommendationCondition } from "@/features/recommendations/hooks/useRecommendations";
import { cn } from "@/lib/utils/cn";

const LABEL = "mb-1.5 block ob-typo-caption text-(--oboon-text-muted)";

const LOAN_OPTIONS: Array<{ value: ExistingLoanAmount; label: string }> = [
  { value: "none", label: "없음" },
  { value: "under_1eok", label: "1억 이하" },
  { value: "1to3eok", label: "1억~3억" },
  { value: "over_3eok", label: "3억 이상" },
];

const DELINQUENCY_OPTIONS: Array<{ value: DelinquencyCount; label: string }> = [
  { value: "none", label: "없음" },
  { value: "once", label: "1회" },
  { value: "twice_or_more", label: "2회 이상" },
];

const CARD_LOAN_OPTIONS: Array<{ value: CardLoanUsage; label: string }> = [
  { value: "none", label: "없음" },
  { value: "1to2", label: "1~2회" },
  { value: "3_or_more", label: "3회 이상" },
];

const LOAN_REJECTION_OPTIONS: Array<{ value: LoanRejection; label: string }> = [
  { value: "none", label: "없음" },
  { value: "yes", label: "있음" },
];

const INCOME_RANGE_OPTIONS: Array<{ value: MonthlyIncomeRange; label: string }> = [
  { value: "under_200", label: "200만 이하" },
  { value: "200to300", label: "200~300만" },
  { value: "300to500", label: "300~500만" },
  { value: "500to700", label: "500~700만" },
  { value: "over_700", label: "700만 이상" },
];

const REPAYMENT_OPTIONS: Array<{ value: MonthlyLoanRepayment; label: string }> = [
  { value: "none", label: "없음" },
  { value: "under_50", label: "50만 이하" },
  { value: "50to100", label: "50~100만" },
  { value: "100to200", label: "100~200만" },
  { value: "over_200", label: "200만 이상" },
];

const CREDIT_OPTIONS: Array<{ value: CreditGrade; label: string }> = [
  { value: "good", label: "양호" },
  { value: "normal", label: "보통" },
  { value: "unstable", label: "불안정" },
];

function gradeColor(points: number, max: number): string {
  const pct = points / max;
  if (pct >= 0.8) return "var(--oboon-grade-green)";
  if (pct >= 0.6) return "var(--oboon-grade-lime)";
  if (pct >= 0.4) return "var(--oboon-grade-yellow)";
  if (pct >= 0.2) return "var(--oboon-grade-orange)";
  return "var(--oboon-grade-red)";
}

function compactPreviewLabel(label: string): string {
  switch (label) {
    case "대출 가능성 높음":
      return "높음";
    case "대출 가능 보통":
      return "보통";
    case "대출 가능 낮음":
      return "낮음";
    case "대출 확인 필요":
      return "확인";
    case "대출 불가능":
      return "불가";
    case "위험":
      return "주의";
    case "LTV+DSR":
      return "종합";
    default:
      return label;
  }
}

function guestCreditGradeToScore(grade: CreditGrade): number {
  if (grade === "good") return 80;
  if (grade === "normal") return 55;
  return 20;
}

function guestCreditGradeFromCondition(
  condition: RecommendationCondition,
): CreditGrade | "" {
  if (condition.ltvInternalScore <= 0) return "";
  if (condition.ltvInternalScore >= guestCreditGradeToScore("good")) return "good";
  if (condition.ltvInternalScore >= guestCreditGradeToScore("normal")) {
    return "normal";
  }
  return "unstable";
}

function buildPreviewInput(condition: RecommendationCondition): LtvDsrInput {
  const hasLoan =
    condition.existingLoan !== null && condition.existingLoan !== "none";

  return {
    houseOwnership: condition.houseOwnership ?? "none",
    existingLoan: condition.existingLoan ?? "none",
    recentDelinquency: hasLoan
      ? (condition.recentDelinquency ?? "none")
      : "none",
    cardLoanUsage: condition.cardLoanUsage ?? "none",
    loanRejection: hasLoan ? (condition.loanRejection ?? "none") : "none",
    employmentType: condition.employmentType ?? "employee",
    monthlyIncomeRange: condition.monthlyIncomeRange ?? "300to500",
    existingMonthlyRepayment: condition.existingMonthlyRepayment,
  };
}

function isReadyForLtvScore(condition: RecommendationCondition): boolean {
  const hasLoan =
    condition.existingLoan !== null && condition.existingLoan !== "none";

  return (
    condition.existingLoan !== null &&
    condition.cardLoanUsage !== null &&
    condition.monthlyIncomeRange !== null &&
    (!hasLoan ||
      (condition.recentDelinquency !== null && condition.loanRejection !== null))
  );
}

function ProgressiveSlot({
  visible,
  children,
}: {
  visible: boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const prevVisible = useRef(visible);

  useEffect(() => {
    if (!prevVisible.current && visible && ref.current) {
      const timer = setTimeout(() => {
        ref.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 150);
      return () => clearTimeout(timer);
    }
    prevVisible.current = visible;
  }, [visible]);

  return (
    <div
      ref={ref}
      className={cn(
        "grid transition-all duration-300 ease-out",
        visible
          ? "grid-rows-[1fr] opacity-100"
          : "grid-rows-[0fr] opacity-0 pointer-events-none select-none",
      )}
    >
      <div className="overflow-hidden">
        <div className="pb-1">{children}</div>
      </div>
    </div>
  );
}

type Props = {
  condition: RecommendationCondition;
  isLoggedIn: boolean;
  onChange: (patch: Partial<RecommendationCondition>) => void;
  onNext: () => void;
  onBack: () => void;
  onLoginAndSave?: () => void | Promise<void>;
  onReset: () => void;
  progressive?: boolean;
};

export default function ConditionWizardStep2({
  condition,
  isLoggedIn,
  onChange,
  onNext,
  onBack,
  onLoginAndSave,
  onReset,
  progressive = false,
}: Props) {
  const hasLoan =
    condition.existingLoan !== null && condition.existingLoan !== "none";
  const isReady = isLoggedIn ? isReadyForLtvScore(condition) : true;
  const preview = calculateLtvDsrPreview(buildPreviewInput(condition), 0);
  const showPreview =
    condition.existingLoan !== null && condition.monthlyIncomeRange !== null;
  const guestCreditGrade = guestCreditGradeFromCondition(condition);

  const patchLoggedIn = (patch: Partial<RecommendationCondition>) => {
    const nextCondition: RecommendationCondition = {
      ...condition,
      ...patch,
    };
    const nextHasLoan =
      nextCondition.existingLoan !== null && nextCondition.existingLoan !== "none";
    const normalizedPatch: Partial<RecommendationCondition> = {
      ...patch,
      recentDelinquency: nextHasLoan
        ? nextCondition.recentDelinquency
        : null,
      loanRejection: nextHasLoan ? nextCondition.loanRejection : null,
    };
    const normalizedNextCondition: RecommendationCondition = {
      ...nextCondition,
      recentDelinquency: normalizedPatch.recentDelinquency ?? null,
      loanRejection: normalizedPatch.loanRejection ?? null,
    };

    onChange({
      ...normalizedPatch,
      ltvInternalScore: isReadyForLtvScore(normalizedNextCondition)
        ? calculateLtvDsrPreview(buildPreviewInput(normalizedNextCondition), 0)
            .ltvInternalScore
        : 0,
    });
  };

  const handleGuestCreditChange = (creditGrade: CreditGrade) => {
    onChange({
      creditGrade,
      ltvInternalScore: guestCreditGradeToScore(creditGrade),
    });
  };

  if (!isLoggedIn && progressive) {
    const showGuestCard = guestCreditGrade !== "";
    const showGuestActions = guestCreditGrade !== "";

    return (
      <div className="space-y-5">
        <div className="space-y-0.5">
          <div className="flex items-start justify-between gap-3">
            <p className="ob-typo-subtitle font-semibold text-(--oboon-text-title)">
              신용 / 대출
            </p>
            <button
              type="button"
              onClick={onReset}
              className="shrink-0 ob-typo-caption text-(--oboon-text-muted) transition-colors hover:text-(--oboon-text-body)"
            >
              전체 초기화
            </button>
          </div>
          <p className="ob-typo-caption text-(--oboon-text-muted)">
            대출 가능성을 평가합니다.
          </p>
        </div>

        <ProgressiveSlot visible={true}>
          <div className="space-y-2 rounded-xl border border-(--oboon-border-default) p-3">
            <span className={LABEL}>신용 상태</span>
            <Select<CreditGrade>
              value={guestCreditGrade as CreditGrade}
              onChange={handleGuestCreditChange}
              options={CREDIT_OPTIONS}
            />
          </div>
        </ProgressiveSlot>

        <ProgressiveSlot visible={showGuestCard}>
          <div className="rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle) p-4">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-(--oboon-border-default) bg-(--oboon-bg-elevated)">
                <Lock className="h-4 w-4 text-(--oboon-text-muted)" />
              </div>
              <div>
                <p className="ob-typo-body font-semibold text-(--oboon-text-title)">
                  정밀 신용 평가
                </p>
                <p className="ob-typo-caption text-(--oboon-text-muted)">
                  로그인하면 실제 대출 리스크를 더 자세히 반영합니다.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                "현재 대출",
                "연체 이력",
                "카드론 사용",
                "대출 거절 경험",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-lg border border-(--oboon-border-default) bg-(--oboon-bg-surface) px-3 py-2"
                >
                  <div className="ob-typo-caption font-medium text-(--oboon-text-title)">
                    {item}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 flex flex-col items-center gap-2 text-center">
              <p className="ob-typo-caption text-(--oboon-text-muted)">
                기본 신용 상태만으로는 대략적인 판단만 가능합니다.
              </p>
              <button
                type="button"
                onClick={() => void onLoginAndSave?.()}
                className="inline-flex h-10 items-center justify-center rounded-full bg-(--oboon-primary) px-4 text-white ob-typo-button"
              >
                로그인하고 정밀 신용 평가 열기
              </button>
            </div>
          </div>
        </ProgressiveSlot>

        <ProgressiveSlot visible={showGuestActions}>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onBack}
              className="h-10 flex-1 rounded-full border border-(--oboon-border-default) ob-typo-button text-(--oboon-text-muted)"
            >
              이전
            </button>
            <button
              type="button"
              onClick={onNext}
              className="h-10 flex-1 rounded-full bg-(--oboon-primary) text-white ob-typo-button"
            >
              다음
            </button>
          </div>
        </ProgressiveSlot>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="space-y-4">
        <div>
          <p className="ob-typo-subtitle font-semibold text-(--oboon-text-title)">
            신용 / 대출
          </p>
        </div>

        <div className="space-y-2 rounded-xl border border-(--oboon-border-default) p-3">
          <span className={LABEL}>신용 상태</span>
          <Select<CreditGrade>
            value={guestCreditGrade as CreditGrade}
            onChange={handleGuestCreditChange}
            options={CREDIT_OPTIONS}
          />
        </div>

        <div className="rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle) p-4">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-(--oboon-border-default) bg-(--oboon-bg-elevated)">
              <Lock className="h-4 w-4 text-(--oboon-text-muted)" />
            </div>
            <div>
              <p className="ob-typo-body font-semibold text-(--oboon-text-title)">
                정밀 신용 평가
              </p>
              <p className="ob-typo-caption text-(--oboon-text-muted)">
                로그인하면 실제 대출 리스크를 더 자세히 반영합니다.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {[
              "현재 대출",
              "연체 이력",
              "카드론 사용",
              "대출 거절 경험",
            ].map((item) => (
              <div
                key={item}
                className="rounded-lg border border-(--oboon-border-default) bg-(--oboon-bg-surface) px-3 py-2"
              >
                <div className="ob-typo-caption font-medium text-(--oboon-text-title)">
                  {item}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 flex flex-col items-center gap-2 text-center">
            <p className="ob-typo-caption text-(--oboon-text-muted)">
              기본 신용 상태만으로는 대략적인 판단만 가능합니다.
            </p>
            <button
              type="button"
              onClick={() => void onLoginAndSave?.()}
              className="inline-flex h-10 items-center justify-center rounded-full bg-(--oboon-primary) px-4 text-white ob-typo-button"
            >
              로그인하고 정밀 신용 평가 열기
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onBack}
            className="h-10 flex-1 rounded-full border border-(--oboon-border-default) ob-typo-button text-(--oboon-text-muted)"
          >
            이전
          </button>
          <button
            type="button"
            onClick={onNext}
            className="h-10 flex-1 rounded-full bg-(--oboon-primary) text-white ob-typo-button"
          >
            다음
          </button>
        </div>
      </div>
    );
  }

  if (progressive) {
    const showCardLoan = condition.existingLoan !== null;
    const showDelinquency =
      condition.cardLoanUsage !== null && hasLoan;
    const showRejection =
      condition.recentDelinquency !== null && hasLoan;
    const showIncomeRange =
      condition.cardLoanUsage !== null &&
      (hasLoan ? condition.loanRejection !== null : true);
    const showRepayment = condition.monthlyIncomeRange !== null;

    return (
      <div className="space-y-5">
        <div className="space-y-0.5">
          <div className="flex items-start justify-between gap-3">
            <p className="ob-typo-subtitle font-semibold text-(--oboon-text-title)">
              신용 / 대출
            </p>
            <button
              type="button"
              onClick={onReset}
              className="shrink-0 ob-typo-caption text-(--oboon-text-muted) transition-colors hover:text-(--oboon-text-body)"
            >
              전체 초기화
            </button>
          </div>
          <p className="ob-typo-caption text-(--oboon-text-muted)">
            대출 가능성을 평가합니다.
          </p>
        </div>

        <ProgressiveSlot visible={true}>
          <div>
            <span className={LABEL}>1. 현재 대출</span>
            <Select<ExistingLoanAmount>
              value={(condition.existingLoan ?? "") as ExistingLoanAmount}
              onChange={(existingLoan) => patchLoggedIn({ existingLoan })}
              options={LOAN_OPTIONS}
            />
          </div>
        </ProgressiveSlot>

        <ProgressiveSlot visible={showCardLoan}>
          <div>
            <span className={LABEL}>2. 카드론 / 현금서비스 사용</span>
            <Select<CardLoanUsage>
              value={(condition.cardLoanUsage ?? "") as CardLoanUsage}
              onChange={(cardLoanUsage) => patchLoggedIn({ cardLoanUsage })}
              options={CARD_LOAN_OPTIONS}
            />
          </div>
        </ProgressiveSlot>

        {hasLoan ? (
          <>
            <ProgressiveSlot visible={showDelinquency}>
              <div>
                <span className={LABEL}>3. 최근 1년 대출 연체</span>
                <Select<DelinquencyCount>
                  value={(condition.recentDelinquency ?? "") as DelinquencyCount}
                  onChange={(recentDelinquency) =>
                    patchLoggedIn({ recentDelinquency })
                  }
                  options={DELINQUENCY_OPTIONS}
                />
              </div>
            </ProgressiveSlot>

            <ProgressiveSlot visible={showRejection}>
              <div>
                <span className={LABEL}>4. 대출 심사 거절 경험</span>
                <Select<LoanRejection>
                  value={(condition.loanRejection ?? "") as LoanRejection}
                  onChange={(loanRejection) => patchLoggedIn({ loanRejection })}
                  options={LOAN_REJECTION_OPTIONS}
                />
              </div>
            </ProgressiveSlot>
          </>
        ) : null}

        <ProgressiveSlot visible={showIncomeRange}>
          <div>
            <span className={LABEL}>5. 월 평균 세후 소득</span>
            <Select<MonthlyIncomeRange>
              value={(condition.monthlyIncomeRange ?? "") as MonthlyIncomeRange}
              onChange={(monthlyIncomeRange) =>
                patchLoggedIn({ monthlyIncomeRange })
              }
              options={INCOME_RANGE_OPTIONS}
            />
          </div>
        </ProgressiveSlot>

        <ProgressiveSlot visible={showRepayment}>
          <div>
            <span className={LABEL}>6. 월 대출 상환액</span>
            <Select<MonthlyLoanRepayment>
              value={condition.existingMonthlyRepayment}
              onChange={(existingMonthlyRepayment) =>
                patchLoggedIn({ existingMonthlyRepayment })
              }
              options={REPAYMENT_OPTIONS}
            />
          </div>
        </ProgressiveSlot>

        <div className="rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle) p-3">
          <div className="mb-2 ob-typo-body font-semibold text-(--oboon-text-title)">
            평가 결과 미리보기
          </div>
          {showPreview ? (
            <>
              <div className="grid grid-cols-3 gap-2 text-center">
                {(
                  [
                    {
                      label: "LTV",
                      value: preview.ltvPoints,
                      max: 10,
                      result: compactPreviewLabel(preview.ltvLabel),
                    },
                    {
                      label: "DSR",
                      value: preview.dsrPoints,
                      max: 10,
                      result: compactPreviewLabel(preview.dsrLabel),
                    },
                    {
                      label: "합산",
                      value: preview.totalPoints,
                      max: 20,
                      result: compactPreviewLabel("LTV+DSR"),
                    },
                  ] as const
                ).map(({ label, value, max, result }) => (
                  <div
                    key={label}
                    className="rounded-lg border border-(--oboon-border-default) bg-(--oboon-bg-surface) px-2 py-2.5"
                  >
                    <div className="ob-typo-caption text-(--oboon-text-muted)">
                      {label}
                    </div>
                    <div
                      className="mt-1 ob-typo-caption font-semibold"
                      style={{ color: gradeColor(value, max) }}
                    >
                      {result}
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-2 ob-typo-caption text-(--oboon-text-muted) leading-tight">
                * DSR는 현장 대출 조건 기준으로 최종 계산됩니다. 이 수치는 근사값입니다.
              </p>
            </>
          ) : (
            <div className="py-4 text-center ob-typo-caption text-(--oboon-text-muted)">
              현재 대출과 월 소득을 선택하면 결과가 표시됩니다
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onBack}
            className="h-10 flex-1 rounded-full border border-(--oboon-border-default) ob-typo-button text-(--oboon-text-muted)"
          >
            이전
          </button>
          <button
            type="button"
            disabled={!isReady}
            onClick={onNext}
            className="h-10 flex-1 rounded-full bg-(--oboon-primary) text-white ob-typo-button disabled:cursor-not-allowed disabled:opacity-40"
          >
            다음 단계 →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-0.5">
        <div className="flex items-start justify-between gap-3">
          <p className="ob-typo-subtitle font-semibold text-(--oboon-text-title)">
            신용 / 대출
          </p>
          <button
            type="button"
            onClick={onReset}
            className="shrink-0 ob-typo-caption text-(--oboon-text-muted) transition-colors hover:text-(--oboon-text-body)"
          >
            전체 초기화
          </button>
        </div>
        <p className="ob-typo-caption text-(--oboon-text-muted)">
          대출 가능성을 평가합니다.
        </p>
      </div>

      <div className="space-y-3">
        {hasLoan ? (
          <>
            <div>
              <span className={LABEL}>1. 현재 대출</span>
              <Select<ExistingLoanAmount>
                value={(condition.existingLoan ?? "") as ExistingLoanAmount}
                onChange={(existingLoan) => patchLoggedIn({ existingLoan })}
                options={LOAN_OPTIONS}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 xs:grid-cols-2">
              <div>
                <span className={LABEL}>2. 최근 1년 대출 연체</span>
                <Select<DelinquencyCount>
                  value={(condition.recentDelinquency ?? "") as DelinquencyCount}
                  onChange={(recentDelinquency) =>
                    patchLoggedIn({ recentDelinquency })
                  }
                  options={DELINQUENCY_OPTIONS}
                />
              </div>
              <div>
                <span className={LABEL}>3. 대출 심사 거절 경험</span>
                <Select<LoanRejection>
                  value={(condition.loanRejection ?? "") as LoanRejection}
                  onChange={(loanRejection) => patchLoggedIn({ loanRejection })}
                  options={LOAN_REJECTION_OPTIONS}
                />
              </div>
            </div>

            <div>
              <span className={LABEL}>4. 카드론 / 현금서비스</span>
              <Select<CardLoanUsage>
                value={(condition.cardLoanUsage ?? "") as CardLoanUsage}
                onChange={(cardLoanUsage) => patchLoggedIn({ cardLoanUsage })}
                options={CARD_LOAN_OPTIONS}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 xs:grid-cols-2">
              <div>
                <span className={LABEL}>5. 월 평균 세후 소득</span>
                <Select<MonthlyIncomeRange>
                  value={(condition.monthlyIncomeRange ?? "") as MonthlyIncomeRange}
                  onChange={(monthlyIncomeRange) =>
                    patchLoggedIn({ monthlyIncomeRange })
                  }
                  options={INCOME_RANGE_OPTIONS}
                />
              </div>
              <div>
                <span className={LABEL}>6. 월 대출 상환액</span>
                <Select<MonthlyLoanRepayment>
                  value={condition.existingMonthlyRepayment}
                  onChange={(existingMonthlyRepayment) =>
                    patchLoggedIn({ existingMonthlyRepayment })
                  }
                  options={REPAYMENT_OPTIONS}
                />
              </div>
            </div>
          </>
        ) : (
          <>
            <div>
              <div>
                <span className={LABEL}>1. 현재 대출</span>
                <Select<ExistingLoanAmount>
                  value={(condition.existingLoan ?? "") as ExistingLoanAmount}
                  onChange={(existingLoan) => patchLoggedIn({ existingLoan })}
                  options={LOAN_OPTIONS}
                />
              </div>
            </div>

            <div>
              <span className={LABEL}>2. 카드론 / 현금서비스 사용</span>
              <Select<CardLoanUsage>
                value={(condition.cardLoanUsage ?? "") as CardLoanUsage}
                onChange={(cardLoanUsage) => patchLoggedIn({ cardLoanUsage })}
                options={CARD_LOAN_OPTIONS}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 xs:grid-cols-2">
              <div>
                <span className={LABEL}>3. 월 평균 세후 소득</span>
                <Select<MonthlyIncomeRange>
                  value={(condition.monthlyIncomeRange ?? "") as MonthlyIncomeRange}
                  onChange={(monthlyIncomeRange) =>
                    patchLoggedIn({ monthlyIncomeRange })
                  }
                  options={INCOME_RANGE_OPTIONS}
                />
              </div>
              <div>
                <span className={LABEL}>4. 월 대출 상환액</span>
                <Select<MonthlyLoanRepayment>
                  value={condition.existingMonthlyRepayment}
                  onChange={(existingMonthlyRepayment) =>
                    patchLoggedIn({ existingMonthlyRepayment })
                  }
                  options={REPAYMENT_OPTIONS}
                />
              </div>
            </div>
          </>
        )}
      </div>

      <div className="rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle) p-3">
        <div className="mb-2 ob-typo-body font-semibold text-(--oboon-text-title)">
          평가 결과 미리보기
        </div>
        {showPreview ? (
          <>
            <div className="grid grid-cols-3 gap-2 text-center">
              {(
                [
                  {
                    label: "LTV",
                    value: preview.ltvPoints,
                    max: 10,
                    result: compactPreviewLabel(preview.ltvLabel),
                  },
                  {
                    label: "DSR",
                    value: preview.dsrPoints,
                    max: 10,
                    result: compactPreviewLabel(preview.dsrLabel),
                  },
                  {
                    label: "합산",
                    value: preview.totalPoints,
                    max: 20,
                    result: compactPreviewLabel("LTV+DSR"),
                  },
                ] as const
              ).map(({ label, value, max, result }) => (
                <div
                  key={label}
                  className="rounded-lg border border-(--oboon-border-default) bg-(--oboon-bg-surface) px-2 py-2.5"
                >
                  <div className="ob-typo-caption text-(--oboon-text-muted)">
                    {label}
                  </div>
                  <div
                    className="mt-1 ob-typo-caption font-semibold"
                    style={{ color: gradeColor(value, max) }}
                  >
                    {result}
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-2 ob-typo-caption text-(--oboon-text-muted) leading-tight">
              * DSR는 현장 대출 조건 기준으로 최종 계산됩니다. 이 수치는 근사값입니다.
            </p>
          </>
        ) : (
          <div className="py-4 text-center ob-typo-caption text-(--oboon-text-muted)">
            현재 대출과 월 소득을 선택하면 결과가 표시됩니다
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onBack}
          className="h-10 flex-1 rounded-full border border-(--oboon-border-default) ob-typo-button text-(--oboon-text-muted)"
        >
          이전
        </button>
        <button
          type="button"
          disabled={!isReady}
          onClick={onNext}
          className="h-10 flex-1 rounded-full bg-(--oboon-primary) text-white ob-typo-button disabled:cursor-not-allowed disabled:opacity-40"
        >
          다음 단계 →
        </button>
      </div>
    </div>
  );
}
