"use client";

import { Lock } from "lucide-react";
import Select from "@/components/ui/Select";
import { calculateLtvDsrPreview } from "@/features/condition-validation/domain/ltvDsrCalculator";
import type {
  CardLoanUsage,
  CreditGrade,
  DelinquencyCount,
  EmploymentType,
  ExistingLoanAmount,
  LoanRejection,
  LtvDsrInput,
  MonthlyIncomeRange,
  MonthlyLoanRepayment,
} from "@/features/condition-validation/domain/types";
import type { RecommendationCondition } from "@/features/recommendations/hooks/useRecommendations";

const LABEL = "mb-1.5 block ob-typo-caption text-(--oboon-text-muted)";

const HOUSE_OPTIONS = [
  { value: "none" as const, label: "무주택" },
  { value: "one" as const, label: "1주택" },
  { value: "two_or_more" as const, label: "2주택 이상" },
];

const EMPLOYMENT_OPTIONS: Array<{ value: EmploymentType; label: string }> = [
  { value: "employee", label: "직장인(고정급)" },
  { value: "self_employed", label: "자영업" },
  { value: "freelancer", label: "프리랜서" },
  { value: "other", label: "기타" },
];

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

function guestCreditGradeToScore(grade: CreditGrade): number {
  if (grade === "good") return 80;
  if (grade === "normal") return 55;
  return 20;
}

function guestCreditGradeFromCondition(
  condition: RecommendationCondition,
): CreditGrade {
  if (condition.ltvInternalScore <= 0) return "good";
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

type Props = {
  condition: RecommendationCondition;
  isLoggedIn: boolean;
  onChange: (patch: Partial<RecommendationCondition>) => void;
  onNext: () => void;
  onBack: () => void;
  onLoginAndSave?: () => void | Promise<void>;
};

export default function ConditionWizardStep2({
  condition,
  isLoggedIn,
  onChange,
  onNext,
  onBack,
  onLoginAndSave,
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
            value={guestCreditGrade}
            onChange={handleGuestCreditChange}
            options={CREDIT_OPTIONS}
          />
        </div>

        <div className="flex flex-col items-center gap-2 rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle) p-4 text-center">
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-(--oboon-border-default) bg-(--oboon-bg-elevated)">
            <Lock className="h-4 w-4 text-(--oboon-text-muted)" />
          </div>
          <p className="ob-typo-caption font-semibold text-(--oboon-text-title)">
            로그인하면 더 정확한 신용 평가를 받을 수 있어요
          </p>
          <button
            type="button"
            onClick={() => void onLoginAndSave?.()}
            className="ob-typo-caption text-(--oboon-primary) underline"
          >
            로그인하고 계속
          </button>
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
            건너뛰기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="ob-typo-subtitle font-semibold text-(--oboon-text-title)">
          신용 / 대출
        </p>
        <p className="mt-0.5 ob-typo-caption text-(--oboon-text-muted)">
          대출 가능성을 평가합니다. 주택·직업 정보는 자동 연동됩니다.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 xs:grid-cols-2">
        <div>
          <span className={LABEL}>
            보유 주택 <span className="opacity-60">(자동 연동)</span>
          </span>
          <Select
            value={
              (condition.houseOwnership ?? "") as
                | "none"
                | "one"
                | "two_or_more"
            }
            onChange={() => {}}
            disabled
            options={HOUSE_OPTIONS}
          />
        </div>
        <div>
          <span className={LABEL}>
            직업 형태 <span className="opacity-60">(자동 연동)</span>
          </span>
          <Select
            value={(condition.employmentType ?? "") as EmploymentType}
            onChange={() => {}}
            disabled
            options={EMPLOYMENT_OPTIONS}
          />
        </div>
      </div>

      <div className="space-y-3">
        {hasLoan ? (
          <>
            <div className="grid grid-cols-1 gap-3 xs:grid-cols-2 md:grid-cols-3">
              <div>
                <span className={LABEL}>1. 현재 대출</span>
                <Select<ExistingLoanAmount>
                  value={(condition.existingLoan ?? "") as ExistingLoanAmount}
                  onChange={(existingLoan) => patchLoggedIn({ existingLoan })}
                  options={LOAN_OPTIONS}
                />
              </div>
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
                <span className={LABEL}>3. 카드론 / 현금서비스</span>
                <Select<CardLoanUsage>
                  value={(condition.cardLoanUsage ?? "") as CardLoanUsage}
                  onChange={(cardLoanUsage) => patchLoggedIn({ cardLoanUsage })}
                  options={CARD_LOAN_OPTIONS}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 xs:grid-cols-2 md:grid-cols-3">
              <div>
                <span className={LABEL}>4. 대출 심사 거절 경험</span>
                <Select<LoanRejection>
                  value={(condition.loanRejection ?? "") as LoanRejection}
                  onChange={(loanRejection) => patchLoggedIn({ loanRejection })}
                  options={LOAN_REJECTION_OPTIONS}
                />
              </div>
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
            <div className="grid grid-cols-1 gap-3">
              <div>
                <span className={LABEL}>1. 현재 대출</span>
                <Select<ExistingLoanAmount>
                  value={(condition.existingLoan ?? "") as ExistingLoanAmount}
                  onChange={(existingLoan) => patchLoggedIn({ existingLoan })}
                  options={LOAN_OPTIONS}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 xs:grid-cols-2 md:grid-cols-3">
              <div>
                <span className={LABEL}>2. 카드론 / 현금서비스 사용</span>
                <Select<CardLoanUsage>
                  value={(condition.cardLoanUsage ?? "") as CardLoanUsage}
                  onChange={(cardLoanUsage) => patchLoggedIn({ cardLoanUsage })}
                  options={CARD_LOAN_OPTIONS}
                />
              </div>
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
                    label: "LTV 점수",
                    value: preview.ltvPoints,
                    max: 10,
                    sub: preview.ltvLabel,
                  },
                  {
                    label: "DSR 점수",
                    value: preview.dsrPoints,
                    max: 10,
                    sub: preview.dsrLabel,
                  },
                  {
                    label: "합산",
                    value: preview.totalPoints,
                    max: 20,
                    sub: "LTV+DSR",
                  },
                ] as const
              ).map(({ label, value, max, sub }) => (
                <div
                  key={label}
                  className="rounded-lg border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-2"
                >
                  <div className="ob-typo-caption text-(--oboon-text-muted)">
                    {label}
                  </div>
                  <div
                    className="mt-1 ob-typo-subtitle font-bold"
                    style={{ color: gradeColor(value, max) }}
                  >
                    {value}점
                  </div>
                  <div
                    className="ob-typo-caption"
                    style={{ color: gradeColor(value, max) }}
                  >
                    {sub}
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-2 ob-typo-caption text-(--oboon-text-muted)">
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
