import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const targetPath = path.join(
  process.cwd(),
  "features/offerings/components/detail/OfferingDetailLeft.tsx",
);

test("분양 상세 상단 요약 카드의 세대당 주차대수는 세대당 값을 사용한다", async () => {
  const source = await readFile(targetPath, "utf8");

  assert.match(
    source,
    /<StatCard\s+label="총 세대수"[\s\S]*<StatCard\s+label="세대당 주차대수"[\s\S]*specs0\?\.parking_per_household[\s\S]*<StatCard label="입주 예정"/,
  );
  assert.doesNotMatch(source, /label="세대 당 주차대수"/);
});
