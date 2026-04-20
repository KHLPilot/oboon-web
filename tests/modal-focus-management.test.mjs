import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const modalPath = path.join(process.cwd(), "components/ui/Modal.tsx");

test("Modal는 panel ref와 focusable selector를 선언한다", async () => {
  const source = await readFile(modalPath, "utf8");

  assert.match(source, /React\.useRef<HTMLDivElement>\(null\)/);
  assert.match(
    source,
    /button:not\(\[disabled\]\), \[href\], input:not\(\[disabled\]\), select:not\(\[disabled\]\), textarea:not\(\[disabled\]\), \[tabindex\]:not\(\[tabindex="-1"\]\)/,
  );
});

test("Modal는 Tab 키를 모달 패널 안에서 순환시킨다", async () => {
  const source = await readFile(modalPath, "utf8");

  assert.match(source, /e\.key === "Tab"/);
  assert.match(source, /e\.preventDefault\(\);/);
  assert.match(source, /panelRef\.current\?\.querySelectorAll/);
  assert.match(source, /focusableElements\[0\]\?\.(focus|focus\(\))/);
  assert.match(source, /lastIndex = focusableElements\.length - 1;/);
  assert.match(source, /focusableElements\[lastIndex\]\?\.(focus|focus\(\))/);
});

test("Modal는 open 시 첫 focusable 요소에 focus하고 cleanup에서 복원한다", async () => {
  const source = await readFile(modalPath, "utf8");

  assert.match(source, /document\.activeElement/);
  assert.match(source, /previousActiveElementRef/);
  assert.match(source, /previousActiveElementRef\.current\?\.focus/);
});
