import assert from "node:assert/strict";
import test from "node:test";

import {
  shouldAutoEvaluateRecommendations,
} from "../features/recommendations/lib/recommendation-evaluation.ts";

test("ready 상태여도 사용자가 평가를 누르기 전에는 자동 평가하지 않는다", () => {
  const shouldRun = shouldAutoEvaluateRecommendations({
    isBootstrapping: false,
    hasUserTriggeredEvaluation: false,
    mode: "input",
    isReadyToEvaluate: true,
    skipNextAutoEvaluation: false,
  });

  assert.equal(shouldRun, false);
});

test("사용자가 한 번 평가한 뒤 시뮬레이터에서 조건이 바뀌면 자동 재평가할 수 있다", () => {
  const shouldRun = shouldAutoEvaluateRecommendations({
    isBootstrapping: false,
    hasUserTriggeredEvaluation: true,
    mode: "sim",
    isReadyToEvaluate: true,
    skipNextAutoEvaluation: false,
  });

  assert.equal(shouldRun, true);
});

test("직전 수동 평가로 상태를 동기화한 경우 다음 자동 평가는 건너뛴다", () => {
  const shouldRun = shouldAutoEvaluateRecommendations({
    isBootstrapping: false,
    hasUserTriggeredEvaluation: true,
    mode: "sim",
    isReadyToEvaluate: true,
    skipNextAutoEvaluation: true,
  });

  assert.equal(shouldRun, false);
});
