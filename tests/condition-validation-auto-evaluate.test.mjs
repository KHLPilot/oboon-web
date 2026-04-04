import assert from "node:assert/strict";
import test from "node:test";

import {
  shouldAutoEvaluateDetailValidation,
} from "../features/offerings/components/detail/conditionValidationAutoEvaluate.ts";

test("상세 페이지는 저장 프로필 자동 채움만으로는 자동 평가하지 않는다", () => {
  const shouldRun = shouldAutoEvaluateDetailValidation({
    source: "profile_autofill",
    isLoggedIn: true,
    propertyId: 101,
    alreadyEvaluated: false,
  });

  assert.equal(shouldRun, false);
});

test("상세 페이지는 세션 복원만으로는 자동 평가하지 않는다", () => {
  const shouldRun = shouldAutoEvaluateDetailValidation({
    source: "session_restore",
    isLoggedIn: true,
    propertyId: 101,
    alreadyEvaluated: false,
  });

  assert.equal(shouldRun, false);
});

test("상세 페이지는 수동 평가일 때만 실행할 수 있다", () => {
  const shouldRun = shouldAutoEvaluateDetailValidation({
    source: "manual",
    isLoggedIn: true,
    propertyId: 101,
    alreadyEvaluated: false,
  });

  assert.equal(shouldRun, true);
});
