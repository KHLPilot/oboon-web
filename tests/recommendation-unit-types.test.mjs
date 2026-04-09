import assert from "node:assert/strict";
import test from "node:test";

import {
  sortRecommendationUnitTypes,
  buildRecommendationUnitPreview,
} from "../features/recommendations/lib/recommendationUnitTypes.ts";

test("평형은 총점 내림차순, 부담률 오름차순, 분양가 오름차순으로 정렬한다", () => {
  const sorted = sortRecommendationUnitTypes([
    { unitTypeId: 2, title: "59B", totalScore: 88, monthlyBurdenPercent: 26, listPriceManwon: 65000 },
    { unitTypeId: 1, title: "84A", totalScore: 92, monthlyBurdenPercent: 30, listPriceManwon: 82000 },
    { unitTypeId: 3, title: "74A", totalScore: 88, monthlyBurdenPercent: 24, listPriceManwon: 72000 },
  ]);

  assert.deepEqual(
    sorted.map((item) => item.unitTypeId),
    [1, 3, 2],
  );
});

test("대표 평형 미리보기는 상위 2개와 나머지 개수를 축약한다", () => {
  const preview = buildRecommendationUnitPreview([
    { title: "84A" },
    { title: "59B" },
    { title: "74A" },
    { title: "49" },
  ]);

  assert.equal(preview, "추천 평형 84A, 59B 외 2개");
});

test("평형이 하나면 단일 문구를 만든다", () => {
  const preview = buildRecommendationUnitPreview([{ title: "59B" }]);
  assert.equal(preview, "추천 평형 59B 단일");
});
