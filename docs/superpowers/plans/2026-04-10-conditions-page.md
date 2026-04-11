# 맞춤 현장 조건 설정 페이지 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 모바일에서 맞춤 현장 조건 설정을 바텀 시트 대신 `/recommendations/conditions/step/[step]` 전용 페이지로 전환. 각 스텝 내부에서 이전 필드 입력 시 다음 필드가 아래로 슬라이드-인 되는 프로그레시브 디스클로저 UX 구현.

**Architecture:** `MobileConditionSheet`는 버튼만 남기고 `router.push`로 전환. 기존 `ConditionWizardStep1/2/3.tsx`에 `progressive?: boolean` prop을 추가해 필드 순차 공개를 지원. 조건 페이지 전용 라우팅(`conditions/layout` + `step/[step]` + `done`) 추가. 상태는 기존 `sessionStorage` 그대로 유지.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, `useRecommendations` hook, `grid-rows` CSS transition for animation

---

## 파일 목록

| 동작 | 경로 |
|------|------|
| **수정** | `features/recommendations/components/MobileConditionSheet.tsx` |
| **수정** | `features/recommendations/components/ConditionWizardStep1.tsx` |
| **수정** | `features/recommendations/components/ConditionWizardStep2.tsx` |
| **수정** | `features/recommendations/components/ConditionWizardStep3.tsx` |
| **수정** | `app/recommendations/page.tsx` |
| **신규** | `app/recommendations/conditions/layout.tsx` |
| **신규** | `app/recommendations/conditions/step/[step]/page.tsx` |
| **신규** | `app/recommendations/conditions/done/page.tsx` |

---

## Task 1: MobileConditionSheet — 바텀 시트 제거, 페이지 이동으로 교체

**Files:**
- Modify: `features/recommendations/components/MobileConditionSheet.tsx`
- Modify: `app/recommendations/page.tsx`

바텀 시트 오버레이·Sheet DOM 전부 제거. 버튼 클릭 시 `/recommendations/conditions/step/1`으로 이동. Props를 `condition`과 `isLoggedIn`만 남긴다.

- [ ] **Step 1: MobileConditionSheet 파일 전체 교체**

```tsx
"use client";

import { SlidersHorizontal } from "lucide-react";
import { useMemo } from "react";
import { useRouter } from "next/navigation";

import type { RecommendationCondition } from "@/features/recommendations/hooks/useRecommendations";
import { formatManwonPreview } from "@/lib/format/currency";

type MobileConditionSheetProps = {
  condition: RecommendationCondition;
  isLoggedIn?: boolean;
};

function buildConditionChips(condition: RecommendationCondition): string[] {
  const chips: string[] = [];
  if (condition.availableCash > 0)
    chips.push(`현금 ${formatManwonPreview(condition.availableCash)}`);
  if (condition.monthlyIncome > 0)
    chips.push(`소득 ${formatManwonPreview(condition.monthlyIncome)}`);
  if (condition.ltvInternalScore > 0)
    chips.push(`신용 ${condition.ltvInternalScore}점`);
  const ownershipMap = { none: "무주택", one: "1주택", two_or_more: "2주택+" };
  if (condition.houseOwnership) chips.push(ownershipMap[condition.houseOwnership]);
  const purposeMap: Record<string, string> = {
    residence: "실거주",
    investment_rent: "투자(임대)",
    investment_capital: "투자(시세)",
    long_term: "실거주+투자",
  };
  if (condition.purchasePurposeV2)
    chips.push(purposeMap[condition.purchasePurposeV2] ?? condition.purchasePurposeV2);
  if (condition.regions.length === 1) chips.push(condition.regions[0]);
  else if (condition.regions.length > 1)
    chips.push(`${condition.regions[0]} 외 ${condition.regions.length - 1}개`);
  return chips;
}

export default function MobileConditionSheet({
  condition,
  isLoggedIn: _isLoggedIn = true,
}: MobileConditionSheetProps) {
  const router = useRouter();
  const conditionChips = useMemo(
    () => buildConditionChips(condition),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      condition.availableCash,
      condition.monthlyIncome,
      condition.ltvInternalScore,
      condition.houseOwnership,
      condition.purchasePurposeV2,
      condition.regions,
    ],
  );

  return (
    <div className="sm:hidden">
      <button
        type="button"
        onClick={() => router.push("/recommendations/conditions/step/1")}
        className="flex w-full items-center gap-3 rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) px-4 py-3 text-left"
      >
        <div className="min-w-0 flex-1">
          <span className="ob-typo-body2 text-(--oboon-text-title)">추천 조건</span>
          <p className="mt-1 line-clamp-2 ob-typo-caption text-(--oboon-text-muted)">
            {conditionChips.length > 0
              ? conditionChips.join(" · ")
              : "조건을 설정해주세요"}
          </p>
        </div>
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-(--oboon-border-default) bg-(--oboon-bg-page)">
          <SlidersHorizontal className="h-4 w-4 text-(--oboon-text-muted)" />
        </span>
      </button>
    </div>
  );
}
```

- [ ] **Step 2: recommendations/page.tsx에서 MobileConditionSheet props 축소**

`app/recommendations/page.tsx` 에서 `<MobileConditionSheet>` 사용 부분을 찾아 아래와 같이 교체한다.

변경 전:
```tsx
<MobileConditionSheet
  condition={condition}
  mode={mode}
  isLoggedIn={isLoggedIn}
  hasSavedConditionPreset={hasSavedConditionPreset}
  isConditionDirty={isConditionDirty}
  errorMessage={activeError}
  isLoading={isEvaluating}
  isSaving={isSavingCondition}
  onChange={updateCondition}
  onEvaluate={handleEvaluate}
  onSave={saveCondition}
  onLoginAndSave={loginAndSaveCondition}
  onRestoreDefault={restoreSavedCondition}
  onModeChange={changeMode}
/>
```

변경 후:
```tsx
<MobileConditionSheet
  condition={condition}
  isLoggedIn={isLoggedIn}
/>
```

- [ ] **Step 3: 타입 체크**

```bash
PATH="/opt/homebrew/opt/node@21/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" pnpm typecheck 2>&1 | tail -20
```

예상 출력: `Found 0 errors.`

- [ ] **Step 4: 커밋**

```bash
git add features/recommendations/components/MobileConditionSheet.tsx app/recommendations/page.tsx
git commit -m "refactor: MobileConditionSheet 바텀시트 제거, 조건 설정 페이지 이동으로 전환"
```

---

## Task 2: ConditionWizardStep1 — progressive prop 추가

**Files:**
- Modify: `features/recommendations/components/ConditionWizardStep1.tsx`

`progressive?: boolean` prop 추가 (기본값 `false`). `progressive={true}`이면 이전 필드를 입력해야 다음 필드가 애니메이션과 함께 나타난다. `progressive={false}`이면 기존 동작 그대로.

**필드 공개 순서 (progressive=true):**
1. `availableCash` — 항상 표시
2. `monthlyIncome` — `availableCash > 0`
3. `houseOwnership` — `monthlyIncome > 0`
4. `monthlyExpenses` (로그인) — `houseOwnership !== null`
5. `employmentType` (로그인) — `monthlyExpenses > 0`
6. 다음 버튼 — `isStep1ReadyByAuth()`

- [ ] **Step 1: ProgressiveSlot 헬퍼를 파일 상단에 추가**

`ConditionWizardStep1.tsx` 상단 import 아래, Props 타입 정의 위에 삽입:

```tsx
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils/cn";
```

> `useId`는 이미 import되어 있으므로 `useEffect`, `useRef`, `cn`만 추가. `cn`이 이미 import되어 있다면 건너뜀.

그리고 `NumberField` 함수 정의 직전에 삽입:

```tsx
function ProgressiveSlot({
  visible,
  children,
}: {
  visible: boolean;
  children: React.ReactNode;
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
```

- [ ] **Step 2: Props 타입에 progressive 추가**

```tsx
type Props = {
  condition: RecommendationCondition;
  isLoggedIn: boolean;
  onChange: (patch: Partial<RecommendationCondition>) => void;
  onNext: () => void;
  onReset: () => void;
  progressive?: boolean;
};
```

- [ ] **Step 3: 컴포넌트 함수 시그니처 업데이트**

```tsx
export default function ConditionWizardStep1({
  condition,
  isLoggedIn,
  onChange,
  onNext,
  onReset,
  progressive = false,
}: Props) {
```

- [ ] **Step 4: progressive=true 시 반환할 JSX 추가**

`const isReady = ...` 줄 바로 다음에 삽입:

```tsx
  if (progressive) {
    const showIncome = condition.availableCash > 0;
    const showOwnership = condition.monthlyIncome > 0;
    const showExpenses = condition.houseOwnership !== null;
    const showEmployment = condition.monthlyExpenses > 0;

    return (
      <div className="space-y-5">
        <div className="space-y-0.5">
          <div className="flex items-start justify-between gap-3">
            <p className="ob-typo-subtitle font-semibold text-(--oboon-text-title)">
              재무 정보
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
            기본 자금 조건을 입력해주세요
          </p>
        </div>

        <ProgressiveSlot visible={true}>
          <NumberField
            label="가용 현금"
            value={condition.availableCash}
            placeholder="예: 8,000"
            onChange={(availableCash) => onChange({ availableCash })}
          />
        </ProgressiveSlot>

        <ProgressiveSlot visible={showIncome}>
          <NumberField
            label="월 소득"
            value={condition.monthlyIncome}
            placeholder="예: 400"
            onChange={(monthlyIncome) => onChange({ monthlyIncome })}
          />
        </ProgressiveSlot>

        <ProgressiveSlot visible={showOwnership}>
          <label>
            <span className={LABEL}>보유 주택</span>
            <Select
              value={(condition.houseOwnership ?? "") as "none" | "one" | "two_or_more"}
              onChange={(houseOwnership) => onChange({ houseOwnership })}
              options={HOUSE_OPTIONS}
            />
          </label>
        </ProgressiveSlot>

        {isLoggedIn && (
          <ProgressiveSlot visible={showExpenses}>
            <NumberField
              label="월 지출"
              value={condition.monthlyExpenses}
              placeholder="예: 150"
              onChange={(monthlyExpenses) => onChange({ monthlyExpenses })}
            />
          </ProgressiveSlot>
        )}

        {isLoggedIn && (
          <ProgressiveSlot visible={showEmployment}>
            <label>
              <span className={LABEL}>직업</span>
              <Select<EmploymentType>
                value={(condition.employmentType ?? "") as EmploymentType}
                onChange={(employmentType) => onChange({ employmentType })}
                options={EMPLOYMENT_OPTIONS}
              />
            </label>
          </ProgressiveSlot>
        )}

        <ProgressiveSlot visible={isReady}>
          <button
            type="button"
            disabled={!isReady}
            onClick={onNext}
            className="h-11 w-full rounded-full bg-(--oboon-primary) text-white ob-typo-button transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
          >
            다음 단계 →
          </button>
        </ProgressiveSlot>
      </div>
    );
  }
```

- [ ] **Step 5: 타입 체크**

```bash
PATH="/opt/homebrew/opt/node@21/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" pnpm typecheck 2>&1 | tail -20
```

예상 출력: `Found 0 errors.`

- [ ] **Step 6: 커밋**

```bash
git add features/recommendations/components/ConditionWizardStep1.tsx
git commit -m "feat: ConditionWizardStep1 progressive 필드 순차 공개 추가"
```

---

## Task 3: ConditionWizardStep2 — progressive prop 추가

**Files:**
- Modify: `features/recommendations/components/ConditionWizardStep2.tsx`

`progressive?: boolean` prop 추가. 로그인 사용자 기준 필드 공개 순서:
1. `existingLoan` — 항상
2. `cardLoanUsage` — `existingLoan !== null`
3. `recentDelinquency` (대출 있을 때만) — `cardLoanUsage !== null && hasLoan`
4. `loanRejection` (대출 있을 때만) — `recentDelinquency !== null`
5. `monthlyIncomeRange` — `cardLoanUsage !== null && (hasLoan ? loanRejection !== null : true)`
6. `existingMonthlyRepayment` — `monthlyIncomeRange !== null`
7. LTV/DSR 미리보기 + 다음 버튼 — 항상 (데이터 유무에 따라 내용 달라짐)

게스트 모드: `progressive` prop 무시, 기존 단순 UI 그대로.

- [ ] **Step 1: ProgressiveSlot 헬퍼를 파일 상단에 추가**

`ConditionWizardStep2.tsx` 상단에 아래 import 추가:

```tsx
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils/cn";
```

그리고 `gradeColor` 함수 정의 직전에 `ProgressiveSlot` 삽입 (Task 2 Step 1과 동일한 코드):

```tsx
function ProgressiveSlot({
  visible,
  children,
}: {
  visible: boolean;
  children: React.ReactNode;
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
```

- [ ] **Step 2: Props 타입에 progressive 추가**

```tsx
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
```

- [ ] **Step 3: 컴포넌트 함수 시그니처 업데이트**

```tsx
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
```

- [ ] **Step 4: progressive=true (로그인) 시 반환할 JSX 추가**

`if (!isLoggedIn) { return ... }` 블록 바로 앞에 삽입:

```tsx
  if (progressive && isLoggedIn) {
    const showCardLoan = condition.existingLoan !== null;
    const showDelinquency = condition.cardLoanUsage !== null && hasLoan;
    const showRejection = condition.recentDelinquency !== null && hasLoan;
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
          <label>
            <span className={LABEL}>현재 대출</span>
            <Select<ExistingLoanAmount>
              value={(condition.existingLoan ?? "") as ExistingLoanAmount}
              onChange={(existingLoan) => patchLoggedIn({ existingLoan })}
              options={LOAN_OPTIONS}
            />
          </label>
        </ProgressiveSlot>

        <ProgressiveSlot visible={showCardLoan}>
          <label>
            <span className={LABEL}>카드론 / 현금서비스 사용</span>
            <Select<CardLoanUsage>
              value={(condition.cardLoanUsage ?? "") as CardLoanUsage}
              onChange={(cardLoanUsage) => patchLoggedIn({ cardLoanUsage })}
              options={CARD_LOAN_OPTIONS}
            />
          </label>
        </ProgressiveSlot>

        <ProgressiveSlot visible={showDelinquency}>
          <label>
            <span className={LABEL}>최근 1년 대출 연체</span>
            <Select<DelinquencyCount>
              value={(condition.recentDelinquency ?? "") as DelinquencyCount}
              onChange={(recentDelinquency) => patchLoggedIn({ recentDelinquency })}
              options={DELINQUENCY_OPTIONS}
            />
          </label>
        </ProgressiveSlot>

        <ProgressiveSlot visible={showRejection}>
          <label>
            <span className={LABEL}>대출 심사 거절 경험</span>
            <Select<LoanRejection>
              value={(condition.loanRejection ?? "") as LoanRejection}
              onChange={(loanRejection) => patchLoggedIn({ loanRejection })}
              options={LOAN_REJECTION_OPTIONS}
            />
          </label>
        </ProgressiveSlot>

        <ProgressiveSlot visible={showIncomeRange}>
          <label>
            <span className={LABEL}>월 평균 세후 소득</span>
            <Select<MonthlyIncomeRange>
              value={(condition.monthlyIncomeRange ?? "") as MonthlyIncomeRange}
              onChange={(monthlyIncomeRange) => patchLoggedIn({ monthlyIncomeRange })}
              options={INCOME_RANGE_OPTIONS}
            />
          </label>
        </ProgressiveSlot>

        <ProgressiveSlot visible={showRepayment}>
          <label>
            <span className={LABEL}>월 대출 상환액</span>
            <Select<MonthlyLoanRepayment>
              value={condition.existingMonthlyRepayment}
              onChange={(existingMonthlyRepayment) =>
                patchLoggedIn({ existingMonthlyRepayment })
              }
              options={REPAYMENT_OPTIONS}
            />
          </label>
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
                    { label: "LTV", value: preview.ltvPoints, max: 10, result: compactPreviewLabel(preview.ltvLabel) },
                    { label: "DSR", value: preview.dsrPoints, max: 10, result: compactPreviewLabel(preview.dsrLabel) },
                    { label: "합산", value: preview.totalPoints, max: 20, result: compactPreviewLabel("LTV+DSR") },
                  ] as const
                ).map(({ label, value, max, result }) => (
                  <div key={label} className="rounded-lg border border-(--oboon-border-default) bg-(--oboon-bg-surface) px-2 py-2.5">
                    <div className="ob-typo-caption text-(--oboon-text-muted)">{label}</div>
                    <div className="mt-1 ob-typo-caption font-semibold" style={{ color: gradeColor(value, max) }}>
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
```

- [ ] **Step 5: 타입 체크**

```bash
PATH="/opt/homebrew/opt/node@21/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" pnpm typecheck 2>&1 | tail -20
```

예상 출력: `Found 0 errors.`

- [ ] **Step 6: 커밋**

```bash
git add features/recommendations/components/ConditionWizardStep2.tsx
git commit -m "feat: ConditionWizardStep2 progressive 필드 순차 공개 추가"
```

---

## Task 4: ConditionWizardStep3 — progressive prop 추가

**Files:**
- Modify: `features/recommendations/components/ConditionWizardStep3.tsx`

`progressive?: boolean` prop 추가. 필드 공개 순서:
1. `purchasePurposeV2` — 항상
2. `purchaseTiming` (로그인) — `purchasePurposeV2 !== null`
3. `moveinTiming` (로그인) — `purchaseTiming !== null`
4. `regions` (로그인) — `moveinTiming !== null`
5. 게스트 로그인 유도 박스 — `purchasePurposeV2 !== null && !isLoggedIn`
6. 완료/이전 버튼 — `isStep3ReadyByAuth()`

- [ ] **Step 1: ProgressiveSlot 헬퍼를 파일 상단에 추가**

`ConditionWizardStep3.tsx` 상단에 import 추가:

```tsx
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils/cn";
```

그리고 `PURPOSE_OPTIONS` 상수 정의 직전에 `ProgressiveSlot` 함수 삽입 (Task 2 Step 1과 동일한 코드).

- [ ] **Step 2: Props 타입에 progressive 추가**

기존 Props 타입의 `finishingLabel?: string;` 아래에 추가:

```tsx
  progressive?: boolean;
```

- [ ] **Step 3: 컴포넌트 함수 시그니처 업데이트**

기존 디스트럭처링에 `progressive = false,` 추가:

```tsx
export default function ConditionWizardStep3({
  condition,
  isLoggedIn,
  onChange,
  onBack,
  onFinish,
  onReset,
  finishLabel = "완료 ✓",
  saveLabel = null,
  onSave,
  isSaving = false,
  isSaveDisabled = false,
  isFinishing = false,
  finishingLabel = "처리 중...",
  progressive = false,
}: Props) {
```

- [ ] **Step 4: progressive=true 시 반환할 JSX 추가**

`const isReady = ...` 줄 바로 다음에 삽입:

```tsx
  if (progressive) {
    const showTiming = condition.purchasePurposeV2 !== null && isLoggedIn;
    const showMovein = condition.purchaseTiming !== null && isLoggedIn;
    const showRegions = condition.moveinTiming !== null && isLoggedIn;
    const showGuestNudge = condition.purchasePurposeV2 !== null && !isLoggedIn;

    return (
      <div className="space-y-5">
        <div className="space-y-0.5">
          <div className="flex items-start justify-between gap-3">
            <p className="ob-typo-subtitle font-semibold text-(--oboon-text-title)">
              라이프스타일
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
            분양 목적과 희망 조건을 선택해주세요
          </p>
        </div>

        <ProgressiveSlot visible={true}>
          <label>
            <span className={LABEL}>분양 목적</span>
            <Select<FullPurchasePurpose>
              value={(condition.purchasePurposeV2 ?? "") as FullPurchasePurpose}
              onChange={(purchasePurposeV2) => onChange({ purchasePurposeV2 })}
              options={PURPOSE_OPTIONS}
            />
          </label>
        </ProgressiveSlot>

        <ProgressiveSlot visible={showTiming}>
          <label>
            <span className={LABEL}>분양 시점</span>
            <Select<PurchaseTiming>
              value={(condition.purchaseTiming ?? "") as PurchaseTiming}
              onChange={(purchaseTiming) => onChange({ purchaseTiming })}
              options={PURCHASE_TIMING_OPTIONS}
            />
          </label>
        </ProgressiveSlot>

        <ProgressiveSlot visible={showMovein}>
          <label>
            <span className={LABEL}>희망 입주</span>
            <Select<MoveinTiming>
              value={(condition.moveinTiming ?? "") as MoveinTiming}
              onChange={(moveinTiming) => onChange({ moveinTiming })}
              options={MOVEIN_OPTIONS}
            />
          </label>
        </ProgressiveSlot>

        <ProgressiveSlot visible={showRegions}>
          <label>
            <span className={LABEL}>선호 지역</span>
            <MultiSelect<OfferingRegionTab>
              values={condition.regions}
              onChange={(regions) => onChange({ regions })}
              options={REGION_OPTIONS}
              placeholder="전체"
            />
          </label>
        </ProgressiveSlot>

        <ProgressiveSlot visible={showGuestNudge}>
          <div className="rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle) p-4">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-(--oboon-border-default) bg-(--oboon-bg-elevated)">
                <Lock className="h-4 w-4 text-(--oboon-text-muted)" />
              </div>
              <div>
                <p className="ob-typo-body font-semibold text-(--oboon-text-title)">생활 조건 반영</p>
                <p className="ob-typo-caption text-(--oboon-text-muted)">
                  로그인하면 추천 정확도를 높이는 생활 조건을 더 입력할 수 있어요.
                </p>
              </div>
            </div>
            <div className="mt-3 flex flex-col items-center gap-2 text-center">
              <button
                type="button"
                onClick={onSave}
                className="inline-flex h-10 items-center justify-center rounded-full bg-(--oboon-primary) px-4 text-white ob-typo-button"
              >
                로그인하고 맞춤 조건 더 입력하기
              </button>
            </div>
          </div>
        </ProgressiveSlot>

        <ProgressiveSlot visible={isReady}>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onBack}
              disabled={isFinishing}
              className="h-10 flex-1 rounded-full border border-(--oboon-border-default) ob-typo-button text-(--oboon-text-muted) disabled:cursor-not-allowed disabled:opacity-40"
            >
              이전
            </button>
            <button
              type="button"
              disabled={!isReady || isFinishing}
              onClick={onFinish}
              className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-full bg-(--oboon-primary) text-white ob-typo-button disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isFinishing ? (
                <>
                  <span
                    aria-hidden="true"
                    className="inline-block h-4 w-4 rounded-full border-2 border-(--oboon-spinner-ring) border-t-(--oboon-spinner-head) animate-spin"
                  />
                  <span>{finishingLabel}</span>
                </>
              ) : (
                finishLabel
              )}
            </button>
          </div>
        </ProgressiveSlot>
      </div>
    );
  }
```

- [ ] **Step 5: 타입 체크**

```bash
PATH="/opt/homebrew/opt/node@21/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" pnpm typecheck 2>&1 | tail -20
```

예상 출력: `Found 0 errors.`

- [ ] **Step 6: 커밋**

```bash
git add features/recommendations/components/ConditionWizardStep3.tsx
git commit -m "feat: ConditionWizardStep3 progressive 필드 순차 공개 추가"
```

---

## Task 5: conditions/layout.tsx — 공통 레이아웃

**Files:**
- Create: `app/recommendations/conditions/layout.tsx`

`usePathname()`으로 현재 스텝을 파악해 `WizardStepIndicator`에 전달. 뒤로가기 버튼은 스텝별 이전 경로로 이동. 데스크탑(640px 이상)에서 `/recommendations`로 redirect.

- [ ] **Step 1: layout.tsx 파일 생성**

```tsx
"use client";

import { ChevronLeft } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import WizardStepIndicator from "@/features/recommendations/components/WizardStepIndicator";

function resolveStep(pathname: string): 0 | 1 | 2 {
  if (pathname.endsWith("/step/2")) return 1;
  if (pathname.endsWith("/step/3") || pathname.endsWith("/done")) return 2;
  return 0;
}

function resolveBackPath(pathname: string): string | null {
  if (pathname.endsWith("/done")) return null;
  if (pathname.endsWith("/step/1")) return "/recommendations";
  if (pathname.endsWith("/step/2")) return "/recommendations/conditions/step/1";
  if (pathname.endsWith("/step/3")) return "/recommendations/conditions/step/2";
  return "/recommendations";
}

export default function ConditionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const step = resolveStep(pathname);
  const backPath = resolveBackPath(pathname);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    if (mq.matches) {
      router.replace("/recommendations");
      return;
    }
    const handler = (e: MediaQueryListEvent) => {
      if (e.matches) router.replace("/recommendations");
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [router]);

  return (
    <div className="flex min-h-dvh flex-col bg-(--oboon-bg-page)">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-(--oboon-border-default) bg-(--oboon-bg-page) px-4 py-3">
        <div className="w-9">
          {backPath !== null && (
            <button
              type="button"
              onClick={() => router.push(backPath)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-(--oboon-border-default)"
              aria-label="뒤로"
            >
              <ChevronLeft className="h-4 w-4 text-(--oboon-text-muted)" />
            </button>
          )}
        </div>
        <div className="flex flex-1 justify-center">
          <WizardStepIndicator currentStep={step} />
        </div>
        <div className="w-9" aria-hidden="true" />
      </header>
      <main className="flex-1 overflow-y-auto px-4 py-6">{children}</main>
    </div>
  );
}
```

- [ ] **Step 2: 커밋**

```bash
git add app/recommendations/conditions/layout.tsx
git commit -m "feat: 조건 설정 페이지 공통 레이아웃 추가"
```

---

## Task 6: conditions/step/[step]/page.tsx — 스텝 렌더러

**Files:**
- Create: `app/recommendations/conditions/step/[step]/page.tsx`

각 스텝 컴포넌트를 `progressive={true}`로 렌더링. `useRecommendations`에서 `condition`, `updateCondition`, `isLoggedIn`, `loginAndSaveCondition`을 가져온다.

- [ ] **Step 1: page.tsx 파일 생성**

```tsx
"use client";

import { notFound } from "next/navigation";
import { use } from "react";
import { useRouter } from "next/navigation";

import ConditionWizardStep1 from "@/features/recommendations/components/ConditionWizardStep1";
import ConditionWizardStep2 from "@/features/recommendations/components/ConditionWizardStep2";
import ConditionWizardStep3 from "@/features/recommendations/components/ConditionWizardStep3";
import { useRecommendations } from "@/features/recommendations/hooks/useRecommendations";

export default function ConditionStepPage({
  params,
}: {
  params: Promise<{ step: string }>;
}) {
  const { step } = use(params);
  const router = useRouter();

  const { condition, updateCondition, isLoggedIn, loginAndSaveCondition } =
    useRecommendations();

  if (step !== "1" && step !== "2" && step !== "3") {
    notFound();
  }

  const handleReset = () => router.push("/recommendations");

  if (step === "1") {
    return (
      <ConditionWizardStep1
        condition={condition}
        isLoggedIn={isLoggedIn}
        onChange={updateCondition}
        onNext={() => router.push("/recommendations/conditions/step/2")}
        onReset={handleReset}
        progressive
      />
    );
  }

  if (step === "2") {
    return (
      <ConditionWizardStep2
        condition={condition}
        isLoggedIn={isLoggedIn}
        onChange={updateCondition}
        onNext={() => router.push("/recommendations/conditions/step/3")}
        onBack={() => router.push("/recommendations/conditions/step/1")}
        onLoginAndSave={loginAndSaveCondition}
        onReset={handleReset}
        progressive
      />
    );
  }

  // step === "3"
  return (
    <ConditionWizardStep3
      condition={condition}
      isLoggedIn={isLoggedIn}
      onChange={updateCondition}
      onBack={() => router.push("/recommendations/conditions/step/2")}
      onFinish={() => router.push("/recommendations/conditions/done")}
      onReset={handleReset}
      finishLabel="완료 ✓"
      progressive
    />
  );
}
```

- [ ] **Step 2: 타입 체크**

```bash
PATH="/opt/homebrew/opt/node@21/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" pnpm typecheck 2>&1 | tail -20
```

예상 출력: `Found 0 errors.`

- [ ] **Step 3: 커밋**

```bash
git add "app/recommendations/conditions/step/"
git commit -m "feat: 조건 설정 스텝 페이지 추가 (progressive 모드)"
```

---

## Task 7: conditions/done/page.tsx — 완료 화면

**Files:**
- Create: `app/recommendations/conditions/done/page.tsx`

마운트 시 로그인 사용자면 `saveCondition()` 호출. 3초 후 `/recommendations` 자동 이동. "추천 결과 보기" 버튼으로 즉시 이동 가능.

- [ ] **Step 1: done/page.tsx 파일 생성**

```tsx
"use client";

import { CheckCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import Button from "@/components/ui/Button";
import { useRecommendations } from "@/features/recommendations/hooks/useRecommendations";

export default function ConditionsDonePage() {
  const router = useRouter();
  const { isLoggedIn, saveCondition } = useRecommendations();

  useEffect(() => {
    if (isLoggedIn && saveCondition) {
      void saveCondition();
    }
    const timer = setTimeout(() => {
      router.push("/recommendations");
    }, 3000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col items-center justify-center gap-6 pt-16 text-center">
      <CheckCircle className="h-16 w-16 text-(--oboon-primary)" strokeWidth={1.5} />
      <div className="space-y-2">
        <p className="ob-typo-h2 text-(--oboon-text-title)">조건이 저장됐어요</p>
        <p className="ob-typo-body text-(--oboon-text-muted)">
          {isLoggedIn
            ? "다음에 다시 접속해도 조건이 유지돼요."
            : "로그인하면 다음에도 유지돼요."}
        </p>
      </div>
      <Button
        variant="primary"
        shape="pill"
        onClick={() => router.push("/recommendations")}
      >
        추천 결과 보기
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: 타입 체크 + 빌드**

```bash
PATH="/opt/homebrew/opt/node@21/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" pnpm typecheck 2>&1 | tail -20
PATH="/opt/homebrew/opt/node@21/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" pnpm build 2>&1 | tail -30
```

두 명령 모두 에러 없이 통과해야 한다.

- [ ] **Step 3: 최종 커밋**

```bash
git add app/recommendations/conditions/done/page.tsx
git commit -m "feat: 조건 설정 완료 화면 추가"
```

---

## 셀프 리뷰 체크리스트

- [x] **Spec 커버리지**: 모든 스텝에 progressive prop, 필드 공개 순서 테이블 기반으로 구현
- [x] **Placeholder 없음**: 모든 스텝에 실제 코드 포함
- [x] **타입 일관성**: `progressive?: boolean` 기본값 `false`, 기존 사용처(`ConditionWizard.tsx`)는 prop 전달 안 하므로 `false`로 동작 — 변경 없음
- [x] **ProgressiveSlot**: 3개 파일에 동일 코드 → 중복이지만 각 파일 자립성 유지. (향후 공유 util로 이동 가능)
- [x] **데스크탑 보호**: layout.tsx useEffect에서 640px 이상 시 redirect
- [x] **게스트 처리**: done 페이지 `isLoggedIn` 분기, Step3 게스트 nudge 박스
- [x] **빌드 검증**: Task 6, 7에서 typecheck + build 포함
- [x] **기존 동작 보호**: `ConditionWizard.tsx`는 `progressive` prop 미전달 → `false` 기본값으로 기존 desktop 동작 유지
