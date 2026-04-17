import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const filePath = path.join(process.cwd(), "components/ui/SegmentedControl.tsx");

test("SegmentedControl는 요구된 props와 indicator 구조를 갖는다", async () => {
  const source = await readFile(filePath, "utf8");

  assert.match(source, /type SegmentedControlProps = {/);
  assert.match(source, /options: SegmentedControlOption\[\];/);
  assert.match(source, /value: string;/);
  assert.match(source, /onChange: \(value: string\) => void;/);
  assert.match(source, /icon\?: React\.ReactNode;/);
  assert.match(source, /useIsomorphicLayoutEffect/);
  assert.match(source, /offsetLeft/);
  assert.match(source, /offsetWidth/);
  assert.match(source, /ResizeObserver/);
  assert.match(source, /transition-transform/);
  assert.match(source, /bg-\(--oboon-bg-subtle\)/);
  assert.match(source, /bg-\(--oboon-bg-surface\)/);
  assert.match(source, /shadow-sm/);
  assert.match(source, /aria-pressed/);
});

test("SegmentedControl는 한 줄 고정과 스크롤 안전 장치를 갖는다", async () => {
  const source = await readFile(filePath, "utf8");

  assert.match(source, /flex-nowrap/);
  assert.match(source, /w-max/);
  assert.match(source, /overflow-x-auto/);
  assert.match(source, /scrollbar-none/);
  assert.match(source, /whitespace-nowrap/);
  assert.match(source, /shrink-0/);
});
