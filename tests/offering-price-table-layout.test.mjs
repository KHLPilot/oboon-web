import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  buildOfferingUnitConditionState,
  buildOfferingUnitSpecSummary,
  validationMeta,
} from "../features/offerings/components/detail/offeringPriceTableLayout.ts";

const accordionPath = path.join(
  process.cwd(),
  "features/offerings/components/detail/offeringTypesAccordion.client.tsx",
);
const categoryPanelPath = path.join(
  process.cwd(),
  "features/offerings/components/detail/ConditionValidationCategoryPanel.tsx",
);

test("전용면적 중심 보조 정보는 전용면적을 첫 토큰으로 만든다", () => {
  const summary = buildOfferingUnitSpecSummary({
    exclusive_area: 59.91,
    rooms: 3,
    bathrooms: 2,
    unit_count: 84,
  });

  assert.equal(summary, "전용 59.9㎡ · 3룸 · 2욕실 · 84세대");
});

test("조건 검증 전 상태는 CTA 문구를 반환한다", () => {
  const state = buildOfferingUnitConditionState(null);

  assert.deepEqual(state, {
    mode: "cta",
    label: "내 조건으로 확인",
  });
});

test("조건 검증 후 상태는 결과 라벨과 핵심 수치를 한 줄로 만든다", () => {
  const state = buildOfferingUnitConditionState({
    final_grade: "GREEN",
    grade_label: "우선 검토",
    summary_message: "자금 여건은 무난하지만 대출 조건은 확인이 필요합니다.",
    metrics: {
      min_cash: 14000,
      monthly_burden_percent: 32.1,
    },
  });

  assert.equal(state.mode, "result");
  assert.equal(state.badgeLabel, "우선 검토");
  assert.equal(state.metricLine, "초기 필요 자금 1.4억 · 월 부담률 32.1%");
  assert.match(state.helperText, /자금 여건은 무난하지만/);
});

test("빈 summary_message는 null로 정규화하고 빈 grade_label은 grade5DetailLabel로 되돌린다", () => {
  const state = buildOfferingUnitConditionState({
    final_grade: "RED",
    grade_label: "   ",
    summary_message: " \t ",
    metrics: {
      min_cash: 14000,
      monthly_burden_percent: 32.1,
    },
  });

  assert.equal(state.mode, "result");
  assert.equal(state.badgeLabel, "미충족");
  assert.equal(state.helperText, null);
});

test("metrics가 없으면 결과 수치 문구는 기본 안내 문구를 사용한다", () => {
  const state = buildOfferingUnitConditionState({
    final_grade: "GREEN",
    grade_label: "",
    summary_message: "조건 확인이 필요합니다.",
  });

  assert.equal(state.mode, "result");
  assert.equal(state.metricLine, "초기 필요 자금 확인 필요 · 월 부담률 계산 불가");
});

test("스펙 숫자가 없으면 요약은 전용 확인중을 사용한다", () => {
  const summary = buildOfferingUnitSpecSummary({
    exclusive_area: null,
    rooms: null,
    bathrooms: null,
    unit_count: null,
  });

  assert.equal(summary, "전용 확인중");
});

test("validationMeta는 GREEN 등급에 대해 초록 색상 토큰을 반환한다", () => {
  const meta = validationMeta("GREEN");
  assert.equal(meta.color, "var(--oboon-grade-green)");
  assert.equal(meta.bgColor, "var(--oboon-grade-green-bg)");
});

test("validationMeta는 RED 등급에 대해 빨간 색상 토큰을 반환한다", () => {
  const meta = validationMeta("RED");
  assert.equal(meta.color, "var(--oboon-grade-red)");
  assert.equal(meta.bgColor, "var(--oboon-grade-red-bg)");
});

test("분양가표 아코디언은 UnitTypeDetailSheet를 import한다", async () => {
  const source = await readFile(accordionPath, "utf8");
  assert.match(source, /from "\.\/UnitTypeDetailSheet"/);
  assert.match(source, /UnitTypeDetailSheet/);
});

test("분양가표 아코디언은 ChevronRight를 사용하고 ChevronDown을 사용하지 않는다", async () => {
  const source = await readFile(accordionPath, "utf8");
  assert.match(source, /ChevronRight/);
  assert.doesNotMatch(source, /ChevronDown/);
});

test("분양가표 아코디언은 selectedUnitId 상태를 가지며 openUnitId를 사용하지 않는다", async () => {
  const source = await readFile(accordionPath, "utf8");
  assert.match(source, /selectedUnitId/);
  assert.doesNotMatch(source, /openUnitId/);
  assert.doesNotMatch(source, /hasManualAccordionState/);
  assert.doesNotMatch(source, /effectiveOpenUnitId/);
});

test("분양가표 아코디언은 buildOfferingUnitSpecSummary와 validationMeta를 사용한다", async () => {
  const source = await readFile(accordionPath, "utf8");
  assert.match(source, /buildOfferingUnitSpecSummary/);
  assert.match(source, /validationMeta/);
  assert.match(source, /formatPriceRange\(unit\.price_min, unit\.price_max/);
});

test("분양가표 아코디언은 aria-haspopup=dialog를 갖는다", async () => {
  const source = await readFile(accordionPath, "utf8");
  assert.match(source, /aria-haspopup="dialog"/);
});
