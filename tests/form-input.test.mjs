import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const filePath = path.join(process.cwd(), "components/ui/FormInput.tsx");

test("FormInput는 라벨/힌트/에러와 forwardRef를 지원한다", async () => {
  const source = await readFile(filePath, "utf8");

  assert.match(source, /forwardRef/);
  assert.match(source, /label\?: string;/);
  assert.match(source, /error\?: string;/);
  assert.match(source, /hint\?: string;/);
  assert.match(source, /required\?: boolean;/);
  assert.match(source, /useId/);
  assert.match(source, /Label/);
  assert.match(source, /Input/);
  assert.match(source, /FieldErrorBubble/);
});

test("FormInput는 기존 Input props를 그대로 받는다", async () => {
  const source = await readFile(filePath, "utf8");

  assert.match(source, /React\.ComponentPropsWithoutRef<typeof Input>/);
  assert.match(source, /aria-describedby/);
  assert.match(source, /aria-invalid/);
  assert.match(source, /flex flex-col gap-1\.5/);
});
