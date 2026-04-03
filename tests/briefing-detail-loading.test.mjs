import assert from "node:assert/strict";
import test from "node:test";

import {
  briefingGeneralDetailLoadingConfig,
  briefingOriginalDetailLoadingConfig,
} from "../shared/briefing-detail-loading.ts";

test("general briefing detail loading keeps related panel density compact", () => {
  assert.equal(briefingGeneralDetailLoadingConfig.relatedPostCount, 3);
  assert.equal(briefingGeneralDetailLoadingConfig.commentPreviewCount, 2);
});

test("original briefing detail loading includes recommendation row", () => {
  assert.equal(briefingOriginalDetailLoadingConfig.relatedPostCount, 3);
  assert.equal(briefingOriginalDetailLoadingConfig.recommendedSeriesCount, 3);
  assert.equal(briefingOriginalDetailLoadingConfig.commentPreviewCount, 2);
});
