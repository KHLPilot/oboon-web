import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const filePath = path.join(process.cwd(), "components/ui/ConditionBar.tsx");

test("ConditionBar는 비어 있으면 null을 반환한다", async () => {
  const source = await readFile(filePath, "utf8");

  assert.match(source, /chips\.length === 0/);
  assert.match(source, /return null;/);
});

test("ConditionBar는 onRemove가 없으면 X 버튼을 렌더링하지 않는다", async () => {
  const source = await readFile(filePath, "utf8");

  assert.match(source, /onRemove\?: \(\) => void;/);
  assert.match(source, /onRemove \? /);
  assert.match(source, /lucide-react/);
  assert.match(source, /<X /);
});

test("ConditionBar는 onReset이 있으면 초기화 버튼을 노출한다", async () => {
  const source = await readFile(filePath, "utf8");

  assert.match(source, /onReset\?: \(\) => void;/);
  assert.match(source, /초기화/);
  assert.match(source, /variant="ghost"/);
});
