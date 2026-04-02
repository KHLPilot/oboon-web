"use client";

import { useMemo, useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import { EMPTY_LTV_DSR_PERSISTED_VALUES } from "@/features/condition-validation/domain/types";
import type {
  CardLoanUsage,
  DelinquencyCount,
  EmploymentType,
  ExistingLoanAmount,
  LoanRejection,
  LtvDsrInput,
  LtvDsrPersistedValues,
  LtvDsrPreview,
  MonthlyIncomeRange,
  MonthlyLoanRepayment,
} from "@/features/condition-validation/domain/types";
import { calculateLtvDsrPreview } from "@/features/condition-validation/domain/ltvDsrCalculator";

type LtvDsrModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: (result: {
    ltvInternalScore: number;
    ltvPoints: number;
    existingMonthlyRepayment: MonthlyLoanRepayment;
    formValues: LtvDsrPersistedValues;
  }) => void;
  initialEmploymentType: EmploymentType | null;
  initialHouseOwnership: "none" | "one" | "two_or_more" | null;
  estimatedNewLoanPaymentManwon?: number;
  initialValues?: LtvDsrPersistedValues;
  initialLtvInternalScore?: number;
};

type LtvDsrModalBodyProps = Omit<LtvDsrModalProps, "open"> & {
  estimatedNewLoanPaymentManwon: number;
  initialValues: LtvDsrPersistedValues;
  initialLtvInternalScore: number;
};

const HOUSE_OWNERSHIP_OPTIONS = [
  { value: "none" as const, label: "무주택" },
  { value: "one" as const, label: "1주택" },
  { value: "two_or_more" as const, label: "2주택 이상" },
];

const EMPLOYMENT_TYPE_OPTIONS = [
  { value: "employee" as const, label: "직장인(고정급)" },
  { value: "self_employed" as const, label: "자영업" },
  { value: "freelancer" as const, label: "프리랜서" },
  { value: "other" as const, label: "기타" },
];

const LOAN_OPTIONS: { value: ExistingLoanAmount; label: string }[] = [
  { value: "none", label: "없음" },
  { value: "under_1eok", label: "1억 이하" },
  { value: "1to3eok", label: "1억~3억" },
  { value: "over_3eok", label: "3억 이상" },
];

const DELINQUENCY_OPTIONS: { value: DelinquencyCount; label: string }[] = [
  { value: "none", label: "없음" },
  { value: "once", label: "1회" },
  { value: "twice_or_more", label: "2회 이상" },
];

const CARD_LOAN_OPTIONS: { value: CardLoanUsage; label: string }[] = [
  { value: "none", label: "없음" },
  { value: "1to2", label: "1~2회" },
  { value: "3_or_more", label: "3회 이상" },
];

const LOAN_REJECTION_OPTIONS: { value: LoanRejection; label: string }[] = [
  { value: "none", label: "없음" },
  { value: "yes", label: "있음" },
];

const INCOME_RANGE_OPTIONS: { value: MonthlyIncomeRange; label: string }[] = [
  { value: "under_200", label: "200만 이하" },
  { value: "200to300", label: "200~300만" },
  { value: "300to500", label: "300~500만" },
  { value: "500to700", label: "500~700만" },
  { value: "over_700", label: "700만 이상" },
];

const REPAYMENT_OPTIONS: { value: MonthlyLoanRepayment; label: string }[] = [
  { value: "none", label: "없음" },
  { value: "under_50", label: "50만 이하" },
  { value: "50to100", label: "50~100만" },
  { value: "100to200", label: "100~200만" },
  { value: "over_200", label: "200만 이상" },
];

function gradeColor5(points: number, max: number): string {
  const pct = points / max;
  if (pct >= 0.8) return "var(--oboon-grade-green)";
  if (pct >= 0.6) return "var(--oboon-grade-lime)";
  if (pct >= 0.4) return "var(--oboon-grade-yellow)";
  if (pct >= 0.2) return "var(--oboon-grade-orange)";
  return "var(--oboon-grade-red)";
}

const LABEL_CLASS = "mb-1.5 block ob-typo-caption text-(--oboon-text-muted)";

function LtvDsrModalBody({
  onClose,
  onConfirm,
  initialEmploymentType,
  initialHouseOwnership,
  estimatedNewLoanPaymentManwon,
  initialValues,
  initialLtvInternalScore,
}: LtvDsrModalBodyProps) {
  const [existingLoan, setExistingLoan] = useState<ExistingLoanAmount | null>(initialValues.existingLoan);
  const [recentDelinquency, setRecentDelinquency] = useState<DelinquencyCount | null>(
    initialValues.recentDelinquency,
  );
  const [cardLoanUsage, setCardLoanUsage] = useState<CardLoanUsage | null>(initialValues.cardLoanUsage);
  const [loanRejection, setLoanRejection] = useState<LoanRejection | null>(initialValues.loanRejection);
  const [monthlyIncomeRange, setMonthlyIncomeRange] = useState<MonthlyIncomeRange | null>(
    initialValues.monthlyIncomeRange,
  );
  const [existingMonthlyRepayment, setExistingMonthlyRepayment] =
    useState<MonthlyLoanRepayment | null>(initialValues.existingMonthlyRepayment);

  const resolvedLoan: ExistingLoanAmount = existingLoan ?? "none";
  const resolvedDelinquency: DelinquencyCount = recentDelinquency ?? "none";
  const resolvedCardLoan: CardLoanUsage = cardLoanUsage ?? "none";
  const resolvedLoanRejection: LoanRejection = loanRejection ?? "none";
  const resolvedIncomeRange: MonthlyIncomeRange = monthlyIncomeRange ?? "300to500";
  const resolvedRepayment: MonthlyLoanRepayment = existingMonthlyRepayment ?? "none";

  const hasLoan = resolvedLoan !== "none";

  // 표시되는 모든 항목이 선택되어야 미리보기/적용 활성화
  const isReady =
    existingLoan !== null &&
    cardLoanUsage !== null &&
    monthlyIncomeRange !== null &&
    existingMonthlyRepayment !== null &&
    (!hasLoan || (recentDelinquency !== null && loanRejection !== null));

  const input: LtvDsrInput = {
    houseOwnership: initialHouseOwnership ?? "none",
    existingLoan: resolvedLoan,
    recentDelinquency: hasLoan ? resolvedDelinquency : "none",
    cardLoanUsage: resolvedCardLoan,
    loanRejection: hasLoan ? resolvedLoanRejection : "none",
    employmentType: initialEmploymentType ?? "employee",
    monthlyIncomeRange: resolvedIncomeRange,
    existingMonthlyRepayment: resolvedRepayment,
  };

  const preview: LtvDsrPreview = calculateLtvDsrPreview(input, estimatedNewLoanPaymentManwon);

  const ltvColor = gradeColor5(preview.ltvPoints, 10);
  const dsrColor = gradeColor5(preview.dsrPoints, 10);
  const totalColor = gradeColor5(preview.totalPoints, 20);
  const persistedValues = useMemo<LtvDsrPersistedValues>(() => ({
    existingLoan,
    recentDelinquency: hasLoan ? recentDelinquency : null,
    cardLoanUsage,
    loanRejection: hasLoan ? loanRejection : null,
    monthlyIncomeRange,
    existingMonthlyRepayment,
  }), [
    cardLoanUsage,
    existingLoan,
    existingMonthlyRepayment,
    hasLoan,
    loanRejection,
    monthlyIncomeRange,
    recentDelinquency,
  ]);

  return (
    <div className="space-y-4">
      <div className="pr-8">
        <h3 className="ob-typo-h3 text-(--oboon-text-title)">신용 상태 (LTV + DSR)</h3>
        <p className="mt-1 ob-typo-caption text-(--oboon-text-muted)">
          대출 가능성을 평가합니다. 주택·직업 정보는 자동으로 연동됩니다.
        </p>
      </div>

      <div className="space-y-3">
        {/* 보유 주택 + 직업 형태 — 고정 (2열) */}
        <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
          <div>
            <span className={LABEL_CLASS}>
              보유 주택
              <span className="ml-1 opacity-60">(자동 연동)</span>
            </span>
            <Select
              value={(initialHouseOwnership ?? "") as "none" | "one" | "two_or_more"}
              onChange={() => {}}
              disabled
              options={HOUSE_OWNERSHIP_OPTIONS}
            />
          </div>
          <div>
            <span className={LABEL_CLASS}>
              직업 형태
              <span className="ml-1 opacity-60">(자동 연동)</span>
            </span>
            <Select
              value={(initialEmploymentType ?? "") as EmploymentType}
              onChange={() => {}}
              disabled
              options={EMPLOYMENT_TYPE_OPTIONS}
            />
          </div>
        </div>

        {/* 1. 현재 대출 */}
        <div>
          <span className={LABEL_CLASS}>1. 현재 대출</span>
          <Select
            value={(existingLoan ?? "") as ExistingLoanAmount}
            onChange={setExistingLoan}
            options={LOAN_OPTIONS}
          />
        </div>

        {/* hasLoan: 연체 + 카드론 (2열) / !hasLoan: 카드론만 (1열) */}
        {hasLoan ? (
          <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
            <div>
              <span className={LABEL_CLASS}>2. 최근 1년 대출 연체</span>
              <Select
                value={(recentDelinquency ?? "") as DelinquencyCount}
                onChange={setRecentDelinquency}
                options={DELINQUENCY_OPTIONS}
              />
            </div>
            <div>
              <span className={LABEL_CLASS}>3. 카드론 / 현금서비스</span>
              <Select
                value={(cardLoanUsage ?? "") as CardLoanUsage}
                onChange={setCardLoanUsage}
                options={CARD_LOAN_OPTIONS}
              />
            </div>
          </div>
        ) : (
          <div>
            <span className={LABEL_CLASS}>2. 카드론 / 현금서비스 사용</span>
            <Select
              value={(cardLoanUsage ?? "") as CardLoanUsage}
              onChange={setCardLoanUsage}
              options={CARD_LOAN_OPTIONS}
            />
          </div>
        )}

        {/* hasLoan: 대출 심사 거절 */}
        {hasLoan && (
          <div>
            <span className={LABEL_CLASS}>4. 대출 심사 거절 경험</span>
            <Select
              value={(loanRejection ?? "") as "none" | "yes"}
              onChange={setLoanRejection}
              options={LOAN_REJECTION_OPTIONS}
            />
          </div>
        )}

        {/* 월 평균 세후 소득 + 월 대출 상환액 (2열) */}
        <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
          <div>
            <span className={LABEL_CLASS}>
              {hasLoan ? "5." : "3."} 월 평균 세후 소득
            </span>
            <Select
              value={(monthlyIncomeRange ?? "") as MonthlyIncomeRange}
              onChange={setMonthlyIncomeRange}
              options={INCOME_RANGE_OPTIONS}
            />
          </div>
          <div>
            <span className={LABEL_CLASS}>
              {hasLoan ? "6." : "4."} 월 대출 상환액
            </span>
            <Select
              value={(existingMonthlyRepayment ?? "") as MonthlyLoanRepayment}
              onChange={setExistingMonthlyRepayment}
              options={REPAYMENT_OPTIONS}
            />
          </div>
        </div>
      </div>

      {/* 결과 미리보기 */}
      <div className="rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle) p-3">
        <div className="mb-2 ob-typo-body font-semibold text-(--oboon-text-title)">
          평가 결과 미리보기
        </div>
        {isReady ? (
          <>
            <div className="grid grid-cols-1 xs:grid-cols-3 gap-2 text-center">
              <div className="rounded-lg border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-2">
                <div className="ob-typo-caption text-(--oboon-text-muted)">LTV 점수</div>
                <div className="mt-1 ob-typo-subtitle font-bold" style={{ color: ltvColor }}>
                  {preview.ltvPoints}/10
                </div>
                <div className="mt-0.5 ob-typo-caption" style={{ color: ltvColor }}>
                  {preview.ltvLabel}
                </div>
              </div>
              <div className="rounded-lg border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-2">
                <div className="ob-typo-caption text-(--oboon-text-muted)">DSR 점수</div>
                <div className="mt-1 ob-typo-subtitle font-bold" style={{ color: dsrColor }}>
                  {preview.dsrPoints}/10
                </div>
                <div className="mt-0.5 ob-typo-caption" style={{ color: dsrColor }}>
                  {preview.dsrLabel}
                  {preview.dsrEstimate !== null ? ` (${Math.round(preview.dsrEstimate)}%)` : ""}
                </div>
              </div>
              <div className="rounded-lg border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-2">
                <div className="ob-typo-caption text-(--oboon-text-muted)">합산</div>
                <div className="mt-1 ob-typo-subtitle font-bold" style={{ color: totalColor }}>
                  {preview.totalPoints}/20
                </div>
                <div className="mt-0.5 ob-typo-caption text-(--oboon-text-muted)">LTV+DSR</div>
              </div>
            </div>
            <p className="mt-2 ob-typo-caption text-(--oboon-text-muted)">
              * DSR는 현장 대출 조건 기준으로 최종 계산됩니다. 이 수치는 근사값입니다.
            </p>
          </>
        ) : initialLtvInternalScore > 0 ? (
          <div className="space-y-2 py-2 text-center">
            <div className="ob-typo-caption text-(--oboon-text-muted)">현재 저장된 신용 상태 점수</div>
            <div className="ob-typo-h2 font-bold text-(--oboon-text-title)">
              {initialLtvInternalScore}점
            </div>
            <p className="ob-typo-caption text-(--oboon-text-muted)">
              저장된 세부 응답이 부족해 점수만 표시합니다. 값을 다시 선택하면 즉시 갱신됩니다.
            </p>
          </div>
        ) : (
          <div className="flex items-center justify-center py-4 ob-typo-caption text-(--oboon-text-muted)">
            현재 대출과 월 소득을 선택하면 결과가 표시됩니다
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Button variant="secondary" className="flex-1" onClick={onClose}>
          취소
        </Button>
        <Button
          className="flex-1"
          disabled={!isReady}
          onClick={() => {
            onConfirm({
              ltvInternalScore: preview.ltvInternalScore,
              ltvPoints: preview.ltvPoints,
              existingMonthlyRepayment: resolvedRepayment,
              formValues: {
                ...persistedValues,
                existingLoan: resolvedLoan,
                recentDelinquency: hasLoan ? resolvedDelinquency : null,
                cardLoanUsage: resolvedCardLoan,
                loanRejection: hasLoan ? resolvedLoanRejection : null,
                monthlyIncomeRange: resolvedIncomeRange,
                existingMonthlyRepayment: resolvedRepayment,
              },
            });
            onClose();
          }}
        >
          적용하기
        </Button>
      </div>
    </div>
  );
}

export default function LtvDsrModal({
  open,
  onClose,
  onConfirm,
  initialEmploymentType,
  initialHouseOwnership,
  estimatedNewLoanPaymentManwon = 0,
  initialValues = EMPTY_LTV_DSR_PERSISTED_VALUES,
  initialLtvInternalScore = 0,
}: LtvDsrModalProps) {
  const resetKey = [
    initialEmploymentType,
    initialHouseOwnership,
    `${estimatedNewLoanPaymentManwon}`,
    `${initialLtvInternalScore}`,
    initialValues.existingLoan ?? "",
    initialValues.recentDelinquency ?? "",
    initialValues.cardLoanUsage ?? "",
    initialValues.loanRejection ?? "",
    initialValues.monthlyIncomeRange ?? "",
    initialValues.existingMonthlyRepayment ?? "",
  ].join("|");

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      panelClassName="w-[min(100%-2rem,480px)]"
    >
      <LtvDsrModalBody
        key={resetKey}
        onClose={onClose}
        onConfirm={onConfirm}
        initialEmploymentType={initialEmploymentType}
        initialHouseOwnership={initialHouseOwnership}
        estimatedNewLoanPaymentManwon={estimatedNewLoanPaymentManwon}
        initialValues={initialValues}
        initialLtvInternalScore={initialLtvInternalScore}
      />
    </Modal>
  );
}
