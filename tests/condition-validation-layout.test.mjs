import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const targetPath = path.join(
  process.cwd(),
  "features/offerings/components/detail/ConditionValidationCard.tsx",
);

test("조건 검증 데스크탑 결과 레이아웃은 비대칭 메인-사이드바 구조를 사용한다", async () => {
  const source = await readFile(targetPath, "utf8");

  assert.match(
    source,
    /xl:grid-cols-\[minmax\(0,1\.55fr\)_minmax\(320px,0\.95fr\)\]/,
  );
  assert.match(source, /xl:sticky xl:top-24/);
  assert.match(source, /핵심 수치/);
  assert.doesNotMatch(
    source,
    /lg:grid-cols-\[minmax\(0,1\.35fr\)_minmax\(280px,0\.85fr\)\]/,
  );
  assert.match(source, /<div className="grid gap-3">\s*<h3 className="ob-typo-subtitle text-\(--oboon-text-title\)">카테고리별 상세 결과/);
  assert.match(source, /<div className="grid gap-3">\s*<h3 className="ob-typo-subtitle text-\(--oboon-text-title\)">핵심 수치/);
  assert.match(source, /<div className="grid gap-3">\s*<h3 className="ob-typo-subtitle text-\(--oboon-text-title\)">타입 결과 요약/);
});
