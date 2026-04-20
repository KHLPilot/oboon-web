import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const sheetPath = path.join(process.cwd(), "components/ui/BottomSheet.tsx");

test("BottomSheet는 portal과 기본 props를 갖는다", async () => {
  const source = await readFile(sheetPath, "utf8");

  assert.match(source, /createPortal/);
  assert.match(source, /type BottomSheetProps = {/);
  assert.match(source, /isOpen: boolean;/);
  assert.match(source, /onClose: \(\) => void;/);
  assert.match(source, /children: React\.ReactNode;/);
  assert.match(source, /title\?: string;/);
});

test("BottomSheet는 모바일 슬라이드업과 데스크톱 fallback 클래스를 갖는다", async () => {
  const source = await readFile(sheetPath, "utf8");

  assert.match(source, /translate-y-full/);
  assert.match(source, /translate-y-0/);
  assert.match(source, /max-h-\[90vh\]/);
  assert.match(source, /overflow-y-auto/);
  assert.match(source, /sm:items-center/);
  assert.match(source, /sm:justify-center/);
  assert.match(source, /sm:rounded-2xl/);
});

test("BottomSheet는 backdrop 클릭과 ESC 닫기를 처리한다", async () => {
  const source = await readFile(sheetPath, "utf8");

  assert.match(source, /e\.key === "Escape"/);
  assert.match(source, /document\.body\.appendChild\(portalEl\)/);
  assert.match(source, /onMouseDown=\{/);
  assert.match(source, /onCloseRef\.current\(\)/);
});
