import assert from "node:assert/strict";
import test from "node:test";

import {
  buildRecommendationCategoryReason,
} from "../features/recommendations/lib/recommendationCategoryReason.ts";

test("public-price cash reason includes shortage amount", () => {
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
  assert.match(reason, /계약금과 초기 자금이 부족해|초기 자금 여유는 크지 않아요/);
});

test("private-price cash reason hides shortage amount", () => {
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

  assert.doesNotMatch(reason, /3[, ]?200/);
  assert.doesNotMatch(reason, /3200/);
  assert.doesNotMatch(reason, /3\.2\s*천/);
  assert.doesNotMatch(reason, /삼천이백/);
  assert.doesNotMatch(reason, /권장 자금보다 약/);
  assert.match(reason, /계약금과 초기 자금이 부족해|초기 자금 여유는 크지 않아요/);
});

test("detail-side cash reason branches by public or private price visibility", () => {
  const publicReason = buildRecommendationCategoryReason({
    key: "cash",
    grade: "ORANGE",
    isPricePublic: true,
    rawReason: "원문 자금 사유",
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
    rawReason: "원문 자금 사유",
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

  assert.match(publicReason, /약 3,200만원 부족/);
  assert.doesNotMatch(privateReason, /3[, ]?200|3200/);
  assert.match(privateReason, /계약금과 초기 자금이 부족해|초기 자금 여유는 크지 않아요/);
});

test("full-detail cash reason can explain contract coverage without threshold metrics", () => {
  const publicReason = buildRecommendationCategoryReason({
    key: "cash",
    grade: "YELLOW",
    isPricePublic: true,
    rawReason: "계약금의 85% — 보통",
    metrics: {
      cashCoveragePercent: 85,
    },
  });

  const privateReason = buildRecommendationCategoryReason({
    key: "cash",
    grade: "YELLOW",
    isPricePublic: false,
    rawReason: "계약금의 85% — 보통",
    metrics: {
      cashCoveragePercent: 85,
    },
  });

  assert.match(publicReason, /계약금의 85%/);
  assert.match(publicReason, /초기 자금/);
  assert.doesNotMatch(privateReason, /85%/);
  assert.match(privateReason, /초기 자금/);
});

test("full-detail income reason can explain surplus-based scoring", () => {
  const reason = buildRecommendationCategoryReason({
    key: "income",
    grade: "LIME",
    isPricePublic: true,
    rawReason: "안정성 8/8 · 상환여력 6/8 · 소득규모 5/7",
    metrics: {
      monthlyPaymentEst: 200,
      monthlySurplus: 260,
      incomeStabilityPoints: 8,
      incomeRepaymentPoints: 6,
      incomeScalePoints: 5,
    },
  });

  assert.match(reason, /월 잉여 자금/);
  assert.match(reason, /상환액|무난|안정/);
});

test("income reason stays conservative on low grades even when monthly burden is low", () => {
  const reason = buildRecommendationCategoryReason({
    key: "income",
    grade: "ORANGE",
    isPricePublic: true,
    metrics: {
      monthlyBurdenPercent: 28,
    },
  });

  assert.match(reason, /28%/);
  assert.match(reason, /보수적으로 평가했어요/);
  assert.doesNotMatch(reason, /안정적으로 반영됐어요/);
});

test("ltv-dsr reason stays conservative on low grades even when dsr is low", () => {
  const reason = buildRecommendationCategoryReason({
    key: "ltvDsr",
    grade: "YELLOW",
    isPricePublic: true,
    metrics: {
      dsrPercent: 32,
    },
  });

  assert.match(reason, /32%/);
  assert.match(reason, /보수적으로 평가했어요/);
  assert.doesNotMatch(reason, /무난하게 반영됐어요/);
});

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

test("raw reason is preferred when supported input data is missing", () => {
  const reason = buildRecommendationCategoryReason({
    key: "ownership",
    grade: "GREEN",
    isPricePublic: true,
    metrics: {},
    inputs: {},
    rawReason: "원문 사유를 유지해야 해요.",
  });

  assert.equal(reason, "원문 사유를 유지해야 해요.");
});

test("timing and income reasons include numeric context when available", () => {
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
  assert.match(timingReason, /시점 적합도가 낮아졌어요|시점이|일정 차이/);
  assert.match(incomeReason, /42%/);
  assert.match(incomeReason, /상환 부담이|부담이 다소 높은 편|월소득/);
});

test("timing reason avoids raw score-style copy when only raw reason is available", () => {
  const timingReason = buildRecommendationCategoryReason({
    key: "timing",
    grade: "YELLOW",
    isPricePublic: true,
    rawReason:
      "분양시점 3/5 · 희망 1년 이내 · 실제 1년 이후 · 입주시점 2/5 · 희망 즉시입주 · 실제 1년 이내",
    metrics: {},
    inputs: {
      houseOwnership: "none",
      purchasePurpose: "residence",
    },
  });

  assert.doesNotMatch(timingReason, /3\/5|2\/5|8\/10/);
  assert.match(timingReason, /희망 시점|실제 일정|보수적으로 반영/);
});

test("timing reason falls back when malformed rawReason payloads arrive", () => {
  const timingReason = buildRecommendationCategoryReason({
    key: "timing",
    grade: "YELLOW",
    isPricePublic: true,
    rawReason: {
      trim: () => ({
        split: undefined,
      }),
    },
    metrics: {},
    inputs: {
      houseOwnership: "none",
      purchasePurpose: "residence",
    },
  });

  assert.match(timingReason, /시점 적합도가/);
});
