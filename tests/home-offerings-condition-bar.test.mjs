import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const filePath = path.join(
  process.cwd(),
  "features/offerings/components/HomeOfferingsSection.client.tsx",
);

test("HomeOfferingsSection는 ConditionBar chips 상태를 사용한다", async () => {
  const source = await readFile(filePath, "utf8");

  assert.match(source, /import ConditionBar, \{ type ConditionChip \} from "@\/components\/ui\/ConditionBar";/);
  assert.match(source, /const \[appliedConditionChips, setAppliedConditionChips\] = useState<ConditionChip\[\]>\(\[\]\);/);
  assert.match(source, /setAppliedConditionChips\(\s*buildAppliedConditionChips\(/s);
  assert.match(source, /<ConditionBar chips=\{appliedConditionChips\} \/>/);
  assert.doesNotMatch(source, /appliedCustomerSummary/);
  assert.doesNotMatch(source, /summaryParts/);
});
