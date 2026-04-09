# Offering Price Table Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 현장 상세의 분양가표를 가격 중심 `행 요약 + 확장형` 구조로 바꿔, 조건 검증 전에도 타입 비교가 가능하고 검증 후에는 같은 행 안에 개인화 결과가 붙도록 만든다.

**Architecture:** `offeringTypesAccordion.client.tsx`의 현재 탭형 단일 상세 구조를 세로 아코디언 리스트로 바꾸고, 접힌 행은 가격과 전용면적 중심 비교 정보만 노출한다. 조건 관련 문구와 숫자는 별도 레이아웃 유틸로 분리해 테스트 가능하게 만들고, 펼침 상세에서는 가격 정보 → 내 조건 기준 → 판정 이유 → 타입 정보 → 평면도 순서로 내용을 재배치한다.

**Tech Stack:** Next.js App Router, React client components, TypeScript, node:test, existing OBOON UI components/utilities

---

## File Structure

- Create: `features/offerings/components/detail/offeringPriceTableLayout.ts`
  - 분양가표 행에서 쓰는 요약 문자열과 조건 상태 뷰모델을 만든다.
- Modify: `features/offerings/components/detail/offeringTypesAccordion.client.tsx`
  - 탭형 선택 UI를 세로 아코디언 행 구조로 바꾸고, 가격 중심 요약/확장 레이아웃을 구현한다.
- Create: `tests/offering-price-table-layout.test.mjs`
  - 요약 문자열, CTA/결과 요약 문구, TSX 레이아웃 회귀를 검증한다.

### Task 1: 가격표 요약/조건 상태 유틸 추가

**Files:**
- Create: `features/offerings/components/detail/offeringPriceTableLayout.ts`
- Test: `tests/offering-price-table-layout.test.mjs`

- [ ] **Step 1: 요약/조건 상태 테스트를 먼저 작성한다**

```js
import assert from "node:assert/strict";
import test from "node:test";

import {
  buildOfferingUnitSpecSummary,
  buildOfferingUnitConditionState,
} from "../features/offerings/components/detail/offeringPriceTableLayout.ts";

test("전용면적 중심 보조 정보는 전용면적을 첫 토큰으로 만든다", () => {
  const summary = buildOfferingUnitSpecSummary({
    exclusive_area: 59.91,
    rooms: 3,
    bathrooms: 2,
    unit_count: 84,
  });

  assert.equal(summary, "전용 59.9㎡ · 3룸 · 2욕실 · 84세대");
});

test("조건 검증 전 상태는 CTA 문구를 반환한다", () => {
  const state = buildOfferingUnitConditionState(null);

  assert.deepEqual(state, {
    mode: "cta",
    label: "내 조건으로 확인",
  });
});

test("조건 검증 후 상태는 결과 라벨과 핵심 수치를 한 줄로 만든다", () => {
  const state = buildOfferingUnitConditionState({
    final_grade: "GREEN",
    grade_label: "우선 검토",
    summary_message: "자금 여건은 무난하지만 대출 조건은 확인이 필요합니다.",
    metrics: {
      min_cash: 14000,
      monthly_burden_percent: 32.1,
    },
  });

  assert.equal(state.mode, "result");
  assert.equal(state.badgeLabel, "우선 검토");
  assert.equal(state.metricLine, "초기 필요 자금 1.4억 · 월 부담률 32.1%");
  assert.match(state.helperText, /자금 여건은 무난하지만/);
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인한다**

Run: `node --test tests/offering-price-table-layout.test.mjs`

Expected: `Cannot find module '../features/offerings/components/detail/offeringPriceTableLayout.ts'` 로 FAIL

- [ ] **Step 3: 가격표 레이아웃 유틸을 구현한다**

```ts
import { grade5DetailLabel } from "@/features/condition-validation/lib/grade5Labels";
import type { UnitTypeResultItem } from "@/features/condition-validation/domain/types";

type UnitSpecInput = {
  exclusive_area: number | null;
  rooms: number | null;
  bathrooms: number | null;
  unit_count: number | null;
};

type ConditionState =
  | { mode: "cta"; label: "내 조건으로 확인" }
  | {
      mode: "result";
      badgeLabel: string;
      metricLine: string;
      helperText: string | null;
    };

function formatArea(value: number | null) {
  if (value == null || !Number.isFinite(value)) return "전용 확인중";
  return `전용 ${(Math.round(value * 10) / 10).toFixed(1).replace(/\.0$/, "")}㎡`;
}

function formatCount(value: number | null, suffix: string) {
  if (value == null || !Number.isFinite(value)) return null;
  return `${value}${suffix}`;
}

function formatManwonToEok(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value) || value <= 0) return "확인 필요";
  const eok = value / 10000;
  return `${(Math.round(eok * 10) / 10).toFixed(1).replace(/\.0$/, "")}억`;
}

export function buildOfferingUnitSpecSummary(input: UnitSpecInput) {
  const parts = [
    formatArea(input.exclusive_area),
    formatCount(input.rooms, "룸"),
    formatCount(input.bathrooms, "욕실"),
    formatCount(input.unit_count, "세대"),
  ].filter((part): part is string => Boolean(part));

  return parts.join(" · ");
}

export function buildOfferingUnitConditionState(
  validation: Pick<
    UnitTypeResultItem,
    "final_grade" | "grade_label" | "summary_message" | "metrics"
  > | null,
): ConditionState {
  if (!validation) {
    return { mode: "cta", label: "내 조건으로 확인" };
  }

  const badgeLabel =
    validation.grade_label?.trim() || grade5DetailLabel(validation.final_grade);

  return {
    mode: "result",
    badgeLabel,
    metricLine: `초기 필요 자금 ${formatManwonToEok(validation.metrics?.min_cash)} · 월 부담률 ${
      validation.metrics?.monthly_burden_percent != null
        ? `${validation.metrics.monthly_burden_percent.toFixed(1)}%`
        : "계산 불가"
    }`,
    helperText: validation.summary_message ?? null,
  };
}
```

- [ ] **Step 4: 테스트를 다시 실행해 통과를 확인한다**

Run: `node --test tests/offering-price-table-layout.test.mjs`

Expected: PASS

- [ ] **Step 5: 커밋한다**

```bash
git add tests/offering-price-table-layout.test.mjs features/offerings/components/detail/offeringPriceTableLayout.ts
git commit -m "feat: add offering price table layout helpers"
```

### Task 2: 분양가표를 가격 중심 아코디언 행 구조로 전환

**Files:**
- Modify: `features/offerings/components/detail/offeringTypesAccordion.client.tsx`
- Test: `tests/offering-price-table-layout.test.mjs`

- [ ] **Step 1: TSX 레이아웃 회귀 테스트를 추가한다**

```js
import { readFile } from "node:fs/promises";
import path from "node:path";

const accordionPath = path.join(
  process.cwd(),
  "features/offerings/components/detail/offeringTypesAccordion.client.tsx",
);

test("분양가표 아코디언은 가격 중심 행 요약과 조건 CTA/결과 레이어를 사용한다", async () => {
  const source = await readFile(accordionPath, "utf8");

  assert.match(source, /buildOfferingUnitSpecSummary/);
  assert.match(source, /buildOfferingUnitConditionState/);
  assert.match(source, /내 조건으로 확인/);
  assert.match(source, /scrollIntoView\(\{ behavior: "smooth", block: "start" \}\)/);
  assert.match(source, /formatPriceRange\(unit\.price_min, unit\.price_max/);
  assert.doesNotMatch(source, /flex gap-1 overflow-x-auto border-b pb-0\.5/);
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인한다**

Run: `node --test tests/offering-price-table-layout.test.mjs`

Expected: 기존 탭 strip 클래스가 그대로 있고 새 helper 호출도 없어 FAIL

- [ ] **Step 3: 탭형 단일 상세 구조를 세로 아코디언 행 구조로 바꾼다**

```tsx
import { ChevronDown } from "lucide-react";
import {
  buildOfferingUnitConditionState,
  buildOfferingUnitSpecSummary,
} from "./offeringPriceTableLayout";

const [openUnitId, setOpenUnitId] = useState<number | null>(null);

function scrollToConditionValidation() {
  const target = document.getElementById("condition-validation");
  target?.scrollIntoView({ behavior: "smooth", block: "start" });
}

{rows.map((unit) => {
  const validation = validationMap.get(unit.id) ?? null;
  const conditionState = buildOfferingUnitConditionState(validation);
  const isOpen = openUnitId === unit.id;

  return (
    <div
      key={unit.id}
      className="rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface)"
    >
      <button
        type="button"
        className="w-full px-4 py-4 text-left"
        aria-expanded={isOpen}
        onClick={() => setOpenUnitId((current) => (current === unit.id ? null : unit.id))}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="ob-typo-h4 text-(--oboon-text-title)">
              {formatTypeTitle(unit.type_name)}
            </div>
            <div className="mt-2 ob-typo-h2 text-(--oboon-text-title)">
              {formatPriceRange(unit.price_min, unit.price_max, {
                unknownLabel:
                  unit.is_price_public === false ? UXCopy.pricePrivate : UXCopy.priceRange,
              })}
            </div>
            <div className="mt-1 ob-typo-caption text-(--oboon-text-muted)">
              {buildOfferingUnitSpecSummary(unit)}
            </div>
          </div>
          <ChevronDown className={cn("mt-1 h-5 w-5 shrink-0 transition-transform", isOpen ? "rotate-180" : "")} />
        </div>
      </button>

      <div className="border-t border-(--oboon-border-default) px-4 py-3">
        {conditionState.mode === "cta" ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            shape="pill"
            onClick={(event) => {
              event.stopPropagation();
              scrollToConditionValidation();
            }}
          >
            {conditionState.label}
          </Button>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full px-2 py-0.5 ob-typo-caption font-semibold">
                {conditionState.badgeLabel}
              </span>
              <span className="ob-typo-caption text-(--oboon-text-muted)">
                {conditionState.metricLine}
              </span>
            </div>
            {conditionState.helperText ? (
              <p className="mt-2 ob-typo-caption text-(--oboon-text-title)">
                {conditionState.helperText}
              </p>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
})}
```

- [ ] **Step 4: 테스트를 다시 실행해 통과를 확인한다**

Run: `node --test tests/offering-price-table-layout.test.mjs`

Expected: PASS

- [ ] **Step 5: 커밋한다**

```bash
git add tests/offering-price-table-layout.test.mjs features/offerings/components/detail/offeringTypesAccordion.client.tsx
git commit -m "feat: convert offering price table to accordion rows"
```

### Task 3: 펼침 상세를 가격/조건/타입/평면도 순서로 재배치

**Files:**
- Modify: `features/offerings/components/detail/offeringTypesAccordion.client.tsx`
- Test: `tests/offering-price-table-layout.test.mjs`

- [ ] **Step 1: 펼침 상세 순서 회귀 테스트를 추가한다**

```js
test("분양가표 펼침 상세는 가격 정보부터 평면도까지 순서대로 섹션을 배치한다", async () => {
  const source = await readFile(accordionPath, "utf8");

  assert.match(
    source,
    /가격 정보[\s\S]*내 조건 기준[\s\S]*판정 이유[\s\S]*타입 정보[\s\S]*평면도/,
  );
  assert.match(source, /className="grid gap-4 lg:grid-cols-\[minmax\(0,1\.1fr\)_minmax\(280px,0\.9fr\)\]"/);
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인한다**

Run: `node --test tests/offering-price-table-layout.test.mjs`

Expected: 새 섹션 제목과 2열 확장 레이아웃이 없어 FAIL

- [ ] **Step 3: 펼침 상세를 새 정보 위계에 맞춰 재구성한다**

```tsx
const categoryItems = validation
  ? [
      { key: "cash", label: "자금력", value: validation.categories?.cash },
      { key: "income", label: "소득", value: validation.categories?.income },
      { key: "ltv_dsr", label: "대출 여건", value: validation.categories?.ltv_dsr },
      { key: "ownership", label: "주택 보유", value: validation.categories?.ownership },
      { key: "purpose", label: "구매 목적", value: validation.categories?.purpose },
      { key: "timing", label: "시점", value: validation.categories?.timing },
    ].filter((item) => item.value)
  : [];

{isOpen ? (
  <div className="px-4 pb-4">
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
      <div className="space-y-4">
        <section className="rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle) px-4 py-3">
          <h4 className="ob-typo-subtitle text-(--oboon-text-title)">가격 정보</h4>
          <p className="mt-2 ob-typo-body2 text-(--oboon-text-title)">
            {formatPriceRange(unit.price_min, unit.price_max, {
              unknownLabel:
                unit.is_price_public === false ? UXCopy.pricePrivate : UXCopy.priceRange,
            })}
          </p>
        </section>

        {validation ? (
          <>
            <section className="rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle) px-4 py-3">
              <h4 className="ob-typo-subtitle text-(--oboon-text-title)">내 조건 기준</h4>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <MetaCard
                  label="계약금"
                  value={validation.metrics?.contract_amount != null ? `${validation.metrics.contract_amount.toLocaleString("ko-KR")}만원` : "확인 필요"}
                />
                <MetaCard
                  label="초기 필요 자금"
                  value={validation.metrics?.min_cash != null ? `${validation.metrics.min_cash.toLocaleString("ko-KR")}만원` : "확인 필요"}
                />
                <MetaCard
                  label="권장 현금"
                  value={validation.metrics?.recommended_cash != null ? `${validation.metrics.recommended_cash.toLocaleString("ko-KR")}만원` : "확인 필요"}
                />
                <MetaCard label="월 부담률" value={formatMonthlyBurden(validation.metrics?.monthly_burden_percent)} />
              </div>
            </section>

            <section className="rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle) px-4 py-3">
              <h4 className="ob-typo-subtitle text-(--oboon-text-title)">판정 이유</h4>
              <div className="mt-3 space-y-2">
                {categoryItems.map((category) => (
                  <div key={category.key} className="rounded-lg border border-(--oboon-border-default) px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="ob-typo-caption text-(--oboon-text-muted)">{category.label}</span>
                      <span className="rounded-full px-2 py-0.5 ob-typo-caption font-semibold">
                        {grade5DetailLabel(category.value.grade)}
                      </span>
                    </div>
                    <p className="mt-1 ob-typo-caption text-(--oboon-text-title)">{category.value.reason}</p>
                  </div>
                ))}
              </div>
            </section>
          </>
        ) : null}
      </div>

      <div className="space-y-4">
        <section className="rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle) px-4 py-3">
          <h4 className="ob-typo-subtitle text-(--oboon-text-title)">타입 정보</h4>
          <MetaGrid
            u={unit}
            areaUnit={areaUnit}
            onToggleAreaUnit={() => setAreaUnit((prev) => (prev === "sqm" ? "pyeong" : "sqm"))}
          />
        </section>

        <section className="rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle) px-4 py-3">
          <h4 className="ob-typo-subtitle text-(--oboon-text-title)">평면도</h4>
          <div className="mt-3">
            {img ? (
              <Button
                type="button"
                variant="ghost"
                className="relative h-auto w-full p-0"
                onClick={() => setZoom({ open: true, title: formatTypeTitle(unit.type_name), src: img })}
                aria-label={`${formatTypeTitle(unit.type_name)} 평면도 확대`}
              >
                <Image
                  src={img}
                  alt={`${formatTypeTitle(unit.type_name)} 평면도`}
                  width={1600}
                  height={1200}
                  className="h-auto w-full object-contain"
                  sizes="(max-width: 768px) 100vw, 700px"
                />
              </Button>
            ) : (
              <div className="flex aspect-video w-full items-center justify-center rounded-xl border border-dashed border-(--oboon-border-default) text-sm text-(--oboon-text-muted)">
                {imagePlaceholderText}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  </div>
) : null}
```

- [ ] **Step 4: 전체 검증을 실행한다**

Run: `node --test tests/offering-price-table-layout.test.mjs`

Expected: PASS

Run: `pnpm lint`

Expected: 새 분양가표 파일 관련 lint error 없이 완료

Run: `pnpm typecheck`

Expected: PASS

Run: `pnpm dev`

Expected: 현장 상세 `분양가표` 섹션에서 각 타입이 가격 중심 아코디언 행으로 보이고, 미검증 상태에서는 `내 조건으로 확인`, 검증 상태에서는 결과 요약이 같은 위치에 보인다

- [ ] **Step 5: 커밋한다**

```bash
git add tests/offering-price-table-layout.test.mjs features/offerings/components/detail/offeringTypesAccordion.client.tsx
git commit -m "feat: reorganize offering price table detail layout"
```
