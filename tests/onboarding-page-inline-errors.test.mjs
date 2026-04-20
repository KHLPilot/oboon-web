import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const filePath = path.join(
  process.cwd(),
  "features/auth/components/OnboardingPage.client.tsx",
);

test("OnboardingPage는 페이지 bubble 대신 FormInput과 인라인 에러를 쓴다", async () => {
  const source = await readFile(filePath, "utf8");

  assert.match(source, /import FormInput from "@\/components\/ui\/FormInput";/);
  assert.doesNotMatch(source, /FieldErrorBubble/);
  assert.doesNotMatch(source, /FieldErrorState/);
  assert.doesNotMatch(source, /openFieldError/);
  assert.doesNotMatch(source, /clearFieldError/);
  assert.doesNotMatch(source, /cardWrapRef/);
  assert.doesNotMatch(source, /nameRef/);
  assert.doesNotMatch(source, /nicknameRef/);
  assert.doesNotMatch(source, /phoneRef/);
  assert.match(source, /const clearAllErrors = \(\) => {\n    setErrors\(\{\}\);\n  };/);
  assert.match(
    source,
    /<FormInput[\s\S]*label="이메일 주소"[\s\S]*value=\{maskedEmail\}[\s\S]*disabled/,
  );
  assert.match(
    source,
    /<FormInput[\s\S]*label="이름 \(실명\) \*"[\s\S]*error=\{errors\.name\}/,
  );
  assert.match(
    source,
    /<FormInput[\s\S]*label="휴대폰 번호 \*"[\s\S]*error=\{errors\.phone\}/,
  );
  assert.match(
    source,
    /<label className="ob-typo-label text-\(--oboon-text-muted\) mb-1 block">\s*닉네임 \*\s*<\/label>/,
  );
  assert.match(
    source,
    /errors\.name && \(\s*<p className="mt-1 text-xs text-\(--oboon-danger\)">\s*\{errors\.name\}\s*<\/p>\s*\)/,
  );
  assert.match(
    source,
    /errors\.nickname && \(\s*<p className="mt-1 text-xs text-\(--oboon-danger\)">\s*\{errors\.nickname\}\s*<\/p>\s*\)/,
  );
  assert.match(
    source,
    /errors\.phone && \(\s*<p className="mt-1 text-xs text-\(--oboon-danger\)">\s*\{errors\.phone\}\s*<\/p>\s*\)/,
  );
});
