import assert from "node:assert/strict";
import test from "node:test";

import {
  pickLoggedInConditionSource,
  pickLoggedOutConditionSource,
} from "../features/condition-validation/lib/conditionSourcePolicy.ts";

// ──────────────────────────────────────────────
// pickLoggedInConditionSource
// 우선순위: request → session → profile → draft → default
// ──────────────────────────────────────────────

test("로그인 사용자는 최근 요청(request)을 최우선으로 복원한다", () => {
  const source = pickLoggedInConditionSource({
    hasProfile: true,
    hasRequest: true,
    hasDraft: true,
    hasSession: true,
  });

  assert.equal(source, "request");
});

test("로그인 사용자는 request가 없을 때 최근 평가 조건(session)을 우선 복원한다", () => {
  const source = pickLoggedInConditionSource({
    hasProfile: true,
    hasRequest: false,
    hasDraft: true,
    hasSession: true,
  });

  assert.equal(source, "session");
});

test("로그인 사용자는 session이 없을 때 저장 기본 조건(profile)으로 fallback 한다", () => {
  const source = pickLoggedInConditionSource({
    hasProfile: true,
    hasRequest: false,
    hasDraft: true,
    hasSession: false,
  });

  assert.equal(source, "profile");
});

test("로그인 사용자는 request·session·profile이 없을 때만 draft를 사용한다", () => {
  const source = pickLoggedInConditionSource({
    hasProfile: false,
    hasRequest: false,
    hasDraft: true,
    hasSession: false,
  });

  assert.equal(source, "draft");
});

test("로그인 사용자는 아무 조건도 없으면 default를 반환한다", () => {
  const source = pickLoggedInConditionSource({
    hasProfile: false,
    hasRequest: false,
    hasDraft: false,
    hasSession: false,
  });

  assert.equal(source, "default");
});

// ──────────────────────────────────────────────
// pickLoggedOutConditionSource
// 우선순위: session → draft → default
// ──────────────────────────────────────────────

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
