import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const layoutPath = path.join(process.cwd(), "app/layout.tsx");

test("app layout는 본문 시작점에 헤더 오프셋 패딩을 유지한다", async () => {
  const source = await readFile(layoutPath, "utf8");

  assert.match(source, /style=\{\s*\{\s*paddingTop: "var\(--oboon-header-offset\)"\s*\}\s*\}/);
});
