import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const onboardingPath = path.join(
  process.cwd(),
  "features/auth/components/OnboardingPage.client.tsx",
);

const termsPath = path.join(
  process.cwd(),
  "features/auth/components/TermsConsentModal.tsx",
);

test("OnboardingPage 약관 동의는 Checkbox로 렌더된다", async () => {
  const source = await readFile(onboardingPath, "utf8");

  assert.match(source, /import Checkbox from "@\/components\/ui\/Checkbox";/);
  assert.match(source, /<Checkbox[\s\S]*label="전체 동의"/);
  assert.match(source, /<Checkbox[\s\S]*label="\[필수\] 만 14세 이상입니다"/);
  assert.match(source, /<Checkbox[\s\S]*label="\[필수\] 서비스 이용약관 동의"/);
  assert.match(source, /<Checkbox[\s\S]*label="\[필수\] 개인정보 수집·이용 동의"/);
  assert.match(source, /<Checkbox[\s\S]*label="\[선택\] 마케팅 정보 수신 동의"/);
});

test("TermsConsentModal 약관 동의는 Checkbox로 렌더된다", async () => {
  const source = await readFile(termsPath, "utf8");

  assert.match(source, /import Checkbox from "@\/components\/ui\/Checkbox";/);
  assert.match(source, /<Checkbox[\s\S]*label="전체 동의"/);
  assert.match(source, /<Checkbox[\s\S]*label=\{`/);
  assert.doesNotMatch(source, /<input\s+type="checkbox"/);
});
