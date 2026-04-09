# Recommendation Category Reason Copy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 추천 결과의 카테고리별 상세 문구를 사용자용 설명문으로 교체하고, 공개/비공개 정책에 맞춰 수치 노출을 제어한다.

**Architecture:** 기존 점수 계산 로직은 유지하고, 별도의 카테고리 설명문 생성 레이어를 추가한다. 추천 훅과 상세 조건 검증 카드가 이 설명문 레이어를 공통으로 사용하도록 연결하고, 비공개 매물에서는 자금 항목만 수치 비공개 분기를 적용한다.

**Tech Stack:** Next.js App Router, React 18, TypeScript, existing recommendation hooks, condition-validation domain logic, Node test runner

---

## File Structure

- Create: `features/recommendations/lib/recommendationCategoryReason.ts`
  - 카테고리별 사용자용 설명문 생성 전담 유틸
- Modify: `features/recommendations/hooks/useRecommendations.ts`
  - 추천 타입 결과의 raw reason을 사용자용 reason으로 재매핑
- Modify: `features/offerings/components/detail/ConditionValidationCard.tsx`
  - 상세 조건 검증 카드의 카테고리 reason을 사용자용 설명문으로 교체
- Modify: `features/recommendations/components/RecommendationUnitTypePanel.tsx`
  - 열림 상태의 타입 카드 안에서 카테고리별 설명문이 실제로 읽히도록 최소 노출 추가
- Create: `tests/recommendation-category-reason-copy.test.mjs`
  - 설명문 생성 규칙과 비공개 자금 정책 회귀 테스트

### Task 1: Lock The Copy Rules With Failing Tests

**Files:**
- Create: `tests/recommendation-category-reason-copy.test.mjs`
- Test: `tests/recommendation-category-reason-copy.test.mjs`

- [ ] **Step 1: Write the failing test for public cash shortage copy**

```js
import assert from "node:assert/strict";
import test from "node:test";

import {
  buildRecommendationCategoryReason,
} from "../features/recommendations/lib/recommendationCategoryReason.ts";

test("cash reason shows shortage amount for public-price units", () => {
  const reason = buildRecommendationCategoryReason({
    key: "cash",
    grade: "ORANGE",
    isPricePublic: true,
    metrics: {
      availableCash: 8000,
      contractAmount: 7000,
      recommendedCash: 11200,
      minCash: 9200,
      monthlyPaymentEst: null,
      monthlyBurdenPercent: null,
      timingMonthsDiff: null,
    },
    inputs: {
      houseOwnership: "none",
      purchasePurpose: "residence",
    },
  });

  assert.match(reason, /약 3,200만원 부족/);
  assert.match(reason, /자금 항목 평가가 낮아졌어요/);
});
```

- [ ] **Step 2: Write the failing test for private-price cash copy**

```js
test("cash reason hides shortage amount for private-price units", () => {
  const reason = buildRecommendationCategoryReason({
    key: "cash",
    grade: "ORANGE",
    isPricePublic: false,
    metrics: {
      availableCash: 8000,
      contractAmount: 7000,
      recommendedCash: 11200,
      minCash: 9200,
      monthlyPaymentEst: null,
      monthlyBurdenPercent: null,
      timingMonthsDiff: null,
    },
    inputs: {
      houseOwnership: "none",
      purchasePurpose: "residence",
    },
  });

  assert.doesNotMatch(reason, /3,200/);
  assert.doesNotMatch(reason, /권장 자금 기준보다 약/);
  assert.match(reason, /권장 자금 기준에 다소 못 미쳐/);
});
```

- [ ] **Step 3: Write the failing test for ownership and purpose explanation**

```js
test("ownership and purpose reasons are explanation-first, not raw labels", () => {
  const ownershipReason = buildRecommendationCategoryReason({
    key: "ownership",
    grade: "GREEN",
    isPricePublic: true,
    metrics: {},
    inputs: {
      houseOwnership: "none",
      purchasePurpose: "residence",
    },
  });

  const purposeReason = buildRecommendationCategoryReason({
    key: "purpose",
    grade: "GREEN",
    isPricePublic: true,
    metrics: {},
    inputs: {
      houseOwnership: "none",
      purchasePurpose: "residence",
    },
  });

  assert.notEqual(ownershipReason, "무주택");
  assert.match(ownershipReason, /무주택 조건이라/);
  assert.notEqual(purposeReason, "실거주");
  assert.match(purposeReason, /실거주 목적이라/);
});
```

- [ ] **Step 4: Write the failing test for timing and burden numeric phrasing**

```js
test("timing and burden reasons include numeric context when available", () => {
  const timingReason = buildRecommendationCategoryReason({
    key: "timing",
    grade: "YELLOW",
    isPricePublic: true,
    metrics: {
      timingMonthsDiff: 4,
    },
    inputs: {
      houseOwnership: "none",
      purchasePurpose: "residence",
    },
  });

  const incomeReason = buildRecommendationCategoryReason({
    key: "income",
    grade: "ORANGE",
    isPricePublic: true,
    metrics: {
      monthlyBurdenPercent: 42,
    },
    inputs: {
      houseOwnership: "none",
      purchasePurpose: "residence",
    },
  });

  assert.match(timingReason, /약 4개월/);
  assert.match(incomeReason, /42%/);
});
```

- [ ] **Step 5: Run the new test file to verify RED**

Run:

```bash
PATH=/opt/homebrew/bin:$PATH /opt/homebrew/bin/node --test tests/recommendation-category-reason-copy.test.mjs
```

Expected: FAIL because `recommendationCategoryReason.ts` does not exist yet.

### Task 2: Add The Shared Reason Builder

**Files:**
- Create: `features/recommendations/lib/recommendationCategoryReason.ts`
- Test: `tests/recommendation-category-reason-copy.test.mjs`

- [ ] **Step 1: Create the reason-builder types and helper signatures**

```ts
import type { FinalGrade5, FullPurchasePurpose } from "@/features/condition-validation/domain/types";

export type RecommendationReasonCategoryKey =
  | "cash"
  | "income"
  | "ltvDsr"
  | "credit"
  | "ownership"
  | "purpose"
  | "timing";

type RecommendationReasonMetrics = {
  availableCash?: number | null;
  contractAmount?: number | null;
  minCash?: number | null;
  recommendedCash?: number | null;
  monthlyPaymentEst?: number | null;
  monthlyBurdenPercent?: number | null;
  timingMonthsDiff?: number | null;
};

type RecommendationReasonInputs = {
  houseOwnership?: "none" | "one" | "two_or_more" | null;
  purchasePurpose?: FullPurchasePurpose | null;
};

export function buildRecommendationCategoryReason(args: {
  key: RecommendationReasonCategoryKey;
  grade: FinalGrade5;
  isPricePublic: boolean;
  metrics?: RecommendationReasonMetrics;
  inputs?: RecommendationReasonInputs;
  rawReason?: string | null;
}): string
```

- [ ] **Step 2: Implement cash copy rules including private-price masking**

```ts
function formatManwon(value: number) {
  return `${Math.round(value).toLocaleString("ko-KR")}만원`;
}

function buildCashReason(args: {
  grade: FinalGrade5;
  isPricePublic: boolean;
  availableCash?: number | null;
  recommendedCash?: number | null;
}): string {
  const shortage =
    args.availableCash != null && args.recommendedCash != null
      ? Math.max(0, Math.round(args.recommendedCash - args.availableCash))
      : null;

  if (args.grade === "GREEN" || args.grade === "LIME") {
    return args.isPricePublic
      ? "권장 자금 기준을 충분히 넘어서 자금 여유가 안정적으로 반영됐어요."
      : "자금 여유가 충분한 편으로 반영됐어요.";
  }

  if (shortage !== null && shortage > 0 && args.isPricePublic) {
    return `권장 자금 기준보다 약 ${formatManwon(shortage)} 부족해서 자금 항목 평가가 낮아졌어요.`;
  }

  if (args.grade === "YELLOW") {
    return "계약금은 가능하지만 자금 여유가 크지 않은 편으로 반영됐어요.";
  }

  return "권장 자금 기준에 다소 못 미쳐 자금 항목이 보수적으로 반영됐어요.";
}
```

- [ ] **Step 3: Implement ownership, purpose, burden, timing, and fallback builders**

```ts
function buildOwnershipReason(houseOwnership?: "none" | "one" | "two_or_more" | null) {
  if (houseOwnership === "none") {
    return "무주택 조건이라 현재 추천 기준에서 유리하게 반영됐어요.";
  }
  if (houseOwnership === "one") {
    return "1주택 조건이라 일부 기준에서 보수적으로 반영됐어요.";
  }
  if (houseOwnership === "two_or_more") {
    return "기존 주택 보유 수가 있어 해당 항목 평가는 낮아졌어요.";
  }
  return "주택 보유 조건을 종합해 반영했어요.";
}

function buildPurposeReason(purchasePurpose?: FullPurchasePurpose | null) {
  if (purchasePurpose === "residence") {
    return "실거주 목적이라 현재 추천 기준과 잘 맞는 편으로 반영됐어요.";
  }
  if (purchasePurpose === "long_term") {
    return "장기 보유 목적이라 실거주와 투자 성향이 함께 반영됐어요.";
  }
  if (purchasePurpose === "investment_rent") {
    return "임대수익 중심의 투자 목적이라 해당 항목 평가는 보수적으로 반영됐어요.";
  }
  if (purchasePurpose === "investment_capital") {
    return "시세차익 중심의 투자 목적이라 해당 항목 평가는 상대적으로 낮아졌어요.";
  }
  return "구매 목적을 기준으로 적합도를 반영했어요.";
}

function buildIncomeReason(monthlyBurdenPercent?: number | null) {
  if (monthlyBurdenPercent == null) {
    return "상환 부담 수준을 종합해 반영했어요.";
  }
  if (monthlyBurdenPercent < 30) {
    return "예상 월 부담이 소득 대비 무리 없는 수준이라 안정적으로 반영됐어요.";
  }
  return `예상 월 부담이 월소득의 ${Math.round(monthlyBurdenPercent)}% 수준이라 상환 부담이 다소 높은 편으로 반영됐어요.`;
}

function buildTimingReason(monthsDiff?: number | null) {
  if (monthsDiff == null) {
    return "희망 시점과 공급 일정을 종합해 반영했어요.";
  }
  if (monthsDiff <= 1) {
    return "희망 시점과 실제 일정 차이가 크지 않아 무난하게 반영됐어요.";
  }
  return `희망 시점과 실제 일정 차이가 약 ${monthsDiff}개월 있어 시점 적합도가 낮아졌어요.`;
}
```

- [ ] **Step 4: Implement the main dispatcher with raw-reason fallback**

```ts
export function buildRecommendationCategoryReason(args: {
  key: RecommendationReasonCategoryKey;
  grade: FinalGrade5;
  isPricePublic: boolean;
  metrics?: RecommendationReasonMetrics;
  inputs?: RecommendationReasonInputs;
  rawReason?: string | null;
}): string {
  switch (args.key) {
    case "cash":
      return buildCashReason({
        grade: args.grade,
        isPricePublic: args.isPricePublic,
        availableCash: args.metrics?.availableCash ?? null,
        recommendedCash: args.metrics?.recommendedCash ?? null,
      });
    case "income":
      return buildIncomeReason(args.metrics?.monthlyBurdenPercent ?? null);
    case "ltvDsr":
      return args.grade === "GREEN" || args.grade === "LIME"
        ? "대출 가능 범위와 부담 수준이 전반적으로 무난하게 반영됐어요."
        : "DSR 부담이 높아 대출 여건이 보수적으로 반영됐어요.";
    case "credit":
      return args.grade === "GREEN" || args.grade === "LIME"
        ? "현재 신용 상태가 양호해 대출 관련 평가에 유리하게 반영됐어요."
        : "신용 조건이 다소 불리해 대출 관련 평가는 보수적으로 반영됐어요.";
    case "ownership":
      return buildOwnershipReason(args.inputs?.houseOwnership ?? null);
    case "purpose":
      return buildPurposeReason(args.inputs?.purchasePurpose ?? null);
    case "timing":
      return buildTimingReason(args.metrics?.timingMonthsDiff ?? null);
    default:
      return args.rawReason?.trim() || "현재 조건을 종합해 반영했어요.";
  }
}
```

- [ ] **Step 5: Run the focused test file to verify GREEN**

Run:

```bash
PATH=/opt/homebrew/bin:$PATH /opt/homebrew/bin/node --test tests/recommendation-category-reason-copy.test.mjs
```

Expected: PASS.

- [ ] **Step 6: Commit the shared reason builder**

```bash
git add features/recommendations/lib/recommendationCategoryReason.ts tests/recommendation-category-reason-copy.test.mjs
git commit -m "feat: add recommendation category reason builder"
```

### Task 3: Apply The Reason Builder To Recommendation Unit Types

**Files:**
- Modify: `features/recommendations/hooks/useRecommendations.ts`
- Modify: `features/recommendations/components/RecommendationUnitTypePanel.tsx`
- Test: `tests/recommendation-category-reason-copy.test.mjs`

- [ ] **Step 1: Extend the unit category shape to preserve raw and rendered reasons**

```ts
export type RecommendationUnitTypeCategory = {
  key: RecommendationUnitTypeCategoryKey;
  label: string;
  grade: FinalGrade5;
  score: number | null;
  maxScore: number | null;
  reason: string | null;
  rawReason: string | null;
};
```

- [ ] **Step 2: Import the builder and pass unit-level metrics into category mapping**

```ts
import {
  buildRecommendationCategoryReason,
} from "@/features/recommendations/lib/recommendationCategoryReason";

function mapRecommendationUnitCategory(
  key: RecommendationUnitTypeCategoryKey,
  label: string,
  raw: RawRecommendationUnitTypeCategory,
  unit: RawRecommendationUnitTypeResult,
): RecommendationUnitTypeCategory | null {
  if (!raw?.grade) return null;

  const rawReason = raw.reason?.trim() || null;

  return {
    key,
    label,
    grade: raw.grade,
    score: toFiniteNumber(raw.score),
    maxScore: toFiniteNumber(raw.max_score),
    rawReason,
    reason: buildRecommendationCategoryReason({
      key,
      grade: raw.grade,
      isPricePublic: unit.is_price_public !== false,
      rawReason,
      metrics: {
        availableCash: null,
        contractAmount: toFiniteNumber(unit.metrics?.contract_amount),
        minCash: null,
        recommendedCash: null,
        monthlyPaymentEst: toFiniteNumber(unit.metrics?.monthly_payment_est),
        monthlyBurdenPercent: toFiniteNumber(unit.metrics?.monthly_burden_percent),
        timingMonthsDiff: null,
      },
      inputs: {
        houseOwnership: null,
        purchasePurpose: null,
      },
    }),
  };
}
```

- [ ] **Step 3: Update the call sites to pass the full unit record**

```ts
categories: [
  mapRecommendationUnitCategory("cash", "자금력", unit.categories?.cash ?? null, unit),
  mapRecommendationUnitCategory("income", "소득", unit.categories?.income ?? null, unit),
  mapRecommendationUnitCategory("ltvDsr", "LTV·DSR", unit.categories?.ltv_dsr ?? null, unit),
  mapRecommendationUnitCategory("credit", "신용", unit.categories?.credit ?? null, unit),
  mapRecommendationUnitCategory("ownership", "주택 보유", unit.categories?.ownership ?? null, unit),
  mapRecommendationUnitCategory("purpose", "구매 목적", unit.categories?.purpose ?? null, unit),
  mapRecommendationUnitCategory("timing", "시점", unit.categories?.timing ?? null, unit),
].filter((category): category is RecommendationUnitTypeCategory => Boolean(category)),
```

- [ ] **Step 4: Render the explanation copy inside expanded unit cards**

```tsx
{isOpen ? (
  <div className="mt-2 space-y-2">
    {sortedCategories.slice(0, 3).map((category) => (
      <div
        key={category.key}
        className="rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle) px-3 py-2"
      >
        <div className="ob-typo-caption font-medium text-(--oboon-text-title)">
          {category.label}
        </div>
        <p className="mt-1 ob-typo-caption leading-5 text-(--oboon-text-muted)">
          {category.reason}
        </p>
      </div>
    ))}
  </div>
) : null}
```

- [ ] **Step 5: Add a runtime-focused test for private-price unit cash copy**

```js
import {
  normalizeRecommendationUnitTypesForTest,
} from "../features/recommendations/hooks/useRecommendations.ts";

test("private-price unit types hide cash shortage amounts in rendered reasons", () => {
  const [unit] = normalizeRecommendationUnitTypesForTest([
    {
      unit_type_id: 11,
      unit_type_name: "84A",
      list_price_manwon: 95000,
      is_price_public: false,
      final_grade: "ORANGE",
      total_score: 71,
      categories: {
        cash: {
          grade: "ORANGE",
          score: 16,
          max_score: 30,
          reason: "권장 현금 이상",
        },
      },
      metrics: {
        contract_amount: 9500,
        monthly_payment_est: 280,
        monthly_burden_percent: 42,
      },
    },
  ]);

  assert.ok(unit.categories[0]?.reason);
  assert.doesNotMatch(unit.categories[0].reason, /만원/);
});
```

- [ ] **Step 6: Run the focused test file again**

Run:

```bash
PATH=/opt/homebrew/bin:$PATH /opt/homebrew/bin/node --test tests/recommendation-category-reason-copy.test.mjs
```

Expected: PASS with the unit-type normalization assertion included.

- [ ] **Step 7: Commit the recommendation list integration**

```bash
git add features/recommendations/hooks/useRecommendations.ts features/recommendations/components/RecommendationUnitTypePanel.tsx tests/recommendation-category-reason-copy.test.mjs
git commit -m "feat: explain recommendation unit categories"
```

### Task 4: Apply The Reason Builder To Detail Condition Validation

**Files:**
- Modify: `features/offerings/components/detail/ConditionValidationCard.tsx`
- Test: `tests/recommendation-category-reason-copy.test.mjs`

- [ ] **Step 1: Import the shared builder into the detail card**

```ts
import {
  buildRecommendationCategoryReason,
} from "@/features/recommendations/lib/recommendationCategoryReason";
```

- [ ] **Step 2: Build user-facing reasons before rendering category rows**

```ts
const detailCategoryReason = buildRecommendationCategoryReason({
  key,
  grade: cat.grade,
  isPricePublic: isPricePublic !== false,
  rawReason: cat.reason,
  metrics: {
    availableCash: condition?.availableCash ?? null,
    contractAmount: metrics?.contract_amount ?? null,
    minCash: metrics?.min_cash ?? null,
    recommendedCash: metrics?.recommended_cash ?? null,
    monthlyPaymentEst: metrics?.monthly_payment_est ?? null,
    monthlyBurdenPercent: metrics?.monthly_burden_percent ?? null,
    timingMonthsDiff: derivedTimingMonthsDiff,
  },
  inputs: {
    houseOwnership: condition?.houseOwnership ?? null,
    purchasePurpose: condition?.purchasePurposeV2 ?? null,
  },
});
```

- [ ] **Step 3: Replace direct `cat.reason` rendering with the generated reason**

```tsx
<div
  className="border-l-3 px-3 pb-2 ob-typo-caption text-(--oboon-text-muted)"
  style={{
    backgroundColor: "var(--oboon-bg-surface)",
    borderLeftColor: meta.color,
  }}
>
  {detailCategoryReason}
</div>
```

- [ ] **Step 4: Add an integration-style test for detail card inputs**

```js
test("detail-side cash reason uses shortage amount only for public-price properties", () => {
  const publicReason = buildRecommendationCategoryReason({
    key: "cash",
    grade: "ORANGE",
    isPricePublic: true,
    metrics: {
      availableCash: 8000,
      contractAmount: 7000,
      minCash: 9200,
      recommendedCash: 11200,
    },
    inputs: {
      houseOwnership: "one",
      purchasePurpose: "long_term",
    },
  });

  const privateReason = buildRecommendationCategoryReason({
    key: "cash",
    grade: "ORANGE",
    isPricePublic: false,
    metrics: {
      availableCash: 8000,
      contractAmount: 7000,
      minCash: 9200,
      recommendedCash: 11200,
    },
    inputs: {
      houseOwnership: "one",
      purchasePurpose: "long_term",
    },
  });

  assert.match(publicReason, /만원/);
  assert.doesNotMatch(privateReason, /만원/);
});
```

- [ ] **Step 5: Run the focused test file**

Run:

```bash
PATH=/opt/homebrew/bin:$PATH /opt/homebrew/bin/node --test tests/recommendation-category-reason-copy.test.mjs
```

Expected: PASS.

- [ ] **Step 6: Commit the detail-card integration**

```bash
git add features/offerings/components/detail/ConditionValidationCard.tsx tests/recommendation-category-reason-copy.test.mjs
git commit -m "feat: explain condition validation category reasons"
```

### Task 5: Full Verification

**Files:**
- Test: `tests/recommendation-category-reason-copy.test.mjs`
- Test: `tests/recommendation-unit-parse.test.mjs`
- Test: `tests/recommendation-unit-types.test.mjs`

- [ ] **Step 1: Run the recommendation-focused tests**

Run:

```bash
PATH=/opt/homebrew/bin:$PATH /opt/homebrew/bin/node --test \
  tests/recommendation-category-reason-copy.test.mjs \
  tests/recommendation-unit-parse.test.mjs \
  tests/recommendation-unit-types.test.mjs
```

Expected: PASS for all recommendation copy and unit-type tests.

- [ ] **Step 2: Run typecheck**

Run:

```bash
PATH=/opt/homebrew/bin:$PATH /opt/homebrew/bin/pnpm typecheck
```

Expected: PASS with no TypeScript errors.

- [ ] **Step 3: Manually verify the key UI states**

Run:

```bash
PATH=/opt/homebrew/bin:$PATH /opt/homebrew/bin/pnpm dev
```

Expected manual checks:

- 상세 조건 검증 카드에서 `무주택`, `실거주` 같은 raw label이 그대로 보이지 않는다.
- 공개 매물의 자금 항목은 `약 n만원 부족` 같은 수치가 포함된다.
- 비공개 매물의 자금 항목은 수치 없이 일반화된 설명만 나온다.
- 추천 타입 패널을 열면 카테고리별 설명문이 읽힌다.
- 낮은 평가 항목은 이유가 분명하게 드러난다.

- [ ] **Step 4: Confirm the working tree is limited to planned files**

Run:

```bash
git status --short
```

Expected: only the planned recommendation/detail/test files are modified.

## Self-Review

- Spec coverage:
  - 설명형 reason 레이어: Task 2
  - 공개/비공개 자금 분기: Task 2, Task 4
  - 추천 리스트 타입 결과 반영: Task 3
  - 상세 조건 검증 카드 반영: Task 4
  - 수치화 가능한 항목의 숫자 포함: Task 2
  - 회귀 테스트: Task 1, Task 3, Task 4, Task 5
- Placeholder scan:
  - `TODO`, `TBD`, “적절히” 같은 표현 없이 실제 파일, 코드, 명령으로 작성했다.
- Type consistency:
  - `buildRecommendationCategoryReason`, `RecommendationReasonCategoryKey`, `rawReason`, `reason` 이름을 전 구간에서 일관되게 사용했다.
