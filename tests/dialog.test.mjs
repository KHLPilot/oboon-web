import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const filePath = path.join(process.cwd(), "components/ui/Dialog.tsx");

test("Dialog는 client, portal, open 제거, escape, overlay 클릭을 포함한다", async () => {
  const source = await readFile(filePath, "utf8");

  assert.match(source, /"use client";/);
  assert.match(source, /createPortal/);
  assert.match(source, /if \(!open \|\| !portalEl\) return null;/);
  assert.match(source, /e\.key === "Escape"/);
  assert.match(source, /if \(e\.target === e\.currentTarget\) onCloseRef\.current\(\);/);
  assert.match(source, /role="dialog"/);
  assert.match(source, /aria-modal="true"/);
});

test("Dialog는 Alert와 Confirm compound export를 제공한다", async () => {
  const source = await readFile(filePath, "utf8");

  assert.match(source, /export type DialogBaseProps = {/);
  assert.match(source, /export type DialogAlertProps = DialogBaseProps & {/);
  assert.match(source, /export type DialogConfirmProps = DialogBaseProps & {/);
  assert.match(source, /const Dialog = {/);
  assert.match(source, /Alert: DialogAlert,/);
  assert.match(source, /Confirm: DialogConfirm,/);
  assert.match(source, /confirmLabel\?: string;/);
  assert.match(source, /cancelLabel\?: string;/);
  assert.match(source, /destructive\?: boolean;/);
});

test("Dialog는 Tab 포커스를 패널 내부에서 순환시킨다", async () => {
  const source = await readFile(filePath, "utf8");

  assert.match(source, /FOCUSABLE_SELECTOR/);
  assert.match(source, /e\.key === "Tab"/);
  assert.match(source, /focusableElements\[0\]\?\.focus\(\)/);
  assert.match(source, /focusableElements\[lastIndex\]\?\.focus\(\)/);
  assert.match(source, /previousActiveElementRef/);
});
