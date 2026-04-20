import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const clientBodyPath = path.join(
  process.cwd(),
  "features/offerings/components/OfferingsClientBody.tsx",
);
const filterBarPath = path.join(
  process.cwd(),
  "features/offerings/components/FilterBar.tsx",
);

test("분양 리스트는 필터된 표시 개수를 FilterBar에 넘긴다", async () => {
  const source = await readFile(clientBodyPath, "utf8");

  assert.match(source, /const visibleCount = rowsLoaded && !loadError \? sortedOfferings\.length : null;/);
  assert.match(source, /visibleCount=\{visibleCount\}/);
});

test("모바일 정렬 행의 좌측에는 현장 개수가 표시된다", async () => {
  const source = await readFile(filterBarPath, "utf8");

  assert.match(source, /visibleCount\?: number \| null;/);
  assert.match(source, /현장 \{visibleCount\.toLocaleString\("ko-KR"\)\}개/);
  assert.match(source, /shrink-0 whitespace-nowrap ob-typo-caption font-medium text-\(--oboon-text-muted\)/);
});
