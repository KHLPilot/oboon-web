import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeRecommendationUnitTypesForTest,
} from "../features/recommendations/lib/recommendationUnitTypes.ts";

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
      metrics: {
        monthly_burden_percent: 29.1,
        min_cash: 9000,
        recommended_cash: 12000,
      },
      categories: {
        cash: { grade: "GREEN", score: 28, max_score: 30, reason: "자금 여력 충분" },
        income: { grade: "LIME", score: 21, max_score: 25, reason: "소득 안정" },
        ltv_dsr: { grade: "GREEN", score: 18, max_score: 20, reason: "대출 안정" },
        ownership: { grade: "GREEN", score: 8, max_score: 10, reason: "주택 수 적합" },
        purpose: { grade: "GREEN", score: 4, max_score: 5, reason: "목적 적합" },
        timing: { grade: "LIME", score: 8, max_score: 10, reason: "시점 양호" },
      },
      recommendation_context: {
        available_cash_manwon: 12000,
        monthly_income_manwon: 500,
        house_ownership: "none",
        purchase_purpose: "residence",
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
        cash: { grade: "LIME", score: 24, max_score: 30, reason: "자금 무난" },
        income: { grade: "GREEN", score: 22, max_score: 25, reason: "소득 우수" },
        ltv_dsr: { grade: "LIME", score: 16, max_score: 20, reason: "대출 가능" },
        ownership: { grade: "GREEN", score: 8, max_score: 10, reason: "주택 수 적합" },
        purpose: { grade: "GREEN", score: 4, max_score: 5, reason: "목적 적합" },
        timing: { grade: "GREEN", score: 9, max_score: 10, reason: "시점 적합" },
      },
    },
    {
      unit_type_id: 23,
      unit_type_name: "74C",
      exclusive_area: 74.42,
      list_price_manwon: 73000,
      is_price_public: false,
      final_grade: "ORANGE",
      total_score: null,
      summary_message: "가격 비공개 타입입니다.",
      grade_label: "검토 필요",
      metrics: {
        monthly_burden_percent: 41.7,
        min_cash: 29000,
        recommended_cash: 32000,
      },
      categories: {
        cash: {
          grade: "ORANGE",
          score: 18,
          max_score: 30,
          reason: "원문 현금 사유",
        },
        ownership: {
          grade: "GREEN",
          score: 10,
          max_score: 10,
          reason: "원문 주택수 사유",
        },
      },
      recommendation_context: {
        available_cash_manwon: 8000,
        monthly_income_manwon: 420,
      },
    },
  ]);

  assert.equal(units.length, 3);
  assert.equal(units[0].unitTypeId, 21);
  assert.equal(units[0].title, "84A");
  assert.equal(units[0].exclusiveAreaLabel, "84.91㎡");
  assert.equal(units[0].monthlyBurdenPercent, 29.1);
  assert.equal(units[0].categories.length, 6);
  assert.equal(units[0].priceLabel, "8.2억");

  const generatedCashCategory = units[0].categories.find((category) => category.key === "cash");
  assert.ok(generatedCashCategory);
  assert.equal(generatedCashCategory.rawReason, "자금 여력 충분");
  assert.notEqual(generatedCashCategory.reason, generatedCashCategory.rawReason);
  assert.match(generatedCashCategory.reason, /계약금|초기 자금|권장 자금/);

  const preservedOwnershipCategory = units[2].categories.find(
    (category) => category.key === "ownership",
  );
  assert.ok(preservedOwnershipCategory);
  assert.equal(preservedOwnershipCategory.rawReason, "원문 주택수 사유");
  assert.equal(preservedOwnershipCategory.reason, "원문 주택수 사유");

  const privateCashCategory = units[2].categories.find((category) => category.key === "cash");
  assert.ok(privateCashCategory);
  assert.equal(units[2].priceLabel, "비공개");
  assert.doesNotMatch(privateCashCategory.reason, /3[, ]?200|3200/);
});

test("timing month diff가 있으면 추천 카드도 설명형 timing 문구를 사용한다", () => {
  const units = normalizeRecommendationUnitTypesForTest([
    {
      unit_type_id: 51,
      unit_type_name: "84B",
      exclusive_area: 84.12,
      list_price_manwon: 78000,
      is_price_public: true,
      final_grade: "YELLOW",
      total_score: 81,
      summary_message: "시점 확인이 필요합니다.",
      grade_label: "검토",
      metrics: {
        monthly_burden_percent: 31.5,
        timing_months_diff: 4,
      },
      categories: {
        timing: { grade: "YELLOW", score: 6, max_score: 10, reason: "원문 시점 사유" },
      },
    },
  ]);

  const timingCategory = units[0].categories.find((category) => category.key === "timing");
  assert.ok(timingCategory);
  assert.notEqual(timingCategory.reason, "원문 시점 사유");
  assert.match(timingCategory.reason, /약 4개월/);
});

test("숫자 문자열 payload도 평형과 분양가 라벨로 정규화된다", () => {
  const units = normalizeRecommendationUnitTypesForTest([
    {
      unit_type_id: "31",
      unit_type_name: null,
      exclusive_area: "59.97",
      list_price_manwon: "65000",
      is_price_public: true,
      final_grade: "GREEN",
      total_score: 90,
      summary_message: "문자열 숫자 테스트",
      grade_label: "추천",
      metrics: {
        monthly_burden_percent: 24.4,
        min_cash: 28000,
        recommended_cash: 30000,
      },
      categories: {
        cash: { grade: "GREEN", score: 28, max_score: 30, reason: "자금 안정" },
      },
    },
  ]);

  assert.equal(units[0].unitTypeId, 31);
  assert.equal(units[0].title, "전용 59.97㎡");
  assert.equal(units[0].exclusiveAreaLabel, "59.97㎡");
  assert.equal(units[0].listPriceManwon, 65000);
  assert.equal(units[0].priceLabel, "6.5억");
});

test("cash threshold가 없으면 rawReason으로 되돌아간다", () => {
  const units = normalizeRecommendationUnitTypesForTest([
    {
      unit_type_id: 41,
      unit_type_name: "전용 59형",
      exclusive_area: 59.3,
      list_price_manwon: 71000,
      is_price_public: true,
      final_grade: "ORANGE",
      total_score: 72,
      summary_message: "기준 확인이 필요합니다.",
      grade_label: "검토",
      metrics: {
        monthly_burden_percent: 36.1,
      },
      categories: {
        cash: {
          grade: "ORANGE",
          score: 16,
          max_score: 30,
          reason: "원문 현금 사유",
        },
      },
      recommendation_context: {
        available_cash_manwon: 8000,
      },
    },
  ]);

  const cashCategory = units[0].categories.find((category) => category.key === "cash");
  assert.ok(cashCategory);
  assert.equal(cashCategory.rawReason, "원문 현금 사유");
  assert.equal(cashCategory.reason, "원문 현금 사유");
});
