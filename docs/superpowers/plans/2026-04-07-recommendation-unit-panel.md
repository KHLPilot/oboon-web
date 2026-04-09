# Recommendation Unit Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 맞춤 현장 추천 리스트에서 평형별 추천 결과를 별도 버튼으로 열어볼 수 있도록 데스크톱 인라인 패널과 모바일 바텀시트를 추가한다.

**Architecture:** 기존 추천 API가 이미 내려주는 `best_unit_type`, `unit_type_results`를 프론트 훅에서 정규화한 뒤, 카드 하단 대표 평형 미리보기와 평형 상세 진입 UI에 연결한다. 데스크톱은 카드 아래 단일 인라인 패널, 모바일은 단일 바텀시트로 분기하고, 개별 평형은 추천 순 정렬 후 아코디언 형태로 세부 점수를 노출한다.

**Tech Stack:** Next.js App Router, React client components, TypeScript, node:test, existing OBOON UI components

---

## File Structure

- Modify: `features/recommendations/hooks/useRecommendations.ts`
  - 추천 응답 타입에 평형 필드를 추가하고, 화면에서 바로 쓸 수 있는 평형 뷰모델을 만든다.
- Create: `features/recommendations/lib/recommendationUnitTypes.ts`
  - 평형 정렬, 대표 평형 미리보기 문구, 카테고리 표시용 유틸을 모은다.
- Create: `features/recommendations/components/RecommendationUnitTypePanel.tsx`
  - 데스크톱 인라인 패널과 평형별 아코디언 리스트를 담당한다.
- Create: `features/recommendations/components/RecommendationUnitTypeSheet.tsx`
  - 모바일 바텀시트와 내부 평형 리스트를 담당한다.
- Modify: `features/recommendations/components/FlippableRecommendationCard.tsx`
  - 카드 하단에 대표 평형 미리보기와 `평형별 자세히 보기` 버튼을 추가한다.
- Modify: `features/offerings/components/OfferingCard.tsx`
  - 모바일 카드에도 대표 평형 미리보기와 별도 버튼 슬롯을 추가한다.
- Modify: `app/recommendations/page.tsx`
  - 열린 평형 패널/시트 상태를 관리하고, 데스크톱/모바일 UI를 연결한다.
- Create: `tests/recommendation-unit-types.test.mjs`
  - 추천 순 정렬과 대표 평형 미리보기 문구를 검증한다.
- Create: `tests/recommendation-unit-parse.test.mjs`
  - 추천 응답의 평형 데이터가 훅 정규화 로직에서 유지되는지 검증한다.

### Task 1: 추천 응답의 평형 데이터 정규화

**Files:**
- Modify: `features/recommendations/hooks/useRecommendations.ts`
- Test: `tests/recommendation-unit-parse.test.mjs`

- [ ] **Step 1: 평형 뷰모델 테스트를 먼저 작성한다**

```js
import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeRecommendationUnitTypesForTest,
} from "../features/recommendations/hooks/useRecommendations.ts";

test("추천 응답의 unit_type_results를 추천 순 평형 뷰모델로 정규화한다", () => {
  const units = normalizeRecommendationUnitTypesForTest([
    {
      unit_type_id: 21,
      unit_type_name: "84A",
      exclusive_area: 84.91,
      list_price_manwon: 82000,
      is_price_public: true,
      final_grade: "GREEN",
      total_score: 92,
      summary_message: "자금과 부담률 모두 안정적입니다.",
      grade_label: "추천",
      metrics: { monthly_burden_percent: 29.1 },
      categories: {
        cash: { grade: "GREEN", score: 28 },
        income: { grade: "LIME", score: 21 },
        ltv_dsr: { grade: "GREEN", score: 18 },
        ownership: { grade: "GREEN", score: 8 },
        purpose: { grade: "GREEN", score: 4 },
        timing: { grade: "LIME", score: 8 },
      },
    },
    {
      unit_type_id: 22,
      unit_type_name: "59B",
      exclusive_area: 59.97,
      list_price_manwon: 65000,
      is_price_public: true,
      final_grade: "LIME",
      total_score: 88,
      summary_message: "월 부담률이 낮습니다.",
      grade_label: "적합",
      metrics: { monthly_burden_percent: 24.4 },
      categories: {
        cash: { grade: "LIME", score: 24 },
        income: { grade: "GREEN", score: 22 },
        ltv_dsr: { grade: "LIME", score: 16 },
        ownership: { grade: "GREEN", score: 8 },
        purpose: { grade: "GREEN", score: 4 },
        timing: { grade: "GREEN", score: 9 },
      },
    },
  ]);

  assert.equal(units.length, 2);
  assert.equal(units[0].unitTypeId, 21);
  assert.equal(units[0].title, "84A");
  assert.equal(units[0].exclusiveAreaLabel, "84.91㎡");
  assert.equal(units[0].monthlyBurdenPercent, 29.1);
  assert.equal(units[0].categories.length, 6);
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인한다**

Run: `node --test tests/recommendation-unit-parse.test.mjs`

Expected: `normalizeRecommendationUnitTypesForTest is not a function` 또는 평형 필드 누락으로 FAIL

- [ ] **Step 3: 추천 훅 타입과 정규화 함수를 추가한다**

```ts
export type RecommendationUnitTypeCategory = {
  key: "cash" | "income" | "ltvDsr" | "ownership" | "purpose" | "timing";
  label: string;
  grade: FinalGrade5;
  score: number | null;
};

export type RecommendationUnitType = {
  unitTypeId: number;
  title: string;
  exclusiveArea: number | null;
  exclusiveAreaLabel: string | null;
  listPriceManwon: number | null;
  isPricePublic: boolean;
  finalGrade: FinalGrade5;
  totalScore: number | null;
  gradeLabel: string | null;
  summaryMessage: string | null;
  monthlyBurdenPercent: number | null;
  categories: RecommendationUnitTypeCategory[];
};

function normalizeRecommendationUnitTypes(
  item: RawRecommendationItem,
): RecommendationUnitType[] {
  return (item.unit_type_results ?? [])
    .map((unit) => {
      const unitTypeId = toPositiveInt(unit.unit_type_id);
      const finalGrade = unit.final_grade;
      if (!unitTypeId || !finalGrade) return null;

      return {
        unitTypeId,
        title: formatRecommendationUnitTypeTitle(unit),
        exclusiveArea: toFiniteNumber(unit.exclusive_area),
        exclusiveAreaLabel: formatRecommendationAreaLabel(unit.exclusive_area),
        listPriceManwon: toFiniteNumber(unit.list_price_manwon),
        isPricePublic: unit.is_price_public !== false,
        finalGrade,
        totalScore: toFiniteNumber(unit.total_score),
        gradeLabel: unit.grade_label ?? null,
        summaryMessage: unit.summary_message ?? null,
        monthlyBurdenPercent: toFiniteNumber(
          unit.metrics?.monthly_burden_percent,
        ),
        categories: [
          mapUnitCategory("cash", "자금력", unit.categories?.cash),
          mapUnitCategory("income", "소득", unit.categories?.income),
          mapUnitCategory("ltvDsr", "LTV·DSR", unit.categories?.ltv_dsr),
          mapUnitCategory("ownership", "주택 보유", unit.categories?.ownership),
          mapUnitCategory("purpose", "구매 목적", unit.categories?.purpose),
          mapUnitCategory("timing", "시점", unit.categories?.timing),
        ].filter(Boolean),
      };
    })
    .filter((unit): unit is RecommendationUnitType => Boolean(unit));
}

export function normalizeRecommendationUnitTypesForTest(
  units: NonNullable<RawRecommendationItem["unit_type_results"]>,
) {
  return normalizeRecommendationUnitTypes({ unit_type_results: units });
}
```

- [ ] **Step 4: `RecommendationItem`에 평형 배열과 대표 평형을 연결한다**

```ts
export type RecommendationItem = {
  offering: Offering;
  property: RecommendationProperty;
  conditionCategories: ConditionCategoryGrades;
  evalResult: RecommendationEvalResult;
  unitTypes: RecommendationUnitType[];
  bestUnitType: RecommendationUnitType | null;
};

const unitTypes = sortRecommendationUnitTypes(
  normalizeRecommendationUnitTypes(item),
);

return {
  offering: recommendationOffering,
  property,
  conditionCategories: toConditionCategoryGrades({ ... }),
  evalResult: { ... },
  unitTypes,
  bestUnitType: unitTypes[0] ?? null,
};
```

- [ ] **Step 5: 테스트를 다시 실행해 통과를 확인한다**

Run: `node --test tests/recommendation-unit-parse.test.mjs`

Expected: PASS

- [ ] **Step 6: 커밋한다**

```bash
git add tests/recommendation-unit-parse.test.mjs features/recommendations/hooks/useRecommendations.ts
git commit -m "feat: normalize recommendation unit type data"
```

### Task 2: 대표 평형 미리보기와 정렬 유틸 추가

**Files:**
- Create: `features/recommendations/lib/recommendationUnitTypes.ts`
- Test: `tests/recommendation-unit-types.test.mjs`

- [ ] **Step 1: 정렬과 미리보기 문자열 테스트를 작성한다**

```js
import assert from "node:assert/strict";
import test from "node:test";

import {
  sortRecommendationUnitTypes,
  buildRecommendationUnitPreview,
} from "../features/recommendations/lib/recommendationUnitTypes.ts";

test("평형은 총점 내림차순, 부담률 오름차순, 분양가 오름차순으로 정렬한다", () => {
  const sorted = sortRecommendationUnitTypes([
    { unitTypeId: 2, title: "59B", totalScore: 88, monthlyBurdenPercent: 26, listPriceManwon: 65000 },
    { unitTypeId: 1, title: "84A", totalScore: 92, monthlyBurdenPercent: 30, listPriceManwon: 82000 },
    { unitTypeId: 3, title: "74A", totalScore: 88, monthlyBurdenPercent: 24, listPriceManwon: 72000 },
  ]);

  assert.deepEqual(sorted.map((item) => item.unitTypeId), [1, 3, 2]);
});

test("대표 평형 미리보기는 상위 2개와 나머지 개수를 축약한다", () => {
  const preview = buildRecommendationUnitPreview([
    { title: "84A" },
    { title: "59B" },
    { title: "74A" },
    { title: "49" },
  ]);

  assert.equal(preview, "추천 평형 84A, 59B 외 2개");
});

test("평형이 하나면 단일 문구를 만든다", () => {
  const preview = buildRecommendationUnitPreview([{ title: "59B" }]);
  assert.equal(preview, "추천 평형 59B 단일");
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인한다**

Run: `node --test tests/recommendation-unit-types.test.mjs`

Expected: module not found 또는 function not found 로 FAIL

- [ ] **Step 3: 정렬/미리보기 유틸을 구현한다**

```ts
import type { RecommendationUnitType } from "@/features/recommendations/hooks/useRecommendations";

function compareNullableNumber(a: number | null, b: number | null, direction: "asc" | "desc" = "asc") {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return direction === "asc" ? a - b : b - a;
}

export function sortRecommendationUnitTypes<T extends {
  totalScore: number | null;
  monthlyBurdenPercent: number | null;
  listPriceManwon: number | null;
}>(units: T[]): T[] {
  return [...units].sort(
    (a, b) =>
      compareNullableNumber(a.totalScore, b.totalScore, "desc") ||
      compareNullableNumber(a.monthlyBurdenPercent, b.monthlyBurdenPercent, "asc") ||
      compareNullableNumber(a.listPriceManwon, b.listPriceManwon, "asc"),
  );
}

export function buildRecommendationUnitPreview(
  units: Array<Pick<RecommendationUnitType, "title">>,
) {
  if (units.length === 0) return null;
  if (units.length === 1) return `추천 평형 ${units[0].title} 단일`;
  const titles = units.slice(0, 2).map((unit) => unit.title).join(", ");
  const remaining = units.length - 2;
  return remaining > 0
    ? `추천 평형 ${titles} 외 ${remaining}개`
    : `추천 평형 ${titles}`;
}
```

- [ ] **Step 4: 테스트를 다시 실행한다**

Run: `node --test tests/recommendation-unit-types.test.mjs`

Expected: PASS

- [ ] **Step 5: 커밋한다**

```bash
git add tests/recommendation-unit-types.test.mjs features/recommendations/lib/recommendationUnitTypes.ts
git commit -m "feat: add recommendation unit type helpers"
```

### Task 3: 데스크톱 카드와 인라인 평형 패널 연결

**Files:**
- Create: `features/recommendations/components/RecommendationUnitTypePanel.tsx`
- Modify: `features/recommendations/components/FlippableRecommendationCard.tsx`
- Modify: `app/recommendations/page.tsx`

- [ ] **Step 1: 데스크톱 패널 토글 상태 흐름을 먼저 설계 코드로 반영한다**

```ts
const [openDesktopUnitPanelId, setOpenDesktopUnitPanelId] = useState<number | null>(null);

const handleToggleDesktopUnitPanel = useCallback((id: number) => {
  setSelectedId(id);
  setOpenDesktopUnitPanelId((current) => (current === id ? null : id));
}, [setSelectedId]);
```

- [ ] **Step 2: `FlippableRecommendationCard`에 대표 평형 미리보기와 버튼 API를 추가한다**

```tsx
type FlippableRecommendationCardProps = {
  item: RecommendationItem;
  ...
  onToggleUnitPanel?: () => void;
};

const unitPreview = buildRecommendationUnitPreview(item.unitTypes);

{unitPreview ? (
  <div className="border-t border-(--oboon-border-default) bg-(--oboon-bg-subtle) px-4 py-3">
    <p className="ob-typo-caption text-(--oboon-text-muted)">{unitPreview}</p>
    <Button
      type="button"
      variant="secondary"
      size="sm"
      shape="pill"
      className="mt-2 w-full"
      onClick={(event) => {
        event.stopPropagation();
        onToggleUnitPanel?.();
      }}
      aria-expanded={isSelected}
    >
      평형별 자세히 보기
    </Button>
  </div>
) : null}
```

- [ ] **Step 3: 데스크톱용 평형 패널 컴포넌트를 만든다**

```tsx
export default function RecommendationUnitTypePanel({
  item,
  mobile = false,
}: {
  item: RecommendationItem;
  mobile?: boolean;
}) {
  const [openUnitTypeId, setOpenUnitTypeId] = useState<number | null>(
    item.unitTypes.length === 1 ? item.unitTypes[0]?.unitTypeId ?? null : null,
  );

  return (
    <section
      className={mobile
        ? "space-y-3"
        : "rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-4"}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="ob-typo-caption text-(--oboon-text-muted)">추천 순 평형 리스트</p>
          <h3 className="ob-typo-subtitle text-(--oboon-text-title)">{item.property.name}</h3>
        </div>
      </div>
      <div className="mt-4 space-y-3">
        {item.unitTypes.map((unit) => (
          <button
            key={unit.unitTypeId}
            type="button"
            className="w-full rounded-xl border border-(--oboon-border-default) p-4 text-left"
            onClick={() =>
              setOpenUnitTypeId((current) => current === unit.unitTypeId ? null : unit.unitTypeId)
            }
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="ob-typo-body font-semibold text-(--oboon-text-title)">{unit.title}</div>
                <div className="mt-1 ob-typo-caption text-(--oboon-text-muted)">
                  {unit.exclusiveAreaLabel ?? "면적 정보 없음"} · {unit.priceLabel}
                </div>
              </div>
              <div className="text-right">
                <div className="ob-typo-caption text-(--oboon-text-muted)">매칭률</div>
                <div className="ob-typo-body2 font-semibold text-(--oboon-text-title)">
                  {unit.totalScore !== null ? `${Math.round(unit.totalScore)}%` : "비공개"}
                </div>
              </div>
            </div>
            {openUnitTypeId === unit.unitTypeId ? (
              <div className="mt-3 space-y-2 border-t border-(--oboon-border-default) pt-3">
                <p className="ob-typo-caption text-(--oboon-text-muted)">{unit.summaryMessage}</p>
                <div className="flex flex-wrap gap-2">
                  {unit.categories.map((category) => (
                    <span key={category.key} className="rounded-full border px-2 py-1 text-[11px] leading-none">
                      {category.label} {category.grade}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </button>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: 추천 페이지의 데스크톱 리스트에 패널을 연결한다**

```tsx
<FlippableRecommendationCard
  item={item}
  ...
  onToggleUnitPanel={() => handleToggleDesktopUnitPanel(item.property.id)}
/>;

{openDesktopUnitPanelId === item.property.id ? (
  <div className="mt-3 hidden sm:block">
    <RecommendationUnitTypePanel item={item} />
  </div>
) : null}
```

- [ ] **Step 5: 데스크톱 화면을 수동 확인한다**

Run: `pnpm test tests/recommendation-unit-types.test.mjs tests/recommendation-unit-parse.test.mjs`

Expected: PASS

Run: `pnpm dev`

Expected: 데스크톱 추천 리스트 카드에 대표 평형 문구와 `평형별 자세히 보기` 버튼이 보이고, 버튼 클릭 시 동일 카드 아래에 패널이 한 개만 열린다

- [ ] **Step 6: 커밋한다**

```bash
git add app/recommendations/page.tsx features/recommendations/components/FlippableRecommendationCard.tsx features/recommendations/components/RecommendationUnitTypePanel.tsx
git commit -m "feat: add desktop recommendation unit panel"
```

### Task 4: 모바일 카드와 바텀시트 연결

**Files:**
- Create: `features/recommendations/components/RecommendationUnitTypeSheet.tsx`
- Modify: `features/offerings/components/OfferingCard.tsx`
- Modify: `app/recommendations/page.tsx`

- [ ] **Step 1: 모바일 카드에 별도 버튼 슬롯을 추가한다**

```tsx
export default function OfferingCard({
  ...
  footerSlot,
}: {
  ...
  footerSlot?: React.ReactNode;
}) {
  ...
  {footerSlot ? (
    <div className="border-t border-(--oboon-border-default) bg-(--oboon-bg-subtle) px-3 py-3">
      {footerSlot}
    </div>
  ) : null}
}
```

- [ ] **Step 2: 모바일 바텀시트 컴포넌트를 만든다**

```tsx
export default function RecommendationUnitTypeSheet({
  item,
  onClose,
}: {
  item: RecommendationItem | null;
  onClose: () => void;
}) {
  if (!item) return null;

  return (
    <div className="sm:hidden">
      <div className="fixed inset-0 z-(--oboon-z-modal) bg-(--oboon-overlay)" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 z-(--oboon-z-modal) max-h-[88dvh] rounded-t-2xl border border-b-0 border-(--oboon-border-default) bg-(--oboon-bg-surface)">
        <div className="border-b border-(--oboon-border-default) px-5 py-4">
          <p className="ob-typo-caption text-(--oboon-text-muted)">추천 순 평형 리스트</p>
          <h3 className="mt-1 ob-typo-subtitle text-(--oboon-text-title)">{item.property.name}</h3>
        </div>
        <div className="max-h-[70dvh] overflow-y-auto px-5 py-4">
          <RecommendationUnitTypePanel item={item} mobile />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 추천 페이지 모바일 카드에 미리보기와 버튼을 연결한다**

```tsx
<OfferingCard
  offering={item.offering}
  evalResult={item.evalResult}
  ...
  footerSlot={
    item.unitTypes.length > 0 ? (
      <div className="space-y-2">
        <p className="ob-typo-caption text-(--oboon-text-muted)">
          {buildRecommendationUnitPreview(item.unitTypes)}
        </p>
        <Button
          type="button"
          variant="secondary"
          shape="pill"
          className="w-full"
          onClick={(event) => {
            event.stopPropagation();
            handleSelectFromCard(Number(item.offering.id));
            setMobileUnitSheetItem(item);
          }}
        >
          평형별 자세히 보기
        </Button>
      </div>
    ) : null
  }
/>
```

- [ ] **Step 4: 기존 모바일 상세 시트를 평형 시트로 교체한다**

```tsx
const [mobileUnitSheetItem, setMobileUnitSheetItem] = useState<RecommendationItem | null>(null);

<RecommendationUnitTypeSheet
  item={mobileUnitSheetItem}
  onClose={() => setMobileUnitSheetItem(null)}
/>;
```

- [ ] **Step 5: 모바일 동작을 수동 확인한다**

Run: `pnpm dev`

Expected: 모바일 폭에서 카드 하단 버튼 클릭 시 카드 상세 이동 없이 바텀시트가 열리고, 대표 평형 미리보기와 추천 순 평형 리스트가 보인다

- [ ] **Step 6: 커밋한다**

```bash
git add app/recommendations/page.tsx features/offerings/components/OfferingCard.tsx features/recommendations/components/RecommendationUnitTypeSheet.tsx
git commit -m "feat: add mobile recommendation unit sheet"
```

### Task 5: 회귀 검증 및 마무리

**Files:**
- Modify: `docs/superpowers/specs/2026-04-07-recommendation-unit-panel-design.md` (변경 필요 시만)
- Test: `tests/recommendation-unit-types.test.mjs`
- Test: `tests/recommendation-unit-parse.test.mjs`
- Test: `tests/recommendation-evaluation.test.mjs`
- Test: `tests/recommendation-visibility.test.mjs`

- [ ] **Step 1: 핵심 테스트를 한 번에 실행한다**

Run: `node --test tests/recommendation-unit-types.test.mjs tests/recommendation-unit-parse.test.mjs tests/recommendation-evaluation.test.mjs tests/recommendation-visibility.test.mjs`

Expected: 전체 PASS

- [ ] **Step 2: 린트로 타입/문법 회귀를 확인한다**

Run: `pnpm lint`

Expected: recommendation 관련 파일에서 새로운 lint error 없음

- [ ] **Step 3: UI 수동 체크를 수행한다**

```txt
1. 데스크톱 리스트에서 카드 버튼으로 패널이 열리고 한 번에 하나만 열린다.
2. 카드 본문 클릭은 여전히 현장 상세로 이동한다.
3. 모바일 카드 버튼은 바텀시트만 열고 카드 이동과 충돌하지 않는다.
4. 평형 1개인 현장은 첫 항목이 기본 확장 상태인지 확인한다.
5. 평형 데이터가 없는 현장은 미리보기와 버튼이 숨겨진다.
```

- [ ] **Step 4: 마무리 커밋을 만든다**

```bash
git add tests/recommendation-unit-types.test.mjs tests/recommendation-unit-parse.test.mjs app/recommendations/page.tsx features/recommendations/hooks/useRecommendations.ts features/recommendations/components/RecommendationUnitTypePanel.tsx features/recommendations/components/RecommendationUnitTypeSheet.tsx features/recommendations/components/FlippableRecommendationCard.tsx features/recommendations/lib/recommendationUnitTypes.ts features/offerings/components/OfferingCard.tsx
git commit -m "feat: surface unit-level recommendation details"
```

## Self-Review

- 스펙 커버리지
  - 별도 버튼 진입: Task 3, Task 4
  - 대표 평형 미리보기: Task 2, Task 3, Task 4
  - 추천 순 정렬: Task 2
  - 데스크톱 인라인 패널: Task 3
  - 모바일 바텀시트: Task 4
  - 개별 평형 2단 확장: Task 3, Task 4
  - 테스트와 회귀 검증: Task 1, Task 2, Task 5
- Placeholder scan
  - `TODO`, `TBD`, "적절히 처리" 같은 표현 없음
- Type consistency
  - `RecommendationUnitType`, `buildRecommendationUnitPreview`, `sortRecommendationUnitTypes` 명칭을 전체 작업에서 일관되게 사용함

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-07-recommendation-unit-panel.md`. Two execution options:

1. Subagent-Driven (recommended) - I dispatch a fresh subagent per task, review between tasks, fast iteration

2. Inline Execution - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
