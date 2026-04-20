import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const filePath = path.join(
  process.cwd(),
  "features/recommendations/components/MobileConditionSheet.tsx",
);

test("MobileConditionSheet는 ConditionBar chips를 렌더링한다", async () => {
  const source = await readFile(filePath, "utf8");

  assert.match(source, /import ConditionBar, \{ type ConditionChip \} from "@\/components\/ui\/ConditionBar";/);
  assert.match(source, /function buildConditionChips\(condition: RecommendationCondition\): ConditionChip\[\] {/);
  assert.match(source, /<ConditionBar chips=\{conditionChips\} className="mt-1" \/>/);
  assert.doesNotMatch(source, /join\(" · "\)/);
  assert.doesNotMatch(source, /line-clamp-2/);
});
