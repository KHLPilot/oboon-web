import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const filePath = path.join(process.cwd(), "components/ui/Checkbox.tsx");

test("Checkbox는 커스텀 체크박스와 label 텍스트를 제공한다", async () => {
  const source = await readFile(filePath, "utf8");

  assert.match(source, /import \{ Check \} from "lucide-react";/);
  assert.match(source, /checked: boolean/);
  assert.match(source, /onChange: \(checked: boolean\) => void/);
  assert.match(source, /label\?: string/);
  assert.match(source, /disabled\?: boolean/);
  assert.match(source, /className\?: string/);
  assert.match(source, /id\?: string/);
  assert.match(source, /className=\{cx\([\s\S]*"flex items-center gap-2 cursor-pointer"/);
  assert.match(source, /type="checkbox"/);
  assert.match(source, /className="sr-only"/);
  assert.match(source, /h-4 w-4/);
  assert.match(source, /bg-\(--oboon-primary\)/);
  assert.match(source, /border-\(--oboon-primary\)/);
  assert.match(source, /transition-colors duration-150/);
});
