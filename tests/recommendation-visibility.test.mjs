import assert from "node:assert/strict";
import test from "node:test";

import {
  shouldShowRecommendationForCategoryGrades,
  classifyRecommendation,
} from "../features/recommendations/lib/recommendation-visibility.mjs";

test("모든 카테고리가 GREEN 또는 LIME이면 추천 현장을 노출한다", () => {
  const visible = shouldShowRecommendationForCategoryGrades([
    "GREEN",
    "LIME",
    "GREEN",
    "LIME",
  ]);

  assert.equal(visible, true);
});

test("카테고리 중 하나라도 YELLOW 이하면 추천 현장을 숨긴다", () => {
  const visible = shouldShowRecommendationForCategoryGrades([
    "GREEN",
    "LIME",
    "YELLOW",
  ]);

  assert.equal(visible, false);
});

// classifyRecommendation

test("classifyRecommendation: 모두 GREEN/LIME → primary", () => {
  assert.equal(
    classifyRecommendation(["GREEN", "LIME", "GREEN", "GREEN", "LIME", "GREEN"]),
    "primary",
  );
});

test("classifyRecommendation: YELLOW 1개, ORANGE/RED 없음 → alternative", () => {
  assert.equal(
    classifyRecommendation(["GREEN", "LIME", "YELLOW", "GREEN", "LIME", "GREEN"]),
    "alternative",
  );
});

test("classifyRecommendation: YELLOW 2개 → excluded", () => {
  assert.equal(
    classifyRecommendation(["GREEN", "YELLOW", "YELLOW", "GREEN", "LIME", "GREEN"]),
    "excluded",
  );
});

test("classifyRecommendation: ORANGE 있음 → excluded", () => {
  assert.equal(
    classifyRecommendation(["GREEN", "LIME", "ORANGE", "GREEN", "LIME", "GREEN"]),
    "excluded",
  );
});

test("classifyRecommendation: RED 있음 → excluded", () => {
  assert.equal(
    classifyRecommendation(["GREEN", "LIME", "RED", "GREEN", "LIME", "GREEN"]),
    "excluded",
  );
});

test("classifyRecommendation: ORANGE + YELLOW → excluded", () => {
  assert.equal(
    classifyRecommendation(["GREEN", "YELLOW", "ORANGE", "GREEN", "LIME", "GREEN"]),
    "excluded",
  );
});
