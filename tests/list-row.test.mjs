import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const filePath = path.join(process.cwd(), "components/ui/ListRow.tsx");

test("ListRow는 요구된 export 타입과 compound 구조를 갖는다", async () => {
  const source = await readFile(filePath, "utf8");

  assert.match(source, /export type ListRowProps = {/);
  assert.match(source, /export type ListRowTextsProps = {/);
  assert.match(source, /React\.forwardRef/);
  assert.match(source, /type ListRowCompound = typeof ListRow & {/);
  assert.match(source, /Texts: typeof ListRowTexts;/);
  assert.match(source, /export default ListRow as ListRowCompound;/);
});

test("ListRow는 touch effect, disabled, arrow, border 옵션을 갖는다", async () => {
  const source = await readFile(filePath, "utf8");

  assert.match(source, /withTouchEffect\?: boolean;/);
  assert.match(source, /disabled\?: boolean;/);
  assert.match(source, /withArrow\?: boolean;/);
  assert.match(source, /border\?: "indented" \| "none";/);
  assert.match(source, /switch \(border\)/);
  assert.match(source, /hover:bg-\(--oboon-bg-subtle\)\/60/);
  assert.match(source, /active:bg-\(--oboon-bg-subtle\)/);
  assert.match(source, /opacity-40/);
  assert.match(source, /pointer-events-none/);
  assert.match(source, /ChevronRight/);
});

test("ListRow.Texts는 title subtitle caption 타이포를 렌더링한다", async () => {
  const source = await readFile(filePath, "utf8");

  assert.match(source, /ob-typo-body2 text-\(--oboon-text-default\)/);
  assert.match(source, /ob-typo-caption1 text-\(--oboon-text-muted\)/);
  assert.match(source, /ob-typo-caption2 text-\(--oboon-text-subtle\)/);
  assert.match(source, /flex flex-col gap-0\.5/);
});
