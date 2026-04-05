import assert from "node:assert/strict";
import test from "node:test";

import {
  isStep1ReadyByAuth,
  isStep3ReadyByAuth,
} from "../features/recommendations/lib/recommendationInputPolicy.ts";

test("비로그인 step1은 월 지출과 직업 없이도 진행 가능하다", () => {
  const ready = isStep1ReadyByAuth(
    {
      employmentType: null,
      houseOwnership: "none",
      availableCash: 1000,
      monthlyIncome: 300,
      monthlyExpenses: 0,
    },
    false,
  );

  assert.equal(ready, true);
});

test("로그인 step1은 월 지출과 직업이 모두 필요하다", () => {
  const ready = isStep1ReadyByAuth(
    {
      employmentType: null,
      houseOwnership: "none",
      availableCash: 1000,
      monthlyIncome: 300,
      monthlyExpenses: 0,
    },
    true,
  );

  assert.equal(ready, false);
});

test("비로그인 step3은 분양 목적만 있으면 완료 가능하다", () => {
  const ready = isStep3ReadyByAuth(
    {
      purchasePurposeV2: "residence",
      purchaseTiming: null,
      moveinTiming: null,
    },
    false,
  );

  assert.equal(ready, true);
});

test("로그인 step3은 시점과 입주 조건도 모두 필요하다", () => {
  const ready = isStep3ReadyByAuth(
    {
      purchasePurposeV2: "residence",
      purchaseTiming: null,
      moveinTiming: null,
    },
    true,
  );

  assert.equal(ready, false);
});
