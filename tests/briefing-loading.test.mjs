import assert from "node:assert/strict";
import test from "node:test";

import {
  briefingGeneralArchiveLoadingConfig,
  briefingHomeLoadingConfig,
  briefingOriginalCategoryLoadingConfig,
  briefingOriginalLoadingConfig,
} from "../shared/briefing-loading.ts";

test("briefing home loading config mirrors the live section density", () => {
  assert.equal(briefingHomeLoadingConfig.topListCount, 5);
  assert.equal(briefingHomeLoadingConfig.editorPickCount, 3);
  assert.equal(briefingHomeLoadingConfig.originalSeriesCount, 4);
  assert.equal(briefingHomeLoadingConfig.latestCardCount, 8);
});

test("briefing original loading config keeps filter and series density responsive", () => {
  assert.equal(briefingOriginalLoadingConfig.filterPillCount, 6);
  assert.equal(briefingOriginalLoadingConfig.seriesCardCount, 8);
});

test("briefing general archive loading keeps archive card density", () => {
  assert.equal(briefingGeneralArchiveLoadingConfig.cardCount, 8);
});

test("briefing original category loading keeps category card density", () => {
  assert.equal(briefingOriginalCategoryLoadingConfig.cardCount, 8);
});
