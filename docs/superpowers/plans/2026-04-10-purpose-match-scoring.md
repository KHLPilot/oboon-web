# 구매 목적-현장 매칭 점수 고도화 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 구매 목적을 사용자 성향으로 유지하면서, 현장별 실거주 적합도와 투자 적합도를 별도로 계산해 추천 결과가 현장 특성을 더 정확히 반영하도록 만든다.

**Architecture:** 기존의 자금/부담/리스크 평가는 유지하고, 현장 매칭 전용 도메인 계층을 추가한다. `PropertyValidationProfile`에는 현재 목적 적합도를 계산하는 데 필요한 현장 스펙을 더 싣고, 추천 라우트와 타입 정규화 계층은 이 결과를 받아 실거주/투자 점수와 설명을 함께 노출한다.

**Tech Stack:** Next.js App Router, React 18, TypeScript, existing recommendation hooks, condition-validation domain logic, Node test runner

---

## File Structure

- Modify: `features/condition-validation/domain/types.ts`
  - 현장 매칭에 필요한 프로필 필드와 결과 타입을 추가한다.
- Modify: `features/condition-validation/server/profile-resolver.ts`
  - `properties`, `property_specs`, `property_timeline`, `property_validation_profiles`에서 목적 매칭용 필드를 함께 채운다.
- Create: `features/condition-validation/domain/purposeMatchScoring.ts`
  - 실거주 적합도/투자 적합도 계산과 confidence 산정을 전담한다.
- Modify: `features/condition-validation/domain/fullCustomerEvaluator.ts`
  - 구매 목적 카테고리 설명을 목적 우열이 아닌 해석형 문구로 바꾸고, 필요 시 목적 매칭 요약을 연결한다.
- Modify: `features/condition-validation/domain/guestEvaluator.ts`
  - 비로그인 경로도 동일한 목적 설명 원칙을 따른다.
- Modify: `app/api/condition-validation/recommend/route.ts`
  - 추천 목록 응답에 실거주/투자 적합도와 매칭 설명을 포함한다.
- Modify: `features/recommendations/lib/recommendationCategoryReason.ts`
  - `purpose` 카테고리 문구를 성향 라벨이 아니라 현장 적합도 설명으로 확장한다.
- Modify: `features/recommendations/lib/recommendationUnitTypes.ts`
  - 평형 결과에도 새 목적 설명을 전달한다.
- Modify: `features/offerings/components/detail/conditionValidationDisplay.ts`
  - 상세 조건 검증 카드가 새 목적 설명을 그대로 사용하도록 연결한다.
- Modify: `features/recommendations/hooks/useRecommendations.ts`
  - API 응답의 새 필드를 타입에 맞게 정규화한다.
- Create: `tests/purpose-match-scoring.test.mjs`
  - 목적 적합도 계산과 설명 문구 회귀 테스트를 추가한다.

### Task 1: Lock The Scoring Rules With Failing Tests

**Files:**
- Create: `tests/purpose-match-scoring.test.mjs`
- Create: `features/condition-validation/domain/purposeMatchScoring.ts`

- [ ] **Step 1: Write the failing test for residence versus investment separation**

```js
import assert from "node:assert/strict";
import test from "node:test";

import { scorePurposeMatch } from "../features/condition-validation/domain/purposeMatchScoring.ts";

test("residence and investment scores can diverge by property profile", () => {
  const apartmentWithStrongParking = scorePurposeMatch({
    property: {
      propertyType: "아파트",
      rooms: 3,
      bathrooms: 2,
      exclusiveArea: 84.91,
      parkingPerHousehold: 1.2,
      householdTotal: 1200,
      heatingType: "지역난방",
      amenities: "피트니스, 어린이집, 작은도서관",
      floorAreaRatio: 180,
      buildingCoverageRatio: 18,
      moveInDate: "2027-03",
      saleType: "일반분양",
      developer: "대형 시행사",
      builder: "대형 시공사",
      regulationArea: "non_regulated",
      transferRestriction: false,
      transferRestrictionPeriod: null,
      contractRatio: 0.1,
    },
    purpose: "investment",
  });

  assert.ok(apartmentWithStrongParking.residenceFitScore >= 0);
  assert.ok(apartmentWithStrongParking.investmentFitScore >= 0);
  assert.notEqual(
    apartmentWithStrongParking.residenceFitScore,
    apartmentWithStrongParking.investmentFitScore,
  );
});
```

- [ ] **Step 2: Write the failing test for transfer restriction penalty**

```js
test("investment score falls when transfer restriction is present", () => {
  const restricted = scorePurposeMatch({
    property: {
      propertyType: "오피스텔",
      rooms: 1,
      bathrooms: 1,
      exclusiveArea: 22.3,
      parkingPerHousehold: 0.4,
      householdTotal: 120,
      heatingType: "개별난방",
      amenities: "공용라운지",
      floorAreaRatio: 650,
      buildingCoverageRatio: 60,
      moveInDate: "2027-10",
      saleType: "일반분양",
      developer: null,
      builder: null,
      regulationArea: "adjustment_target",
      transferRestriction: true,
      transferRestrictionPeriod: "1년",
      contractRatio: 0.2,
    },
    purpose: "investment",
  });

  const unrestricted = scorePurposeMatch({
    property: {
      propertyType: "오피스텔",
      rooms: 1,
      bathrooms: 1,
      exclusiveArea: 22.3,
      parkingPerHousehold: 0.4,
      householdTotal: 120,
      heatingType: "개별난방",
      amenities: "공용라운지",
      floorAreaRatio: 650,
      buildingCoverageRatio: 60,
      moveInDate: "2027-10",
      saleType: "일반분양",
      developer: null,
      builder: null,
      regulationArea: "adjustment_target",
      transferRestriction: false,
      transferRestrictionPeriod: null,
      contractRatio: 0.2,
    },
    purpose: "investment",
  });

  assert.ok(unrestricted.investmentFitScore > restricted.investmentFitScore);
  assert.match(restricted.reason, /전매 제약/);
});
```

- [ ] **Step 3: Write the failing test for residence copy staying explanation-first**

```js
test("residence reason is explanation-first, not a raw label", () => {
  const result = scorePurposeMatch({
    property: {
      propertyType: "아파트",
      rooms: 4,
      bathrooms: 2,
      exclusiveArea: 84.91,
      parkingPerHousehold: 1.3,
      householdTotal: 900,
      heatingType: "지역난방",
      amenities: "피트니스, 어린이집",
      floorAreaRatio: 170,
      buildingCoverageRatio: 19,
      moveInDate: "2027-01",
      saleType: "일반분양",
      developer: "시행사",
      builder: "시공사",
      regulationArea: "non_regulated",
      transferRestriction: false,
      transferRestrictionPeriod: null,
      contractRatio: 0.1,
    },
    purpose: "residence",
  });

  assert.notEqual(result.reason, "실거주");
  assert.match(result.reason, /실거주|거주/);
});
```

- [ ] **Step 4: Run the new test file to verify RED**

Run:

```bash
PATH=/opt/homebrew/bin:$PATH /opt/homebrew/bin/node --test tests/purpose-match-scoring.test.mjs
```

Expected: FAIL because `purposeMatchScoring.ts` does not exist yet.

### Task 2: Add The Purpose-Matching Domain Helper

**Files:**
- Create: `features/condition-validation/domain/purposeMatchScoring.ts`
- Test: `tests/purpose-match-scoring.test.mjs`

- [ ] **Step 1: Define the data shape and scoring API**

```ts
export type PurposeMatchInput = {
  property: {
    propertyType: string | null;
    rooms: number | null;
    bathrooms: number | null;
    exclusiveArea: number | null;
    parkingPerHousehold: number | null;
    householdTotal: number | null;
    heatingType: string | null;
    amenities: string | null;
    floorAreaRatio: number | null;
    buildingCoverageRatio: number | null;
    moveInDate: string | null;
    saleType: string | null;
    developer: string | null;
    builder: string | null;
    regulationArea: "non_regulated" | "adjustment_target" | "speculative_overheated";
    transferRestriction: boolean;
    transferRestrictionPeriod: string | null;
    contractRatio: number | null;
  };
  purpose: "residence" | "investment" | "both";
};

export type PurposeMatchResult = {
  residenceFitScore: number;
  investmentFitScore: number;
  confidence: number;
  reason: string;
};

export function scorePurposeMatch(input: PurposeMatchInput): PurposeMatchResult;
```

- [ ] **Step 2: Implement residence-fit scoring from housing features**

Use the following rule block as the initial implementation shape:

```ts
const residenceScore =
  scorePropertyType(property.propertyType) +
  scoreUnitConfiguration({
    rooms: property.rooms,
    bathrooms: property.bathrooms,
    exclusiveArea: property.exclusiveArea,
  }) +
  scoreParking(property.parkingPerHousehold) +
  scoreAmenities(property.amenities) +
  scoreDensity({
    floorAreaRatio: property.floorAreaRatio,
    buildingCoverageRatio: property.buildingCoverageRatio,
    householdTotal: property.householdTotal,
  }) +
  scoreMoveInTiming(property.moveInDate);
```

The helper must:
- reward clearly residential formats such as apartment-like configurations
- reward balanced rooms/bathrooms and usable area
- reward parking and amenities
- penalize extreme density
- penalize very distant move-in timing

- [ ] **Step 3: Implement investment-fit scoring from regulation and liquidity features**

Use the following rule block as the initial implementation shape:

```ts
const investmentScore =
  scoreTransferRestriction({
    transferRestriction: property.transferRestriction,
    transferRestrictionPeriod: property.transferRestrictionPeriod,
  }) +
  scoreRegulationArea(property.regulationArea) +
  scoreContractRatio(property.contractRatio) +
  scoreSaleType(property.saleType) +
  scoreBrandSignal({
    developer: property.developer,
    builder: property.builder,
  }) +
  scoreScaleAndLiquidity({
    householdTotal: property.householdTotal,
    propertyType: property.propertyType,
  });
```

The helper must:
- penalize transfer restriction
- penalize speculative overheated regulation areas
- reward low contract ratio when the rest of the profile is normal
- reward recognizable developer/builder signals when available
- reward scale that supports liquidity, but avoid overfitting to one-size-fits-all

- [ ] **Step 4: Implement confidence and reason generation**

```ts
const confidence =
  countPresentFields / totalFields;

const reason =
  residenceScore >= investmentScore
    ? "이 현장은 실거주 적합도가 더 높아요."
    : "이 현장은 투자 적합도가 더 높아요.";
```

The final reason must include the strongest signal that drove the difference, such as:
- 전매 제약
- 규제 강도
- 주거형 구성
- 주차/부대시설
- 입주 시점

- [ ] **Step 5: Run the helper tests until they pass**

Run:

```bash
PATH=/opt/homebrew/bin:$PATH /opt/homebrew/bin/node --test tests/purpose-match-scoring.test.mjs
```

Expected: PASS

### Task 3: Extend Property Profiles So The Helper Can Read Real DB Data

**Files:**
- Modify: `features/condition-validation/domain/types.ts`
- Modify: `features/condition-validation/server/profile-resolver.ts`
- Modify: `app/api/condition-validation/recommend/route.ts`

- [ ] **Step 1: Extend `PropertyValidationProfile` with the fields needed for matching**

```ts
export type PropertyValidationProfile = {
  propertyId: string;
  propertyName: string | null;
  assetType: ValidationAssetType;
  listPrice: number;
  contractRatio: number;
  regulationArea: RegulationArea;
  transferRestriction: boolean;
  transferRestrictionPeriod: string | null;
  propertyType: string | null;
  rooms: number | null;
  bathrooms: number | null;
  exclusiveArea: number | null;
  parkingPerHousehold: number | null;
  householdTotal: number | null;
  heatingType: string | null;
  amenities: string | null;
  floorAreaRatio: number | null;
  buildingCoverageRatio: number | null;
  saleType: string | null;
  developer: string | null;
  builder: string | null;
  moveInDate: string | null;
  source: "validation_profile" | "property_fallback";
  matchedPropertyId: number | null;
};
```

- [ ] **Step 2: Populate the new fields in `profile-resolver.ts`**

Update the validation-profile query and fallback property query so the resulting profile includes the extra DB values. The important shape is:

```ts
return {
  propertyId: String(matchedPropertyId),
  propertyName: row.name,
  assetType,
  listPrice: normalizePriceToManwon(listPriceRaw),
  contractRatio,
  regulationArea,
  transferRestriction: Boolean(row.transfer_restriction),
  transferRestrictionPeriod: row.transfer_restriction_period ?? null,
  propertyType: row.property_type ?? null,
  rooms: row.rooms ?? null,
  bathrooms: row.bathrooms ?? null,
  exclusiveArea: row.exclusive_area ?? null,
  parkingPerHousehold: row.parking_per_household ?? null,
  householdTotal: row.household_total ?? null,
  heatingType: row.heating_type ?? null,
  amenities: row.amenities ?? null,
  floorAreaRatio: row.floor_area_ratio ?? null,
  buildingCoverageRatio: row.building_coverage_ratio ?? null,
  saleType: row.sale_type ?? null,
  developer: row.developer ?? null,
  builder: row.builder ?? null,
  moveInDate: row.move_in_date ?? null,
  source: "property_fallback",
  matchedPropertyId: row.id,
};
```

- [ ] **Step 3: Thread the richer profile through `app/api/condition-validation/recommend/route.ts`**

The route currently builds a minimal `PropertyValidationProfile` for unit evaluation:

```ts
const profile: PropertyValidationProfile = {
  propertyId: unitProfile.propertyId,
  propertyName: null,
  assetType: unitProfile.assetType,
  listPrice: unitProfile.listPriceManwon,
  contractRatio: unitProfile.contractRatio,
  regulationArea: unitProfile.regulationArea,
  transferRestriction: unitProfile.transferRestriction,
  source: "validation_profile",
  matchedPropertyId: toPositiveInt(unitProfile.propertyId),
};
```

Replace it with the full shape so the helper can read real property context. This will likely require the unit profile loader to fetch property-level fields alongside the unit profile.

- [ ] **Step 4: Keep unit evaluation behavior stable**

`evaluateFullCondition()` and `evaluateGuestCondition()` must continue to produce the same cash/burden/risk outputs. The profile expansion is for purpose matching, not for changing the numeric contract, unless a test explicitly proves a better rule.

### Task 4: Rewire Purpose Copy And Recommendation Payloads

**Files:**
- Modify: `features/recommendations/lib/recommendationCategoryReason.ts`
- Modify: `features/recommendations/lib/recommendationUnitTypes.ts`
- Modify: `features/offerings/components/detail/conditionValidationDisplay.ts`
- Modify: `features/recommendations/hooks/useRecommendations.ts`
- Modify: `app/api/condition-validation/recommend/route.ts`

- [ ] **Step 1: Replace raw purpose labels with explanation-first copy**

Current purpose copy is label-oriented:

```ts
case "purpose":
  return "실거주 목적이라 현재 추천 기준과 잘 맞는 편으로 반영됐어요.";
```

Update it so the message can say:

- `이 현장은 실거주 적합도가 더 높아요.`
- `전매 제한이 없어 투자 목적에 더 맞아요.`
- `규제 강도가 높아 실거주 관점이 더 무난해요.`

- [ ] **Step 2: Add purpose-fit fields to the recommendation response**

The recommendation API should return the new summary values next to existing category data:

```ts
purpose_match: {
  residence_fit_score: number | null;
  investment_fit_score: number | null;
  confidence: number | null;
  reason: string | null;
}
```

The UI layer can then show the combined result without needing to reconstruct the explanation.

- [ ] **Step 3: Update unit-type normalization to carry the new purpose summary**

`normalizeRecommendationUnitTypes()` should preserve the existing category list and attach the purpose-matching summary to each unit type result. Do not overwrite the cash/income/ltv/correctness categories.

- [ ] **Step 4: Update the detail display to surface the new explanation**

`buildFullConditionCategoryDisplay()` and `buildGuestConditionCategoryDisplay()` should keep the same category order, but the `purpose` item should read the new explanation-first reason generated from the current profile.

- [ ] **Step 5: Keep list sorting unchanged for this iteration**

Do not change the recommendation ranking formula yet. The first release should expose better purpose matching without perturbing the existing ranking behavior unexpectedly.

### Task 5: Add Regression Coverage For The New Behavior

**Files:**
- Modify: `tests/condition-validation-display.test.mjs`
- Create: `tests/recommendation-purpose-match-display.test.mjs`

- [ ] **Step 1: Add a display test for explanation-first purpose copy**

```js
test("purpose display is explanation-first for real property context", () => {
  const items = buildFullConditionCategoryDisplay({
    categories: {
      cash: { grade: "YELLOW", score: 20, max_score: 30, reason: "계약금의 85% — 보통" },
      income: { grade: "GREEN", score: 21, max_score: 25, reason: "안정성 8/8 · 상환여력 6/8 · 소득규모 5/7" },
      ltv_dsr: { grade: "GREEN", score: 18, max_score: 20, reason: "LTV 9/10 · DSR 31%(8/10)" },
      ownership: { grade: "GREEN", score: 10, max_score: 10, reason: "무주택" },
      purpose: { grade: "GREEN", score: 5, max_score: 5, reason: "실거주" },
      timing: { grade: "GREEN", score: 9, max_score: 10, reason: "분양시점 5/5 · 입주시점 4/5" },
    },
    metrics: {
      contract_amount: 9000,
      min_cash: 9000,
      recommended_cash: 18000,
      monthly_payment_est: 200,
      monthly_burden_percent: 28,
      dsr_percent: 32,
      timing_months_diff: 4,
    },
    inputs: {
      availableCash: 8000,
      monthlyIncome: 500,
      employmentType: "employee",
      houseOwnership: "none",
      purchasePurpose: "residence",
    },
    isPricePublic: true,
  });

  const purpose = items.find((item) => item.key === "purpose");
  assert.ok(purpose);
  assert.notEqual(purpose.reason, "실거주");
});
```

- [ ] **Step 2: Add a recommendation test for investment-favored properties**

```js
test("investment-favored property reports higher investment fit", () => {
  const result = scorePurposeMatch({
    property: {
      propertyType: "오피스텔",
      rooms: 1,
      bathrooms: 1,
      exclusiveArea: 22,
      parkingPerHousehold: 0.4,
      householdTotal: 120,
      heatingType: "개별난방",
      amenities: "라운지",
      floorAreaRatio: 620,
      buildingCoverageRatio: 58,
      moveInDate: "2028-01",
      saleType: "후분양",
      developer: "인지도 있는 시행사",
      builder: "인지도 있는 시공사",
      regulationArea: "non_regulated",
      transferRestriction: false,
      transferRestrictionPeriod: null,
      contractRatio: 0.1,
    },
    purpose: "investment",
  });

  assert.ok(result.investmentFitScore > result.residenceFitScore);
  assert.match(result.reason, /투자/);
});
```

- [ ] **Step 3: Run the test suite for the touched areas**

Run:

```bash
PATH=/opt/homebrew/bin:$PATH /opt/homebrew/bin/node --test tests/purpose-match-scoring.test.mjs tests/condition-validation-display.test.mjs tests/recommendation-unit-parse.test.mjs
```

Expected: PASS

- [ ] **Step 4: Smoke-check the recommendation route behavior locally**

Use the existing recommend API integration path or the relevant test fixture to verify:

- existing cash/burden/risk results remain stable
- purpose copy now reflects the property context
- the new purpose-match summary is present in the response payload

### Task 6: Final Cleanup And Commit

**Files:**
- Review: all touched files above

- [ ] **Step 1: Scan for stale label-only purpose copy**

Search for remaining raw purpose labels in the recommendation and condition-validation flow:

```bash
rg -n '"purpose"|실거주 목적|투자 목적|구매 목적' features app tests
```

- [ ] **Step 2: Remove any duplicated purpose heuristics**

If the same rule is implemented in two places, consolidate it into `purposeMatchScoring.ts` so the UI and API do not drift.

- [ ] **Step 3: Re-run the targeted tests**

Run:

```bash
PATH=/opt/homebrew/bin:$PATH /opt/homebrew/bin/node --test tests/purpose-match-scoring.test.mjs tests/condition-validation-display.test.mjs tests/recommendation-unit-parse.test.mjs
```

Expected: PASS

- [ ] **Step 4: Commit the design-backed implementation**

```bash
git add docs/superpowers/specs/2026-04-10-purpose-match-scoring-design.md
git add docs/superpowers/plans/2026-04-10-purpose-match-scoring.md
git add features/condition-validation/domain/types.ts
git add features/condition-validation/server/profile-resolver.ts
git add features/condition-validation/domain/purposeMatchScoring.ts
git add features/condition-validation/domain/fullCustomerEvaluator.ts
git add features/condition-validation/domain/guestEvaluator.ts
git add app/api/condition-validation/recommend/route.ts
git add features/recommendations/lib/recommendationCategoryReason.ts
git add features/recommendations/lib/recommendationUnitTypes.ts
git add features/offerings/components/detail/conditionValidationDisplay.ts
git add features/recommendations/hooks/useRecommendations.ts
git add tests/purpose-match-scoring.test.mjs
git add tests/condition-validation-display.test.mjs
git commit -m "feat: split purpose preference from property fit"
```
