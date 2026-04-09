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

test("분양가표 아코디언은 가격 중심 행 요약과 조건 CTA/결과 레이어를 사용한다", async () => {
  const source = await readFile(accordionPath, "utf8");

  assert.match(source, /buildOfferingUnitSpecSummary/);
  assert.match(source, /buildOfferingUnitConditionState/);
  assert.match(source, /내 조건으로 확인/);
  assert.match(source, /scrollIntoView\(\{ behavior: "smooth", block: "start" \}\)/);
  assert.match(source, /formatPriceRange\(unit\.price_min, unit\.price_max/);
  assert.doesNotMatch(source, /flex gap-1 overflow-x-auto border-b border-\(--oboon-border-default\) pb-0\.5/);
});

test("분양가표 아코디언은 effect 없이 열린 항목을 fallback 계산으로 재조정한다", async () => {
  const source = await readFile(accordionPath, "utf8");

  assert.doesNotMatch(source, /setOpenUnitId\(\(current\) => \{/);
  assert.match(source, /const \[hasManualAccordionState, setHasManualAccordionState\] = useState\(false\);/);
  assert.match(source, /const effectiveOpenUnitId = useMemo\(\(\) => \{/);
  assert.match(source, /rows\.length === 0/);
  assert.match(source, /if \(openUnitId != null && rows\.some\(\(row\) => row\.id === openUnitId\)\)/);
  assert.match(source, /if \(!hasManualAccordionState \|\| openUnitId !== null\)/);
  assert.match(source, /rows\[0\]\?\.id \?\? null/);
  assert.match(source, /setOpenUnitId\(effectiveOpenUnitId === unit\.id \? null : unit\.id\)/);
});

test("분양가표 아코디언은 트리거와 패널을 aria-controls\/labelledby로 연결한다", async () => {
  const source = await readFile(accordionPath, "utf8");

  assert.match(source, /const panelId = `offering-unit-panel-\$\{unit\.id\}`/);
  assert.match(source, /const triggerId = `offering-unit-trigger-\$\{unit\.id\}`/);
  assert.match(source, /aria-controls=\{panelId\}/);
  assert.match(source, /id=\{triggerId\}/);
  assert.match(source, /id=\{panelId\}/);
  assert.match(source, /role="region"/);
  assert.match(source, /aria-labelledby=\{triggerId\}/);
});

test("분양가표 아코디언 확장 패널은 검증 전후 레이아웃 분기와 섹션 구성을 가진다", async () => {
  const source = await readFile(accordionPath, "utf8");

  assert.match(source, /import ConditionValidationCategoryPanel from "\.\/ConditionValidationCategoryPanel";/);
  assert.match(source, /buildFullConditionCategoryDisplay/);
  assert.match(source, /buildGuestConditionCategoryDisplay/);
  assert.match(source, /const categoryDisplayItems = buildUnitCategoryDisplayItems\(validation\);/);
  assert.match(source, /<ConditionValidationCategoryPanel items=\{categoryDisplayItems\} \/>/);
  assert.match(source, /categoryDisplayItems\.length > 0 \? \(/);
  assert.match(source, /conditionState\.mode === "cta" \? \(/);
  assert.match(source, /conditionState\.mode === "result" \? \(/);
  assert.match(source, /className="grid grid-cols-1 gap-4 sm:grid-cols-2"/);
  assert.match(source, /className="grid grid-cols-1 gap-4 lg:grid-cols-2"/);
  assert.match(
    source,
    /className="space-y-4"/,
  );
  assert.match(
    source,
    /conditionState\.mode === "cta" \? \([\s\S]*?>\s*타입 정보\s*<[\s\S]*?>\s*평면도\s*</,
  );
  assert.match(
    source,
    /conditionState\.mode === "result" \? \([\s\S]*?className="grid grid-cols-1 gap-4 lg:grid-cols-2"[\s\S]*?>\s*필요 자금\s*<[\s\S]*?>\s*타입 정보\s*<[\s\S]*?>\s*카테고리별 결과\s*<[\s\S]*?>\s*평면도\s*</,
  );
  assert.doesNotMatch(
    source,
    /className="grid gap-4 lg:grid-cols-\[minmax\(0,1\.1fr\)_minmax\(0,0\.9fr\)\]"/,
  );
  assert.doesNotMatch(source, />\s*가격 정보\s*</);
  assert.doesNotMatch(source, /<dt className="ob-typo-caption text-\(--oboon-text-muted\)">\s*분양가\s*<\/dt>/);
  assert.doesNotMatch(source, />\s*내 조건 기준\s*</);
  assert.doesNotMatch(source, />\s*판정 이유\s*</);
  assert.match(source, /h-\[280px\].*sm:h-\[320px\].*lg:h-\[360px\]/);
});

test("TypeInfoTable은 라벨 위 값 아래의 2열 카드 그리드를 사용한다", async () => {
  const source = await readFile(accordionPath, "utf8");
  const typeInfoTableMatch = source.match(/function TypeInfoTable\([\s\S]*?\n}\n\nexport default function/);

  assert.ok(typeInfoTableMatch);

  const typeInfoTableSource = typeInfoTableMatch[0];

  assert.match(typeInfoTableSource, /<div className="grid grid-cols-2 gap-3">/);
  assert.match(typeInfoTableSource, /className="space-y-0\.5"/);
  assert.match(
    typeInfoTableSource,
    /<p className="ob-typo-caption text-\(--oboon-text-muted\)">\{row\.label\}<\/p>/,
  );
  assert.match(
    typeInfoTableSource,
    /<p className="ob-typo-body2 text-\(--oboon-text-title\)">\{row\.value\}<\/p>/,
  );
  assert.doesNotMatch(typeInfoTableSource, /<dl className="space-y-3">/);
});

test("카테고리별 결과 패널은 카드 목록을 2열 그리드로 배치한다", async () => {
  const source = await readFile(categoryPanelPath, "utf8");

  assert.match(source, /<section className="grid grid-cols-1 gap-2 sm:grid-cols-2">/);
  assert.doesNotMatch(source, /<section className="space-y-2">/);
});
