import assert from "node:assert/strict";
import test from "node:test";

import {
  buildBriefingAuthorMetadata,
  buildBriefingCategoryMetadata,
  buildBriefingSearchMetadata,
} from "../shared/briefing-seo.ts";

test("briefing category metadata uses category-specific canonical and title", () => {
  const metadata = buildBriefingCategoryMetadata({
    categoryKey: "policy",
    categoryName: "정책 브리핑",
    description: "정책 변화를 해설하는 카테고리",
    coverImageUrl: "https://oboon.co.kr/sample.png",
  });

  assert.equal(metadata.title, "정책 브리핑");
  assert.equal(metadata.canonicalPath, "/briefing/oboon-original/policy");
  assert.equal(metadata.openGraphTitle, "정책 브리핑 | OBOON");
  assert.match(metadata.description, /정책/);
});

test("briefing search metadata is noindex regardless of query", () => {
  const metadata = buildBriefingSearchMetadata("청약");

  assert.equal(metadata.robots.index, false);
  assert.equal(metadata.robots.follow, false);
  assert.equal(metadata.canonicalPath, "/briefing/search");
  assert.match(metadata.title, /검색/);
});

test("briefing author metadata is noindex and uses author label", () => {
  const metadata = buildBriefingAuthorMetadata({
    authorId: "abc",
    authorName: "홍길동",
    roleLabel: "오분 에디터",
    bio: "분양 시장을 다루는 편집자",
  });

  assert.equal(metadata.robots.index, false);
  assert.equal(metadata.robots.follow, false);
  assert.equal(metadata.canonicalPath, "/briefing/author/abc");
  assert.match(metadata.title, /홍길동/);
});
