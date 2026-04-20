import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const filePath = path.join(process.cwd(), "components/ui/Result.tsx");

test("Result는 요구된 props와 compound Button을 제공한다", async () => {
  const source = await readFile(filePath, "utf8");

  assert.match(source, /export type ResultProps = {/);
  assert.match(source, /figure\?: React\.ReactNode;/);
  assert.match(source, /title: React\.ReactNode;/);
  assert.match(source, /description\?: React\.ReactNode;/);
  assert.match(source, /button\?: React\.ReactNode;/);
  assert.match(source, /export type ResultButtonProps = {/);
  assert.match(source, /Result\.Button/);
});

test("Result는 h5 title과 figure, description, actions 레이아웃을 갖는다", async () => {
  const source = await readFile(filePath, "utf8");

  assert.match(source, /<h5/);
  assert.match(source, /ob-typo-title2 text-\(--oboon-text-default\)/);
  assert.match(source, /mb-6/);
  assert.match(source, /mt-3 ob-typo-body2 text-\(--oboon-text-muted\) max-w-xs/);
  assert.match(source, /mt-8 w-full flex flex-col gap-3/);
});

test("Result.Button는 Button 래퍼로 size lg와 variant 전달을 지원한다", async () => {
  const source = await readFile(filePath, "utf8");

  assert.match(source, /size="lg"/);
  assert.match(source, /variant=\{variant\}/);
  assert.match(source, /Button/);
});
