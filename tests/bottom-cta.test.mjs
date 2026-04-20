import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const filePath = path.join(process.cwd(), "components/ui/BottomCTA.tsx");

test("BottomCTA는 요구된 props와 client effect 구조를 갖는다", async () => {
  const source = await readFile(filePath, "utf8");

  assert.match(source, /"use client";/);
  assert.match(source, /export type BottomCTAProps = {/);
  assert.match(source, /variant: "single" \| "double";/);
  assert.match(source, /primaryButton: React\.ReactNode;/);
  assert.match(source, /secondaryButton\?: React\.ReactNode;/);
  assert.match(source, /hideOnScroll\?: boolean;/);
  assert.match(source, /useEffect/);
  assert.match(source, /window\.addEventListener\("scroll"/);
  assert.match(source, /translate-y-full/);
  assert.match(source, /translate-y-0/);
});

test("BottomCTA는 single과 double 레이아웃을 구분한다", async () => {
  const source = await readFile(filePath, "utf8");

  assert.match(source, /switch \(variant\)/);
  assert.match(source, /case "single"/);
  assert.match(source, /case "double"/);
  assert.match(source, /w-full/);
  assert.match(source, /gap-3/);
  assert.match(source, /flex-1/);
  assert.match(source, /flex-\[2\]/);
  assert.match(source, /z-\(--oboon-z-overlay\)/);
  assert.match(source, /bg-\(--oboon-bg-surface\)\/95/);
  assert.match(source, /border-t border-\(--oboon-border-subtle\)/);
});
