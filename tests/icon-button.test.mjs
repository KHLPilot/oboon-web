import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const filePath = path.join(process.cwd(), "components/ui/IconButton.tsx");

test("IconButton는 요구된 props와 forwardRef 구조를 갖는다", async () => {
  const source = await readFile(filePath, "utf8");

  assert.match(source, /"use client";/);
  assert.match(source, /export type IconButtonProps = {/);
  assert.match(source, /icon: React\.ReactNode;/);
  assert.match(source, /aria-label: string;/);
  assert.match(source, /variant\?: "fill" \| "clear" \| "border";/);
  assert.match(source, /size\?: "sm" \| "md" \| "lg";/);
  assert.match(source, /shape\?: "default" \| "circle";/);
  assert.match(source, /React\.forwardRef/);
});

test("IconButton는 variant와 size, shape 스타일을 switch로 정의한다", async () => {
  const source = await readFile(filePath, "utf8");

  assert.match(source, /switch \(variant\)/);
  assert.match(source, /case "clear"/);
  assert.match(source, /case "fill"/);
  assert.match(source, /case "border"/);
  assert.match(source, /switch \(size\)/);
  assert.match(source, /w-7 h-7/);
  assert.match(source, /w-9 h-9/);
  assert.match(source, /w-11 h-11/);
  assert.match(source, /text-\[16px\]/);
  assert.match(source, /text-\[20px\]/);
  assert.match(source, /text-\[24px\]/);
  assert.match(source, /switch \(shape\)/);
  assert.match(source, /rounded-full/);
  assert.match(source, /rounded-xl/);
});

test("IconButton는 disabled, focus, cursor, aria-label을 포함한다", async () => {
  const source = await readFile(filePath, "utf8");

  assert.match(source, /focus-visible:ring-\(--oboon-accent\)\/30/);
  assert.match(source, /opacity-40/);
  assert.match(source, /pointer-events-none/);
  assert.match(source, /cursor-not-allowed/);
  assert.match(source, /cursor-pointer/);
  assert.match(source, /aria-label/);
});
