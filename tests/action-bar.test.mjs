import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const filePath = path.join(process.cwd(), "components/ui/ActionBar.tsx");

test("ActionBar는 모바일 하단 고정 바와 breakpoint 숨김을 지원한다", async () => {
  const source = await readFile(filePath, "utf8");

  assert.match(source, /fixed inset-x-0 bottom-0/);
  assert.match(source, /pb-\[env\(safe-area-inset-bottom\)\]/);
  assert.match(source, /bg-\(--oboon-bg-surface\)\/90/);
  assert.match(source, /backdrop-blur/);
  assert.match(source, /border-t border-\(--oboon-border-default\)/);
  assert.match(source, /px-4 py-3/);
  assert.match(source, /sm:hidden/);
  assert.match(source, /md:hidden/);
  assert.match(source, /lg:hidden/);
});
