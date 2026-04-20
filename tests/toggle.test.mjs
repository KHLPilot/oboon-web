import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const filePath = path.join(process.cwd(), "components/ui/Toggle.tsx");

test("Toggle은 switch semantics와 크기별 클래스가 있다", async () => {
  const source = await readFile(filePath, "utf8");

  assert.match(source, /role="switch"/);
  assert.match(source, /aria-checked=\{checked\}/);
  assert.match(source, /h-6 w-11/);
  assert.match(source, /h-5 w-5/);
  assert.match(source, /translate-x-5/);
  assert.match(source, /h-5 w-9/);
  assert.match(source, /h-4 w-4/);
  assert.match(source, /translate-x-4/);
  assert.match(source, /opacity-50/);
  assert.match(source, /bg-\(--oboon-primary\)/);
  assert.match(source, /bg-\(--oboon-bg-subtle\)/);
});
