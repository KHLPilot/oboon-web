# Condition Wizard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `ConditionBar` + `LtvDsrModal`을 3단계 Wizard로 교체해 한 번에 보이는 필드 수를 줄이고, 신용 평가 모달 진입 마찰을 제거한다.

**Architecture:** Wizard 컴포넌트는 `features/recommendations/components/`에 위치 (`RecommendationCondition` 타입이 같은 폴더에 있으므로). Step 2가 `LtvDsrModal` 내용을 인라인으로 흡수하며, LTV/DSR 프리뷰는 `calculateLtvDsrPreview()` 실시간 호출로 유지. `ConditionValidationCard`는 타입 구조가 달라 이번 범위에서 제외하고, `LtvDsrModal`에 `@deprecated` 태그만 추가.

**Tech Stack:** Next.js 14 App Router, React, TypeScript, Tailwind CSS (CSS variables 방식), `features/condition-validation/domain/*` (변경 없음)

---

## File Map

### 신규 파일
| 파일 | 역할 |
|---|---|
| `features/recommendations/components/WizardStepIndicator.tsx` | 스텝 인디케이터 (dots + 탭 겸용) |
| `features/recommendations/components/ConditionWizardStep1.tsx` | Step 1 — 재무 (직업, 보유주택, 현금, 소득, 지출) |
| `features/recommendations/components/ConditionWizardStep2.tsx` | Step 2 — 신용/대출 (LtvDsrModal 흡수 + 인라인 프리뷰) |
| `features/recommendations/components/ConditionWizardStep3.tsx` | Step 3 — 라이프스타일 (목적, 시점, 입주, 지역) |
| `features/recommendations/components/ConditionWizard.tsx` | Wizard 컨테이너 (스텝 상태, 저장/평가 버튼) |

### 수정 파일
| 파일 | 변경 내용 |
|---|---|
| `features/recommendations/components/RecommendationConditionPanel.tsx` | `ConditionBar` → `ConditionWizard` 교체 |
| `features/condition-validation/components/LtvDsrModal.tsx` | `@deprecated` JSDoc 추가 |

---

## Task 1: WizardStepIndicator

**Files:**
- Create: `features/recommendations/components/WizardStepIndicator.tsx`

- [ ] **Step 1: 파일 생성**

```tsx
// features/recommendations/components/WizardStepIndicator.tsx
"use client";

import { cn } from "@/lib/utils/cn";

const STEP_LABELS = ["재무", "신용/대출", "라이프스타일"] as const;

type Props = {
  currentStep: 0 | 1 | 2;
  completedSteps: Set<number>;
  onStepClick?: (step: 0 | 1 | 2) => void;
};

export default function WizardStepIndicator({
  currentStep,
  completedSteps,
  onStepClick,
}: Props) {
  return (
    <div className="flex items-center">
      {STEP_LABELS.map((label, i) => {
        const isCompleted = completedSteps.has(i);
        const isCurrent = i === currentStep;
        const isClickable = isCompleted && !!onStepClick;

        return (
          <div key={label} className="flex items-center">
            {i > 0 && (
              <div
                className={cn(
                  "hidden xs:block h-px w-5 mx-1",
                  isCompleted
                    ? "bg-(--oboon-primary)"
                    : "bg-(--oboon-border-default)",
                )}
              />
            )}
            <button
              type="button"
              disabled={!isClickable}
              onClick={() =>
                isClickable && onStepClick(i as 0 | 1 | 2)
              }
              className={cn(
                "flex items-center gap-1.5 rounded-full px-2.5 py-1 ob-typo-caption transition-colors",
                isCurrent && "bg-(--oboon-primary) text-white",
                isCompleted &&
                  !isCurrent &&
                  "text-(--oboon-primary) cursor-pointer hover:bg-(--oboon-primary)/10",
                !isCurrent &&
                  !isCompleted &&
                  "text-(--oboon-text-muted) cursor-default",
              )}
            >
              <span
                className={cn(
                  "flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold shrink-0",
                  isCurrent && "bg-white/20",
                  isCompleted && !isCurrent && "bg-(--oboon-primary)/15",
                  !isCurrent && !isCompleted && "bg-(--oboon-border-default)",
                )}
              >
                {isCompleted && !isCurrent ? "✓" : i + 1}
              </span>
              <span className="hidden xs:inline">{label}</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: 타입 체크**

```bash
PATH="/opt/homebrew/opt/node@21/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" pnpm typecheck 2>&1 | tail -20
```

Expected: 새 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add features/recommendations/components/WizardStepIndicator.tsx
git commit -m "feat: add WizardStepIndicator component"
```

---

## Task 2: ConditionWizardStep1 (재무)

**Files:**
- Create: `features/recommendations/components/ConditionWizardStep1.tsx`

- [ ] **Step 1: 파일 생성**

```tsx
// features/recommendations/components/ConditionWizardStep1.tsx
"use client";

import { useId } from "react";
import { cn } from "@/lib/utils/cn";
import Select from "@/components/ui/Select";
import { formatManwonPreview } from "@/lib/format/currency";
import type { EmploymentType } from "@/features/condition-validation/domain/types";
import type { RecommendationCondition } from "@/features/recommendations/hooks/useRecommendations";

const LABEL = "mb-1.5 block ob-typo-caption text-(--oboon-text-muted)";
const INPUT_CLS = [
  "h-11 w-full rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-surface)",
  "px-3 ob-typo-body text-(--oboon-text-body) outline-none",
  "focus-visible:ring-2 focus-visible:ring-(--oboon-primary)/30",
].join(" ");

const EMPLOYMENT_OPTIONS: Array<{ value: EmploymentType; label: string }> = [
  { value: "employee", label: "직장인" },
  { value: "self_employed", label: "자영업" },
  { value: "freelancer", label: "프리랜서" },
  { value: "other", label: "기타" },
];

const HOUSE_OPTIONS = [
  { value: "none" as const, label: "무주택" },
  { value: "one" as const, label: "1주택" },
  { value: "two_or_more" as const, label: "2주택 이상" },
];

function formatNumeric(raw: string): string {
  const digits = raw.replace(/[^\d]/g, "");
  return digits ? Number(digits).toLocaleString("ko-KR") : "";
}

function NumberField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: number;
  placeholder: string;
  onChange: (v: number) => void;
}) {
  const id = useId();
  const preview = value > 0 ? formatManwonPreview(value) : "";

  return (
    <label htmlFor={id}>
      <span className={LABEL}>{label}</span>
      <div className="relative">
        <input
          id={id}
          type="text"
          inputMode="numeric"
          value={value > 0 ? value.toLocaleString("ko-KR") : ""}
          placeholder={placeholder}
          onChange={(e) => {
            const fmt = formatNumeric(e.currentTarget.value);
            onChange(fmt ? Number(fmt.replaceAll(",", "")) : 0);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.preventDefault();
          }}
          className={cn(INPUT_CLS, preview ? "pr-[4.5rem]" : "pr-3")}
        />
        {preview && (
          <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center ob-typo-caption text-(--oboon-text-muted)">
            {preview}
          </div>
        )}
      </div>
    </label>
  );
}

type Props = {
  condition: RecommendationCondition;
  onChange: (patch: Partial<RecommendationCondition>) => void;
  onNext: () => void;
};

export default function ConditionWizardStep1({
  condition,
  onChange,
  onNext,
}: Props) {
  const isReady =
    condition.availableCash > 0 &&
    condition.monthlyIncome > 0 &&
    condition.houseOwnership !== null;

  return (
    <div className="space-y-4">
      <div>
        <p className="ob-typo-subtitle font-semibold text-(--oboon-text-title)">
          재무 정보
        </p>
        <p className="mt-0.5 ob-typo-caption text-(--oboon-text-muted)">
          기본 자금 조건을 입력해주세요
        </p>
      </div>

      <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
        <div>
          <span className={LABEL}>직업</span>
          <Select<EmploymentType>
            value={(condition.employmentType ?? "") as EmploymentType}
            onChange={(employmentType) => onChange({ employmentType })}
            options={EMPLOYMENT_OPTIONS}
          />
        </div>

        <div>
          <span className={LABEL}>보유 주택</span>
          <Select
            value={
              (condition.houseOwnership ?? "") as
                | "none"
                | "one"
                | "two_or_more"
            }
            onChange={(houseOwnership) => onChange({ houseOwnership })}
            options={HOUSE_OPTIONS}
          />
        </div>

        <div>
          <NumberField
            label="가용 현금"
            value={condition.availableCash}
            placeholder="예: 8,000"
            onChange={(availableCash) => onChange({ availableCash })}
          />
        </div>

        <div>
          <NumberField
            label="월 소득"
            value={condition.monthlyIncome}
            placeholder="예: 400"
            onChange={(monthlyIncome) => onChange({ monthlyIncome })}
          />
        </div>

        <div className="xs:col-span-2">
          <NumberField
            label="월 지출"
            value={condition.monthlyExpenses}
            placeholder="예: 150"
            onChange={(monthlyExpenses) => onChange({ monthlyExpenses })}
          />
        </div>
      </div>

      <button
        type="button"
        disabled={!isReady}
        onClick={onNext}
        className="w-full h-10 rounded-full bg-(--oboon-primary) text-white ob-typo-button disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
      >
        다음 단계 →
      </button>
    </div>
  );
}
```

- [ ] **Step 2: 타입 체크**

```bash
PATH="/opt/homebrew/opt/node@21/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" pnpm typecheck 2>&1 | tail -20
```

Expected: 새 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add features/recommendations/components/ConditionWizardStep1.tsx
git commit -m "feat: add ConditionWizardStep1 (재무)"
```

---

## Task 3: ConditionWizardStep2 (신용/대출)

`LtvDsrModal`의 body 로직을 인라인으로 흡수. `calculateLtvDsrPreview()`는 props에서 직접 계산 (local state 불필요 — props가 변경되면 자동 재계산).

**Files:**
- Create: `features/recommendations/components/ConditionWizardStep2.tsx`

- [ ] **Step 1: 파일 생성**

```tsx
// features/recommendations/components/ConditionWizardStep2.tsx
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

  const isReady = isLoggedIn
    ? condition.existingLoan !== null &&
      condition.cardLoanUsage !== null &&
      condition.monthlyIncomeRange !== null &&
      (!hasLoan ||
        (condition.recentDelinquency !== null &&
          condition.loanRejection !== null))
    : true; // 비로그인은 건너뛰기

  // preview는 props에서 직접 계산 — local state 없음
  const input: LtvDsrInput = {
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
  const preview = calculateLtvDsrPreview(input, 0);
  const showPreview =
    condition.existingLoan !== null && condition.monthlyIncomeRange !== null;

  const handleNext = () => {
    if (isLoggedIn && isReady) {
      // ltvInternalScore 동기화
      onChange({ ltvInternalScore: preview.ltvInternalScore });
    }
    onNext();
  };

  // ── 비로그인 뷰 ────────────────────────────────────────────────────────────
  if (!isLoggedIn) {
    return (
      <div className="space-y-4">
        <div>
          <p className="ob-typo-subtitle font-semibold text-(--oboon-text-title)">
            신용 / 대출
          </p>
        </div>

        <div className="rounded-xl border border-(--oboon-border-default) p-3 space-y-2">
          <span className={LABEL}>신용 상태</span>
          <Select<CreditGrade>
            value={condition.creditGrade}
            onChange={(creditGrade) => onChange({ creditGrade })}
            options={CREDIT_OPTIONS}
          />
        </div>

        <div className="rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle) p-4 flex flex-col items-center gap-2 text-center">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-(--oboon-bg-elevated) border border-(--oboon-border-default)">
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
            className="flex-1 h-10 rounded-full border border-(--oboon-border-default) ob-typo-button text-(--oboon-text-muted)"
          >
            이전
          </button>
          <button
            type="button"
            onClick={onNext}
            className="flex-1 h-10 rounded-full bg-(--oboon-primary) text-white ob-typo-button"
          >
            건너뛰기
          </button>
        </div>
      </div>
    );
  }

  // ── 로그인 뷰 ───────────────────────────────────────────────────────────────
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

      {/* 자동 연동 필드 */}
      <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
        <div>
          <span className={LABEL}>
            보유 주택{" "}
            <span className="opacity-60">(자동 연동)</span>
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
            직업 형태{" "}
            <span className="opacity-60">(자동 연동)</span>
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
        <div>
          <span className={LABEL}>1. 현재 대출</span>
          <Select<ExistingLoanAmount>
            value={(condition.existingLoan ?? "") as ExistingLoanAmount}
            onChange={(existingLoan) => onChange({ existingLoan })}
            options={LOAN_OPTIONS}
          />
        </div>

        {hasLoan ? (
          <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
            <div>
              <span className={LABEL}>2. 최근 1년 대출 연체</span>
              <Select<DelinquencyCount>
                value={
                  (condition.recentDelinquency ?? "") as DelinquencyCount
                }
                onChange={(recentDelinquency) =>
                  onChange({ recentDelinquency })
                }
                options={DELINQUENCY_OPTIONS}
              />
            </div>
            <div>
              <span className={LABEL}>3. 카드론 / 현금서비스</span>
              <Select<CardLoanUsage>
                value={(condition.cardLoanUsage ?? "") as CardLoanUsage}
                onChange={(cardLoanUsage) => onChange({ cardLoanUsage })}
                options={CARD_LOAN_OPTIONS}
              />
            </div>
          </div>
        ) : (
          <div>
            <span className={LABEL}>2. 카드론 / 현금서비스 사용</span>
            <Select<CardLoanUsage>
              value={(condition.cardLoanUsage ?? "") as CardLoanUsage}
              onChange={(cardLoanUsage) => onChange({ cardLoanUsage })}
              options={CARD_LOAN_OPTIONS}
            />
          </div>
        )}

        {hasLoan && (
          <div>
            <span className={LABEL}>4. 대출 심사 거절 경험</span>
            <Select<LoanRejection>
              value={(condition.loanRejection ?? "") as LoanRejection}
              onChange={(loanRejection) => onChange({ loanRejection })}
              options={LOAN_REJECTION_OPTIONS}
            />
          </div>
        )}

        <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
          <div>
            <span className={LABEL}>
              {hasLoan ? "5." : "3."} 월 평균 세후 소득
            </span>
            <Select<MonthlyIncomeRange>
              value={
                (condition.monthlyIncomeRange ?? "") as MonthlyIncomeRange
              }
              onChange={(monthlyIncomeRange) =>
                onChange({ monthlyIncomeRange })
              }
              options={INCOME_RANGE_OPTIONS}
            />
          </div>
          <div>
            <span className={LABEL}>
              {hasLoan ? "6." : "4."} 월 대출 상환액
            </span>
            <Select<MonthlyLoanRepayment>
              value={condition.existingMonthlyRepayment}
              onChange={(existingMonthlyRepayment) =>
                onChange({ existingMonthlyRepayment })
              }
              options={REPAYMENT_OPTIONS}
            />
          </div>
        </div>
      </div>

      {/* 인라인 LTV/DSR 프리뷰 */}
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
          className="flex-1 h-10 rounded-full border border-(--oboon-border-default) ob-typo-button text-(--oboon-text-muted)"
        >
          이전
        </button>
        <button
          type="button"
          disabled={!isReady}
          onClick={handleNext}
          className="flex-1 h-10 rounded-full bg-(--oboon-primary) text-white ob-typo-button disabled:opacity-40 disabled:cursor-not-allowed"
        >
          다음 단계 →
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 타입 체크**

```bash
PATH="/opt/homebrew/opt/node@21/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" pnpm typecheck 2>&1 | tail -20
```

Expected: 새 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add features/recommendations/components/ConditionWizardStep2.tsx
git commit -m "feat: add ConditionWizardStep2 (신용/대출, LtvDsrModal 흡수)"
```

---

## Task 4: ConditionWizardStep3 (라이프스타일)

**Files:**
- Create: `features/recommendations/components/ConditionWizardStep3.tsx`

- [ ] **Step 1: 파일 생성**

```tsx
// features/recommendations/components/ConditionWizardStep3.tsx
"use client";

import Select from "@/components/ui/Select";
import { MultiSelect } from "@/components/ui/MultiSelect";
import type {
  FullPurchasePurpose,
  MoveinTiming,
  PurchaseTiming,
} from "@/features/condition-validation/domain/types";
import {
  OFFERING_REGION_TABS,
  type OfferingRegionTab,
} from "@/features/offerings/domain/offering.types";
import type { RecommendationCondition } from "@/features/recommendations/hooks/useRecommendations";

const LABEL = "mb-1.5 block ob-typo-caption text-(--oboon-text-muted)";

const PURPOSE_OPTIONS: Array<{ value: FullPurchasePurpose; label: string }> = [
  { value: "residence", label: "실거주" },
  { value: "investment_rent", label: "투자(임대)" },
  { value: "investment_capital", label: "투자(시세)" },
  { value: "long_term", label: "실거주+투자" },
];

const PURCHASE_TIMING_OPTIONS: Array<{
  value: PurchaseTiming;
  label: string;
}> = [
  { value: "within_3months", label: "3개월 이내" },
  { value: "within_6months", label: "6개월 이내" },
  { value: "within_1year", label: "1년 이내" },
  { value: "over_1year", label: "1년 이상" },
  { value: "by_property", label: "현장에 따라" },
];

const MOVEIN_OPTIONS: Array<{ value: MoveinTiming; label: string }> = [
  { value: "immediate", label: "즉시입주" },
  { value: "within_1year", label: "1년 이내" },
  { value: "within_2years", label: "2년 이내" },
  { value: "within_3years", label: "3년 이내" },
  { value: "anytime", label: "언제든지" },
];

const REGION_OPTIONS = OFFERING_REGION_TABS.filter((r) => r !== "전체").map(
  (r) => ({ value: r as OfferingRegionTab, label: r }),
);

type Props = {
  condition: RecommendationCondition;
  onChange: (patch: Partial<RecommendationCondition>) => void;
  onBack: () => void;
  onFinish: () => void;
};

export default function ConditionWizardStep3({
  condition,
  onChange,
  onBack,
  onFinish,
}: Props) {
  const isReady = condition.purchasePurposeV2 !== null;

  return (
    <div className="space-y-4">
      <div>
        <p className="ob-typo-subtitle font-semibold text-(--oboon-text-title)">
          라이프스타일
        </p>
        <p className="mt-0.5 ob-typo-caption text-(--oboon-text-muted)">
          분양 목적과 희망 조건을 선택해주세요
        </p>
      </div>

      <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
        <div>
          <span className={LABEL}>분양 목적</span>
          <Select<FullPurchasePurpose>
            value={(condition.purchasePurposeV2 ?? "") as FullPurchasePurpose}
            onChange={(purchasePurposeV2) => onChange({ purchasePurposeV2 })}
            options={PURPOSE_OPTIONS}
          />
        </div>

        <div>
          <span className={LABEL}>분양 시점</span>
          <Select<PurchaseTiming>
            value={(condition.purchaseTiming ?? "") as PurchaseTiming}
            onChange={(purchaseTiming) => onChange({ purchaseTiming })}
            options={PURCHASE_TIMING_OPTIONS}
          />
        </div>

        <div>
          <span className={LABEL}>희망 입주</span>
          <Select<MoveinTiming>
            value={(condition.moveinTiming ?? "") as MoveinTiming}
            onChange={(moveinTiming) => onChange({ moveinTiming })}
            options={MOVEIN_OPTIONS}
          />
        </div>

        <div>
          <span className={LABEL}>지역</span>
          <MultiSelect<OfferingRegionTab>
            values={condition.regions}
            onChange={(regions) => onChange({ regions })}
            options={REGION_OPTIONS}
            placeholder="전체"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 h-10 rounded-full border border-(--oboon-border-default) ob-typo-button text-(--oboon-text-muted)"
        >
          이전
        </button>
        <button
          type="button"
          disabled={!isReady}
          onClick={onFinish}
          className="flex-1 h-10 rounded-full bg-(--oboon-primary) text-white ob-typo-button disabled:opacity-40 disabled:cursor-not-allowed"
        >
          완료 ✓
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 타입 체크**

```bash
PATH="/opt/homebrew/opt/node@21/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" pnpm typecheck 2>&1 | tail -20
```

Expected: 새 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add features/recommendations/components/ConditionWizardStep3.tsx
git commit -m "feat: add ConditionWizardStep3 (라이프스타일)"
```

---

## Task 5: ConditionWizard 컨테이너

스텝 상태, 네비게이션, 저장/평가 버튼을 관리. `ConditionBar`와 동일한 prop 인터페이스.

**Files:**
- Create: `features/recommendations/components/ConditionWizard.tsx`

- [ ] **Step 1: 파일 생성**

```tsx
// features/recommendations/components/ConditionWizard.tsx
"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { saveConditionSession } from "@/features/condition-validation/lib/sessionCondition";
import WizardStepIndicator from "@/features/recommendations/components/WizardStepIndicator";
import ConditionWizardStep1 from "@/features/recommendations/components/ConditionWizardStep1";
import ConditionWizardStep2 from "@/features/recommendations/components/ConditionWizardStep2";
import ConditionWizardStep3 from "@/features/recommendations/components/ConditionWizardStep3";
import type { RecommendationCondition } from "@/features/recommendations/hooks/useRecommendations";

const RESET_CONDITION: RecommendationCondition = {
  availableCash: 0,
  monthlyIncome: 0,
  ownedHouseCount: 0,
  creditGrade: "good",
  purchasePurpose: "residence",
  employmentType: null,
  monthlyExpenses: 0,
  houseOwnership: null,
  purchasePurposeV2: null,
  purchaseTiming: null,
  moveinTiming: null,
  ltvInternalScore: 0,
  existingLoan: null,
  recentDelinquency: null,
  cardLoanUsage: null,
  loanRejection: null,
  monthlyIncomeRange: null,
  existingMonthlyRepayment: "none",
  regions: [],
};

type Props = {
  condition: RecommendationCondition;
  isLoggedIn?: boolean;
  hasSavedConditionPreset?: boolean;
  isConditionDirty?: boolean;
  onChange: (patch: Partial<RecommendationCondition>) => void;
  onEvaluate: (override?: RecommendationCondition) => void | Promise<boolean>;
  onSave?: () => void | Promise<boolean>;
  onLoginAndSave?: () => void | Promise<void>;
  isLoading?: boolean;
  isSaving?: boolean;
};

type Step = 0 | 1 | 2;

export default function ConditionWizard({
  condition,
  isLoggedIn = true,
  hasSavedConditionPreset = false,
  isConditionDirty = false,
  onChange,
  onEvaluate,
  onSave,
  onLoginAndSave,
  isLoading = false,
  isSaving = false,
}: Props) {
  const [currentStep, setCurrentStep] = useState<Step>(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [showFinalActions, setShowFinalActions] = useState(false);
  const toast = useToast();

  const markCompleted = (step: number) => {
    setCompletedSteps((prev) => new Set([...prev, step]));
  };

  const handleNext = (fromStep: Step) => {
    markCompleted(fromStep);
    // 스텝 완료 시 세션 저장
    // ConditionSessionSnapshot: availableCash/monthlyIncome/monthlyExpenses는 string,
    // regions 필드 없음 — number → string 변환 필요
    saveConditionSession({
      availableCash: condition.availableCash.toString(),
      monthlyIncome: condition.monthlyIncome.toString(),
      monthlyExpenses: condition.monthlyExpenses.toString(),
      employmentType: condition.employmentType,
      houseOwnership: condition.houseOwnership,
      purchasePurposeV2: condition.purchasePurposeV2,
      purchaseTiming: condition.purchaseTiming,
      moveinTiming: condition.moveinTiming,
      ltvInternalScore: condition.ltvInternalScore,
      existingLoan: condition.existingLoan,
      recentDelinquency: condition.recentDelinquency,
      cardLoanUsage: condition.cardLoanUsage,
      loanRejection: condition.loanRejection,
      monthlyIncomeRange: condition.monthlyIncomeRange,
      existingMonthlyRepayment: condition.existingMonthlyRepayment,
    });
    if (fromStep < 2) {
      setCurrentStep((fromStep + 1) as Step);
    }
  };

  const handleFinish = () => {
    markCompleted(2);
    setShowFinalActions(true);
  };

  const handleSave = async () => {
    if (!onSave) return;
    const ok = await onSave();
    if (ok) toast.success("조건이 저장되었습니다.");
    else toast.error("저장에 실패했습니다. 다시 시도해주세요.");
  };

  const handleReset = () => {
    onChange(RESET_CONDITION);
    setCurrentStep(0);
    setCompletedSteps(new Set());
    setShowFinalActions(false);
  };

  const isReadyToEvaluate =
    condition.availableCash > 0 &&
    condition.monthlyIncome > 0 &&
    condition.houseOwnership !== null &&
    condition.purchasePurposeV2 !== null &&
    (isLoggedIn ? condition.ltvInternalScore > 0 : true);

  return (
    <div className="space-y-4">
      {/* 헤더: 스텝 인디케이터 + 초기화 */}
      <div className="flex items-center justify-between">
        <WizardStepIndicator
          currentStep={showFinalActions ? 2 : currentStep}
          completedSteps={completedSteps}
          onStepClick={(step) => {
            if (completedSteps.has(step)) {
              setCurrentStep(step);
              setShowFinalActions(false);
            }
          }}
        />
        <button
          type="button"
          onClick={handleReset}
          className="ob-typo-caption text-(--oboon-text-muted) hover:text-(--oboon-text-body) transition-colors shrink-0 ml-2"
        >
          초기화
        </button>
      </div>

      {/* 스텝 콘텐츠 */}
      {!showFinalActions && (
        <>
          {currentStep === 0 && (
            <ConditionWizardStep1
              condition={condition}
              onChange={onChange}
              onNext={() => handleNext(0)}
            />
          )}
          {currentStep === 1 && (
            <ConditionWizardStep2
              condition={condition}
              isLoggedIn={isLoggedIn}
              onChange={onChange}
              onNext={() => handleNext(1)}
              onBack={() => setCurrentStep(0)}
              onLoginAndSave={onLoginAndSave}
            />
          )}
          {currentStep === 2 && (
            <ConditionWizardStep3
              condition={condition}
              onChange={onChange}
              onBack={() => setCurrentStep(1)}
              onFinish={handleFinish}
            />
          )}
        </>
      )}

      {/* 최종 액션 */}
      {showFinalActions && (
        <div className="space-y-3 rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle) p-4">
          <p className="ob-typo-body font-semibold text-(--oboon-text-title)">
            입력한 조건으로 맞춤 현장을 평가할 준비가 됐어요
          </p>
          <div className="flex flex-col gap-2">
            {isLoggedIn === false && onLoginAndSave ? (
              <Button
                variant="secondary"
                shape="pill"
                onClick={() => void onLoginAndSave()}
              >
                로그인하고 조건 저장
              </Button>
            ) : isLoggedIn && !hasSavedConditionPreset && onSave ? (
              <Button
                variant="secondary"
                shape="pill"
                loading={isSaving}
                onClick={() => void handleSave()}
              >
                조건 저장
              </Button>
            ) : isLoggedIn &&
              hasSavedConditionPreset &&
              isConditionDirty &&
              onSave ? (
              <Button
                variant="secondary"
                shape="pill"
                loading={isSaving}
                onClick={() => void handleSave()}
              >
                조건 업데이트
              </Button>
            ) : null}

            <Button
              variant="primary"
              shape="pill"
              loading={isLoading}
              disabled={!isReadyToEvaluate}
              onClick={() => void onEvaluate()}
            >
              평가하기
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
```

> **주의**: `saveConditionSession`의 인자 타입(`ConditionSessionSnapshot`)을 확인할 것.
> `condition` 전체가 스냅샷 타입과 맞지 않으면 타입 에러가 발생한다.
> 그럴 경우 `sessionCondition.ts`를 읽고 필요한 필드만 골라서 전달하거나, `condition`을 캐스팅.

- [ ] **Step 2: 타입 체크**

```bash
PATH="/opt/homebrew/opt/node@21/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" pnpm typecheck 2>&1 | tail -20
```

타입 에러 발생 시: `saveConditionSession` 인자 타입 확인 후 맞게 수정.

- [ ] **Step 3: 커밋**

```bash
git add features/recommendations/components/ConditionWizard.tsx
git commit -m "feat: add ConditionWizard container"
```

---

## Task 6: RecommendationConditionPanel — ConditionBar → ConditionWizard 교체

**Files:**
- Modify: `features/recommendations/components/RecommendationConditionPanel.tsx`

현재 파일:
```tsx
import ConditionBar from "@/features/recommendations/components/ConditionBar";
// ...
{mode === "input" ? (
  <ConditionBar
    condition={condition}
    isLoggedIn={isLoggedIn}
    hasSavedConditionPreset={hasSavedConditionPreset}
    isConditionDirty={isConditionDirty}
    onChange={onChange}
    onEvaluate={onEvaluate}
    onSave={isLoggedIn ? onSave : undefined}
    onLoginAndSave={isLoggedIn ? undefined : onLoginAndSave}
    isLoading={isLoading}
    isSaving={isSaving}
  />
```

- [ ] **Step 1: import 교체 및 JSX 교체**

`RecommendationConditionPanel.tsx`에서:

```tsx
// 교체 전
import ConditionBar from "@/features/recommendations/components/ConditionBar";

// 교체 후
import ConditionWizard from "@/features/recommendations/components/ConditionWizard";
```

JSX 교체:
```tsx
// 교체 전
<ConditionBar
  condition={condition}
  isLoggedIn={isLoggedIn}
  hasSavedConditionPreset={hasSavedConditionPreset}
  isConditionDirty={isConditionDirty}
  onChange={onChange}
  onEvaluate={onEvaluate}
  onSave={isLoggedIn ? onSave : undefined}
  onLoginAndSave={isLoggedIn ? undefined : onLoginAndSave}
  isLoading={isLoading}
  isSaving={isSaving}
/>

// 교체 후 (props 동일)
<ConditionWizard
  condition={condition}
  isLoggedIn={isLoggedIn}
  hasSavedConditionPreset={hasSavedConditionPreset}
  isConditionDirty={isConditionDirty}
  onChange={onChange}
  onEvaluate={onEvaluate}
  onSave={isLoggedIn ? onSave : undefined}
  onLoginAndSave={isLoggedIn ? undefined : onLoginAndSave}
  isLoading={isLoading}
  isSaving={isSaving}
/>
```

- [ ] **Step 2: 타입 체크**

```bash
PATH="/opt/homebrew/opt/node@21/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" pnpm typecheck 2>&1 | tail -20
```

Expected: 새 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add features/recommendations/components/RecommendationConditionPanel.tsx
git commit -m "feat: replace ConditionBar with ConditionWizard in recommendations"
```

---

## Task 7: LtvDsrModal deprecated 태그 추가

`ConditionValidationCard`는 자체 `ProfileAutoFillData` 타입을 사용해 `RecommendationCondition`과 구조가 달라 이번 범위에서 wizard 연결을 제외한다. `LtvDsrModal`을 삭제하지 않고 deprecated 태그만 추가.

**Files:**
- Modify: `features/condition-validation/components/LtvDsrModal.tsx`

- [ ] **Step 1: JSDoc 추가**

`LtvDsrModal.tsx` 파일 맨 위 `"use client";` 다음 줄에 추가:

```tsx
/**
 * @deprecated ConditionWizard (features/recommendations/components/ConditionWizard.tsx)의
 * Step 2(ConditionWizardStep2)로 대체됨.
 * ConditionValidationCard 마이그레이션 완료 후 삭제 예정.
 */
```

- [ ] **Step 2: lint + build**

```bash
PATH="/opt/homebrew/opt/node@21/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" pnpm lint 2>&1 | tail -30
PATH="/opt/homebrew/opt/node@21/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" pnpm build 2>&1 | tail -30
```

Expected: 에러 없이 빌드 성공

- [ ] **Step 3: 커밋**

```bash
git add features/condition-validation/components/LtvDsrModal.tsx
git commit -m "chore: deprecate LtvDsrModal (replaced by ConditionWizardStep2)"
```

---

## Task 8: 최종 검증

- [ ] **Step 1: lint**

```bash
PATH="/opt/homebrew/opt/node@21/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" pnpm lint 2>&1 | tail -30
```

Expected: 에러 없음

- [ ] **Step 2: build**

```bash
PATH="/opt/homebrew/opt/node@21/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" pnpm build 2>&1 | tail -30
```

Expected: Build succeeded

- [ ] **Step 3: 수동 확인 체크리스트**

  - [ ] 맞춤현장 페이지 → 3단계 wizard 진행 가능 (Step 1 → 2 → 3 → 최종 액션)
  - [ ] Step 2 → 필드 변경 시 LTV/DSR 프리뷰 실시간 갱신
  - [ ] 비로그인 → Step 2 soft gate 노출, 건너뛰기로 Step 3 이동
  - [ ] 완료된 스텝 인디케이터 클릭 → 해당 스텝으로 이동
  - [ ] 초기화 버튼 → Step 1로 리셋
  - [ ] 최종 액션: 저장 / 평가하기 버튼 동작
  - [ ] 모바일 레이아웃 이상 없음

---

## 범위 외 (다음 태스크)

- `ConditionValidationCard` wizard 연결 — `ProfileAutoFillData` ↔ `RecommendationCondition` 매핑 타입 설계 필요
- `ConditionBar.tsx` 삭제 — `ConditionWizard` 안정화 후 제거
- `LtvDsrModal.tsx` 삭제 — `ConditionValidationCard` 마이그레이션 후 제거
