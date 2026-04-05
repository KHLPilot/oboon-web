import assert from "node:assert/strict";
import test from "node:test";

import {
  pickLoggedInConditionSource,
  pickLoggedOutConditionSource,
} from "../features/condition-validation/lib/conditionSourcePolicy.ts";

test("로그인 사용자는 profiles를 최우선으로 복원한다", () => {
  const source = pickLoggedInConditionSource({
    hasProfile: true,
    hasRequest: true,
    hasDraft: true,
    hasSession: true,
  });

  assert.equal(source, "profile");
});

test("로그인 사용자는 profiles가 없을 때만 최근 요청으로 fallback 한다", () => {
  const source = pickLoggedInConditionSource({
    hasProfile: false,
    hasRequest: true,
    hasDraft: true,
    hasSession: true,
  });

  assert.equal(source, "request");
});

test("로그인 사용자는 request도 없을 때만 draft를 사용한다", () => {
  const source = pickLoggedInConditionSource({
    hasProfile: false,
    hasRequest: false,
    hasDraft: true,
    hasSession: true,
  });

  assert.equal(source, "draft");
});

test("비로그인 사용자는 session을 최우선으로 복원한다", () => {
  const source = pickLoggedOutConditionSource({
    hasSession: true,
    hasDraft: true,
  });

  assert.equal(source, "session");
});

test("비로그인 사용자는 session이 없을 때만 draft를 사용한다", () => {
  const source = pickLoggedOutConditionSource({
    hasSession: false,
    hasDraft: true,
  });

  assert.equal(source, "draft");
});
