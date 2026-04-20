import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const files = [
  "features/recommendations/components/ConditionWizardStep1.tsx",
  "features/recommendations/components/ConditionWizardStep2.tsx",
  "features/recommendations/components/ConditionWizardStep3.tsx",
];

for (const file of files) {
  test(`${file}는 하단 버튼 바를 ActionBar로 감싼다`, async () => {
    const source = await readFile(path.join(process.cwd(), file), "utf8");

    assert.match(source, /import ActionBar from "@\/components\/ui\/ActionBar";/);
    assert.doesNotMatch(source, /FIXED_ACTIONS/);
    assert.doesNotMatch(source, /MOBILE_FIXED_ACTIONS/);
    assert.match(source, /<ActionBar(?:\s+hideAbove="lg")?>/);
    assert.match(source, /<\/ActionBar>/);
  });
}
