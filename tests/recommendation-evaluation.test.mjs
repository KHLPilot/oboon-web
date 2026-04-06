import assert from "node:assert/strict";
import test from "node:test";

import {
  shouldAutoEvaluateRecommendations,
} from "../features/recommendations/lib/recommendation-evaluation.ts";

test("ready 상태면 최초 진입에도 자동 평가한다", () => {
  const shouldRun = shouldAutoEvaluateRecommendations({
    isBootstrapping: false,
    hasRestoredCondition: true,
    alreadyAutoEvaluated: false,
    isReadyToEvaluate: true,
  });

  assert.equal(shouldRun, true);
});

test("복원된 조건이 없으면 자동 평가하지 않는다", () => {
  const shouldRun = shouldAutoEvaluateRecommendations({
    isBootstrapping: false,
    hasRestoredCondition: false,
    alreadyAutoEvaluated: false,
    isReadyToEvaluate: true,
  });

  assert.equal(shouldRun, false);
});

test("페이지 진입 후 이미 자동 평가했다면 다시 자동 평가하지 않는다", () => {
  const shouldRun = shouldAutoEvaluateRecommendations({
    isBootstrapping: false,
    hasRestoredCondition: true,
    alreadyAutoEvaluated: true,
    isReadyToEvaluate: true,
  });

  assert.equal(shouldRun, false);
});
