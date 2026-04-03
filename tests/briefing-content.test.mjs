import assert from "node:assert/strict";
import test from "node:test";

import {
  briefingAboutMetadata,
  briefingAboutSections,
  briefingGeneralMetadata,
  buildLlmsTxt,
} from "../shared/briefing-content.ts";

test("briefing general metadata is scoped to the archive route", () => {
  assert.equal(briefingGeneralMetadata.title, "일반 브리핑");
  assert.equal(briefingGeneralMetadata.canonicalPath, "/briefing/general");
  assert.match(briefingGeneralMetadata.description, /아카이브|브리핑/);
  assert.equal(briefingGeneralMetadata.openGraphTitle, "일반 브리핑 | OBOON");
});

test("llms.txt advertises primary discovery and editorial URLs", () => {
  const content = buildLlmsTxt("https://oboon.co.kr");

  assert.match(content, /^# OBOON/m);
  assert.match(content, /https:\/\/oboon\.co\.kr\/briefing\/about/);
  assert.match(content, /https:\/\/oboon\.co\.kr\/briefing\/general/);
  assert.match(content, /https:\/\/oboon\.co\.kr\/offerings/);
});

test("briefing about page content covers editorial trust signals", () => {
  assert.equal(briefingAboutMetadata.canonicalPath, "/briefing/about");
  assert.equal(briefingAboutMetadata.openGraphTitle, "브리핑 소개 | OBOON");
  assert.ok(briefingAboutSections.length >= 3);
  assert.ok(
    briefingAboutSections.some((section) => section.title === "편집 원칙"),
  );
  assert.ok(
    briefingAboutSections.some((section) => section.title === "콘텐츠 출처"),
  );
  assert.ok(
    briefingAboutSections.some((section) => section.title === "저자와 검수"),
  );
});
