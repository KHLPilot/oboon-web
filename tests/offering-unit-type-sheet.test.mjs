import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const sheetPath = path.join(
  process.cwd(),
  "features/offerings/components/detail/UnitTypeDetailSheet.tsx",
);

test("UnitTypeDetailSheet는 UnitTypeRow 타입을 export한다", async () => {
  const source = await readFile(sheetPath, "utf8");
  assert.match(source, /export type UnitTypeRow/);
});

test("UnitTypeDetailSheet는 role=dialog와 aria-modal=true를 갖는다", async () => {
  const source = await readFile(sheetPath, "utf8");
  assert.match(source, /role="dialog"/);
  assert.match(source, /aria-modal="true"/);
});

test("UnitTypeDetailSheet는 ESC 키 핸들러를 등록한다", async () => {
  const source = await readFile(sheetPath, "utf8");
  assert.match(source, /e\.key === "Escape"/);
});

test("UnitTypeDetailSheet는 body 스크롤을 잠근다", async () => {
  const source = await readFile(sheetPath, "utf8");
  assert.match(source, /document\.body\.style\.overflow = "hidden"/);
  assert.match(source, /window\.scrollTo/);
});

test("UnitTypeDetailSheet는 모바일 bottom sheet 클래스를 갖는다", async () => {
  const source = await readFile(sheetPath, "utf8");
  assert.match(source, /max-h-\[85dvh\]/);
  assert.match(source, /translate-y-full/);
});

test("UnitTypeDetailSheet는 데스크톱 right panel 클래스를 갖는다", async () => {
  const source = await readFile(sheetPath, "utf8");
  assert.match(source, /lg:w-\[420px\]/);
  assert.match(source, /lg:translate-x-full/);
});

test("UnitTypeDetailSheet는 헤더보다 위에 오는 z-index를 사용한다", async () => {
  const source = await readFile(sheetPath, "utf8");
  assert.match(source, /z-70/);
  assert.match(source, /z-80/);
  assert.doesNotMatch(source, /z-40/);
  assert.doesNotMatch(source, /z-50/);
});

test("UnitTypeDetailSheet는 분양가·타입정보·평면도 섹션을 갖는다", async () => {
  const source = await readFile(sheetPath, "utf8");
  assert.match(source, /분양가 정보/);
  assert.match(source, /타입 정보/);
  assert.match(source, /평면도/);
});

test("UnitTypeDetailSheet는 내 조건 기준과 판정 이유를 validation 조건부로 렌더한다", async () => {
  const source = await readFile(sheetPath, "utf8");
  assert.match(source, /내 조건 기준/);
  assert.match(source, /판정 이유/);
  assert.match(source, /validation &&/);
});

test("UnitTypeDetailSheet는 ImageModal과 setZoom을 갖는다", async () => {
  const source = await readFile(sheetPath, "utf8");
  assert.match(source, /ImageModal/);
  assert.match(source, /setZoom/);
});

test("UnitTypeDetailSheet는 미검증 CTA에서 onScrollToConditionValidation을 호출한다", async () => {
  const source = await readFile(sheetPath, "utf8");
  assert.match(source, /onScrollToConditionValidation/);
  assert.match(source, /내 조건으로 확인/);
});
