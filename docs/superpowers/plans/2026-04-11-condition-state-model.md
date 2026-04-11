# Condition State Model Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify logged-in and logged-out condition state handling so shared inputs, derived credit state, and session persistence all follow one model.

**Architecture:** Keep a single `RecommendationCondition` shape for all recommendation and validation flows, but make credit state nullable until it is either chosen by the guest or derived from `ltvInternalScore`. Move repeated credit-grade conversion helpers and empty-condition factories into shared domain helpers so UI components, session persistence, and API request builders all use the same source of truth.

**Tech Stack:** TypeScript, React, Next.js, existing condition-validation and recommendations modules

---

### Task 1: Add shared condition-state helpers

**Files:**
- Create: `features/condition-validation/domain/conditionState.ts`

- [ ] **Step 1: Write the helper module**

```ts
import type { CreditGrade } from "@/features/condition-validation/domain/types";
import type { RecommendationCondition } from "@/features/recommendations/hooks/useRecommendations";

export function createEmptyRecommendationCondition(): RecommendationCondition {
  return {
    availableCash: 0,
    monthlyIncome: 0,
    ownedHouseCount: 0,
    creditGrade: null,
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
    existingMonthlyRepayment: null,
    regions: [],
  };
}

export function creditGradeFromLtvInternalScore(
  score: number | null | undefined,
): CreditGrade | null {
  if (score == null || score <= 0) return null;
  if (score >= 70) return "good";
  if (score >= 40) return "normal";
  return "unstable";
}

export function ltvInternalScoreFromCreditGrade(
  creditGrade: CreditGrade | null | undefined,
): number | null {
  if (creditGrade === "good") return 80;
  if (creditGrade === "normal") return 55;
  if (creditGrade === "unstable") return 20;
  return null;
}
```

- [ ] **Step 2: Replace duplicated helper implementations**

```ts
// In each consumer, import from "@/features/condition-validation/domain/conditionState"
// and remove local copies of credit-grade conversion logic.
```

- [ ] **Step 3: Verify the helper compiles**

Run: `node_modules/.bin/tsc --noEmit --incremental false`
Expected: no type errors in the new helper.

### Task 2: Make recommendation state nullable for guest credit selection

**Files:**
- Modify: `features/recommendations/hooks/useRecommendations.ts`
- Modify: `app/recommendations/conditions/ConditionStepFlow.client.tsx`
- Modify: `features/recommendations/components/ConditionBar.tsx`
- Modify: `features/recommendations/components/SimulatorBar.tsx`
- Modify: `features/recommendations/components/ConditionWizardStep2.tsx`

- [ ] **Step 1: Update the shared condition type and defaults**

```ts
export type RecommendationCondition = {
  availableCash: number;
  monthlyIncome: number;
  ownedHouseCount: OwnedHouseCount;
  creditGrade: CreditGrade | null;
  purchasePurpose: PurchasePurpose;
  employmentType: EmploymentType | null;
  monthlyExpenses: number;
  houseOwnership: "none" | "one" | "two_or_more" | null;
  purchasePurposeV2: FullPurchasePurpose | null;
  purchaseTiming: PurchaseTiming | null;
  moveinTiming: MoveinTiming | null;
  ltvInternalScore: number;
  existingLoan: ExistingLoanAmount | null;
  recentDelinquency: DelinquencyCount | null;
  cardLoanUsage: CardLoanUsage | null;
  loanRejection: LoanRejection | null;
  monthlyIncomeRange: MonthlyIncomeRange | null;
  existingMonthlyRepayment: MonthlyLoanRepayment | null;
  regions: OfferingRegionTab[];
};

const DEFAULT_CONDITION = createEmptyRecommendationCondition();
```

- [ ] **Step 2: Resolve creditGrade from either guest choice or LTV score before requests**

```ts
function resolveCreditGrade(condition: RecommendationCondition): CreditGrade | null {
  return (
    condition.creditGrade ??
    creditGradeFromLtvInternalScore(condition.ltvInternalScore)
  );
}
```

- [ ] **Step 3: Update guest UI to use `null` as the unselected state**

```ts
const [guestCreditGrade, setGuestCreditGrade] = useState<CreditGrade | null>(null);
```

- [ ] **Step 4: Ensure guest evaluation blocks until a credit grade is chosen**

```ts
if (resolvedCreditGrade === null) {
  setErrorMessage("신용 상태를 선택해주세요.");
  return false;
}
```

- [ ] **Step 5: Run focused type-checking**

Run: `node_modules/.bin/tsc --noEmit --incremental false`
Expected: the new nullable type is accepted everywhere that renders the placeholder or resolves the score.

### Task 3: Remove local credit-grade duplication in offerings flows

**Files:**
- Modify: `features/offerings/components/HomeOfferingsSection.client.tsx`
- Modify: `features/offerings/components/detail/ConditionValidationCard.tsx`
- Modify: `features/offerings/components/detail/OfferingDetailRight.tsx`
- Modify: `features/offerings/services/offering.compare.ts`

- [ ] **Step 1: Swap local conversion helpers for the shared helper**

```ts
import {
  creditGradeFromLtvInternalScore,
  ltvInternalScoreFromCreditGrade,
} from "@/features/condition-validation/domain/conditionState";
```

- [ ] **Step 2: Update guest credit state initialization to start at `null`**

```ts
const [guestCreditGrade, setGuestCreditGrade] = useState<CreditGrade | null>(null);
```

- [ ] **Step 3: Keep logged-in derivation behavior**

```ts
if (patch.ltvInternalScore !== undefined) {
  setLtvInternalScore(patch.ltvInternalScore);
  if (isLoggedIn === false) {
    setGuestCreditGrade(creditGradeFromLtvInternalScore(patch.ltvInternalScore));
  }
}
```

- [ ] **Step 4: Verify the offering pages still derive consistent scores**

Run: `node_modules/.bin/tsc --noEmit --incremental false`
Expected: no unresolved references to removed local helper functions.

### Task 4: Smoke-test the recommendation and validation flows

**Files:**
- Modify: none

- [ ] **Step 1: Check the guest wizard renders the placeholder**

Expected behavior: the guest credit select shows `선택` before interaction and only changes after a user choice.

- [ ] **Step 2: Check the guest evaluation gate**

Expected behavior: clicking evaluate with no credit selection surfaces a validation message instead of sending a request.

- [ ] **Step 3: Check session restore still works**

Expected behavior: saved guest and logged-in condition sessions restore the same shared inputs without forcing a credit default.

- [ ] **Step 4: Commit the implementation**

```bash
git add .
git commit -m "feat: unify recommendation condition state"
```
