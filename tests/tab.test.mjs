import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const filePath = path.join(process.cwd(), "components/ui/Tab.tsx");

test("Tab는 요구된 props와 compound Item을 제공한다", async () => {
  const source = await readFile(filePath, "utf8");

  assert.match(source, /"use client";/);
  assert.match(source, /export type TabProps = {/);
  assert.match(source, /children: React\.ReactNode;/);
  assert.match(source, /onChange: \(index: number\) => void;/);
  assert.match(source, /size\?: "large" \| "small";/);
  assert.match(source, /fluid\?: boolean;/);
  assert.match(source, /itemGap\?: number;/);
  assert.match(source, /ariaLabel\?: string;/);
  assert.match(source, /export type TabItemProps = {/);
  assert.match(source, /Tab\.Item/);
});

test("Tab는 인디케이터와 접근성 속성을 포함한다", async () => {
  const source = await readFile(filePath, "utf8");

  assert.match(source, /role="tablist"/);
  assert.match(source, /role="tab"/);
  assert.match(source, /aria-selected=\{selected\}/);
  assert.match(source, /offsetLeft/);
  assert.match(source, /offsetWidth/);
  assert.match(source, /ResizeObserver/);
  assert.match(source, /transition-all duration-200/);
  assert.match(source, /bg-\(--oboon-primary\)/);
  assert.match(source, /useIsomorphicLayoutEffect/);
});

test("Tab는 ArrowLeft와 ArrowRight로 포커스를 이동한다", async () => {
  const source = await readFile(filePath, "utf8");

  assert.match(source, /switch \(event\.key\)/);
  assert.match(source, /case "ArrowLeft"/);
  assert.match(source, /case "ArrowRight"/);
  assert.match(source, /tabRefs\.current/);
  assert.match(source, /focusableTabs/);
});
