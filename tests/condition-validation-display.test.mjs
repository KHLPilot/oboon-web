import assert from "node:assert/strict";
import test from "node:test";

import {
  buildFullConditionCategoryDisplay,
  buildGuestConditionCategoryDisplay,
  normalizeDetailUnitTypeResults,
} from "../features/offerings/components/detail/conditionValidationDisplay.ts";

test("상세 타입 결과를 추천 패널용 평형 데이터로 정규화한다", () => {
  const units = normalizeDetailUnitTypeResults([
    {
      unit_type_id: 11,
      unit_type_name: "84A",
      exclusive_area: 84.91,
      list_price_manwon: 82000,
      is_price_public: false,
      final_grade: "ORANGE",
      total_score: 73,
      summary_message: "자금 여유 확인이 필요합니다.",
      grade_label: "검토 필요",
      metrics: {
        contract_amount: 8200,
        min_cash: 8200,
        recommended_cash: 16400,
        loan_amount: 45000,
        monthly_payment_est: 210,
        monthly_burden_percent: 41.7,
        timing_months_diff: 4,
      },
      categories: {
        cash: { grade: "ORANGE", score: 18, max_score: 30, reason: "계약금의 60% — 부족" },
        timing: { grade: "YELLOW", score: 6, max_score: 10, reason: "희망 1년 이내 · 실제 1년 이후" },
      },
      recommendation_context: {
        available_cash_manwon: 8000,
        monthly_income_manwon: 420,
        house_ownership: "none",
        purchase_purpose: "residence",
      },
    },
  ]);

  assert.equal(units.length, 1);
  assert.equal(units[0].title, "84A");
  const cash = units[0].categories.find((category) => category.key === "cash");
  assert.ok(cash);
  assert.doesNotMatch(cash.reason, /60%|계약금의/);
  assert.match(cash.reason, /계약금과 초기 자금이 부족해|초기 자금 여유는 크지 않아요/);

  const timing = units[0].categories.find((category) => category.key === "timing");
  assert.ok(timing);
  assert.match(timing.reason, /약 4개월/);
});

test("로그인 상세 결과를 설명형 카테고리 카드 데이터로 변환한다", () => {
  const items = buildFullConditionCategoryDisplay({
    categories: {
      cash: { grade: "YELLOW", score: 20, max_score: 30, reason: "계약금의 85% — 보통" },
      income: { grade: "ORANGE", score: 9, max_score: 25, reason: "안정성 3/8 · 상환여력 8/8 · 소득규모 1/7" },
      ltv_dsr: { grade: "YELLOW", score: 10, max_score: 20, reason: "DSR 32%" },
      ownership: { grade: "GREEN", score: 10, max_score: 10, reason: "무주택" },
      purpose: { grade: "GREEN", score: 5, max_score: 5, reason: "실거주" },
      timing: { grade: "YELLOW", score: 6, max_score: 10, reason: "희망 1년 이내 · 실제 1년 이후" },
    },
    metrics: {
      contract_amount: 9000,
      min_cash: 9000,
      recommended_cash: 18000,
      loan_amount: 45000,
      monthly_payment_est: 200,
      monthly_surplus: 220,
      monthly_burden_percent: 28,
      dsr_percent: 32,
      timing_months_diff: 4,
    },
    inputs: {
      availableCash: 8000,
      monthlyIncome: 500,
      employmentType: "freelancer",
      houseOwnership: "none",
      purchasePurpose: "residence",
    },
    isPricePublic: true,
  });

  assert.equal(items.length, 6);
  assert.deepEqual(
    items.map((item) => item.label),
    ["자금력", "소득", "대출 여건", "주택 보유", "구매 목적", "시점"],
  );

  const income = items.find((item) => item.key === "income");
  assert.ok(income);
  assert.match(income.reason, /보수적으로 평가했어요/);

  const ltvDsr = items.find((item) => item.key === "ltv_dsr");
  assert.ok(ltvDsr);
  assert.match(ltvDsr.reason, /32%/);
  assert.match(ltvDsr.reason, /보수적으로 평가했어요/);
});

test("비회원 상세 결과도 설명형 카테고리 카드 데이터로 변환한다", () => {
  const items = buildGuestConditionCategoryDisplay({
    categories: {
      cash: { grade: "ORANGE", score: 8, max_score: 15, reason: "원문 자금 사유" },
      income: { grade: "GREEN", score: 12, max_score: 12, reason: "소득 양호" },
      credit: { grade: "GREEN", score: 8, max_score: 8, reason: "신용 양호" },
      ownership: { grade: "GREEN", score: 10, max_score: 10, reason: "무주택" },
      purpose: { grade: "GREEN", score: 5, max_score: 5, reason: "실거주" },
    },
    metrics: {
      contract_amount: 7000,
      min_cash: 7000,
      recommended_cash: 14000,
      loan_amount: 33000,
      monthly_payment_est: 150,
      monthly_burden_percent: 27,
    },
    inputs: {
      availableCash: 8000,
      houseOwnership: "none",
      purchasePurpose: "residence",
    },
    isPricePublic: false,
  });

  assert.equal(items.length, 5);
  const cash = items.find((item) => item.key === "cash");
  assert.ok(cash);
  assert.doesNotMatch(cash.reason, /7,000|14000|권장 자금보다 약/);
  assert.match(cash.reason, /계약금과 초기 자금이 부족해|초기 자금 여유는 크지 않아요/);
});
