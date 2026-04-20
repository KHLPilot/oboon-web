import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const filePath = path.join(
  process.cwd(),
  "features/auth/components/SignupPage.client.tsx",
);

test("SignupPage는 공유 FieldErrorBubble 대신 FormInput과 인라인 에러를 쓴다", async () => {
  const source = await readFile(filePath, "utf8");

  assert.match(source, /import FormInput from "@\/components\/ui\/FormInput";/);
  assert.doesNotMatch(source, /FieldErrorBubble/);
  assert.doesNotMatch(source, /FieldErrorState/);
  assert.match(source, /const \[emailError, setEmailError\] = useState<string \| null>\(null\);/);
  assert.match(source, /const \[pwError, setPwError\] = useState<string \| null>\(null\);/);
  assert.match(source, /const \[pwConfirmError, setPwConfirmError\] = useState<string \| null>\(null\);/);
  assert.match(source, /const clearAllErrors = \(\) => {/);
  assert.match(source, /<FormInput[\s\S]*label="이메일 주소"[\s\S]*error=\{emailError \?\? undefined\}/);
  assert.match(source, /<label className="ob-typo-label text-\(--oboon-text-muted\) mb-1 block">/);
  assert.match(
    source,
    /pwError[\s\S]*?className="mt-1 text-xs text-\(--oboon-danger\)"[\s\S]*?\{pwError\}/,
  );
  assert.match(
    source,
    /pwConfirmError[\s\S]*?className="mt-1 text-xs text-\(--oboon-danger\)"[\s\S]*?\{pwConfirmError\}/,
  );
  assert.doesNotMatch(source, /cardWrapRef/);
});
