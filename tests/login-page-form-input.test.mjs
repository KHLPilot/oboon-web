import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const filePath = path.join(
  process.cwd(),
  "features/auth/components/LoginPage.client.tsx",
);

test("LoginPage는 공유 FieldErrorBubble 대신 FormInput으로 바꾼다", async () => {
  const source = await readFile(filePath, "utf8");

  assert.match(source, /import FormInput from "@\/components\/ui\/FormInput";/);
  assert.doesNotMatch(source, /FieldErrorBubble/);
  assert.doesNotMatch(source, /FieldErrorState/);
  assert.doesNotMatch(source, /cardWrapRef/);
  assert.doesNotMatch(source, /fieldErrorTimerRef/);
  assert.doesNotMatch(source, /clearFieldError/);
  assert.doesNotMatch(source, /openFieldError/);
  assert.match(source, /const \[emailError, setEmailError\] = useState<string \| null>\(null\);/);
  assert.match(source, /const \[passwordError, setPasswordError\] = useState<string \| null>\(null\);/);
  assert.match(source, /const clearAllErrors = \(\) => {/);
  assert.match(source, /<FormInput[\s\S]*name="email"[\s\S]*label="이메일"[\s\S]*error=\{emailError \?\? undefined\}/);
  assert.match(source, /<FormInput[\s\S]*ref=\{passwordInputRef\}[\s\S]*name="password"[\s\S]*label="비밀번호"[\s\S]*error=\{passwordError \?\? undefined\}/);
  assert.match(source, /onFocus=\{\(\) => setEmailError\(null\)\}/);
  assert.match(source, /onFocus=\{\(\) => setPasswordError\(null\)\}/);
  assert.doesNotMatch(source, /FieldErrorBubble\s*\/>/);
});
