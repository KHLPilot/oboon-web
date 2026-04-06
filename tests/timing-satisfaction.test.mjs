import assert from "node:assert/strict";
import test from "node:test";

import {
  buildScheduleAwareTimingCategory,
} from "../features/condition-validation/lib/timing-satisfaction.ts";

test("즉시입주를 원하고 실제 입주가 3개월 이내면 높은 점수를 준다", () => {
  const result = buildScheduleAwareTimingCategory({
    purchaseTiming: "by_property",
    moveinTiming: "immediate",
    todayStamp: Date.UTC(2026, 0, 1),
    timeline: {
      announcementDate: "2026-01-15",
      applicationStart: "2026-01-20",
      applicationEnd: "2026-01-25",
      contractStart: "2026-02-01",
      contractEnd: "2026-02-05",
      moveInDate: "2026-03-15",
    },
  });

  assert.equal(result.score, 10);
  assert.equal(result.grade, "GREEN");
});

test("즉시입주를 원하지만 실제 입주가 1년 이내면 부분 점수를 준다", () => {
  const result = buildScheduleAwareTimingCategory({
    purchaseTiming: "by_property",
    moveinTiming: "immediate",
    todayStamp: Date.UTC(2026, 0, 1),
    timeline: {
      announcementDate: "2026-01-15",
      applicationStart: "2026-01-20",
      applicationEnd: "2026-01-25",
      contractStart: "2026-02-01",
      contractEnd: "2026-02-05",
      moveInDate: "2026-08-15",
    },
  });

  assert.equal(result.score, 8);
  assert.equal(result.grade, "GREEN");
});

test("1년 이내 입주를 원하면 더 빠른 즉시입주도 충족으로 본다", () => {
  const result = buildScheduleAwareTimingCategory({
    purchaseTiming: "by_property",
    moveinTiming: "within_1year",
    todayStamp: Date.UTC(2026, 0, 1),
    timeline: {
      announcementDate: "2026-01-15",
      applicationStart: "2026-01-20",
      applicationEnd: "2026-01-25",
      contractStart: "2026-02-01",
      contractEnd: "2026-02-05",
      moveInDate: "2026-02-15",
    },
  });

  assert.equal(result.score, 10);
  assert.equal(result.grade, "GREEN");
});
