import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const filePath = path.join(process.cwd(), "components/ui/ProgressStepper.tsx");

test("ProgressStepper는 요구된 props와 compound Step을 제공한다", async () => {
  const source = await readFile(filePath, "utf8");

  assert.match(source, /export type ProgressStepperProps = {/);
  assert.match(source, /variant: "compact" \| "icon";/);
  assert.match(source, /steps: Array<\{ title\?: string; icon\?: React\.ReactNode \}>;/);
  assert.match(source, /activeStepIndex\?: number;/);
  assert.match(source, /checkForFinish\?: boolean;/);
  assert.match(source, /paddingTop\?: "default" \| "wide";/);
  assert.match(source, /export type ProgressStepperStepProps = {/);
  assert.match(source, /const ProgressStepper = ProgressStepperRoot as ProgressStepperCompound;/);
  assert.match(source, /ProgressStepper\.Step = ProgressStepperStep;/);
});

test("ProgressStepper는 compact와 icon 스타일, 완료 체크, padding을 포함한다", async () => {
  const source = await readFile(filePath, "utf8");

  assert.match(source, /flex-1 h-0\.5/);
  assert.match(source, /w-2 h-2 rounded-full/);
  assert.match(source, /ring-2 ring-\(--oboon-primary\) bg-\(--oboon-bg-surface\)/);
  assert.match(source, /w-8 h-8 rounded-full flex items-center justify-center/);
  assert.match(source, /Check/);
  assert.match(source, /bg-\(--oboon-primary\)/);
  assert.match(source, /bg-\(--oboon-bg-subtle\)/);
  assert.match(source, /pt-4/);
  assert.match(source, /pt-6/);
});

test("ProgressStepper는 단일 스텝에서 연결선을 렌더링하지 않는다", async () => {
  const source = await readFile(filePath, "utf8");

  assert.match(source, /resolvedSteps\.length === 1/);
  assert.match(source, /return null;/);
});
