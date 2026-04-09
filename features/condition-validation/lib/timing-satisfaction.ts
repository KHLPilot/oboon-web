import type {
  FullEvaluationCategoryResult,
  MoveinTiming,
  PurchaseTiming,
  FinalGrade5,
} from "../domain/types";

export type TimingSatisfactionTimeline = {
  announcementDate?: string | null;
  applicationStart?: string | null;
  applicationEnd?: string | null;
  contractStart?: string | null;
  contractEnd?: string | null;
  moveInDate?: string | null;
};

const KST_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const PURCHASE_LABELS: Record<PurchaseTiming, string> = {
  by_property: "현장 일정 따름",
  over_1year: "1년 이후",
  within_1year: "1년 이내",
  within_6months: "6개월 이내",
  within_3months: "3개월 이내",
};

const MOVEIN_LABELS: Record<MoveinTiming, string> = {
  anytime: "언제든 가능",
  within_3years: "3년 이내",
  within_2years: "2년 이내",
  within_1year: "1년 이내",
  immediate: "즉시입주",
};

function categoryGrade5(score: number, maxScore: number): FinalGrade5 {
  const pct = score / maxScore;
  if (pct >= 0.8) return "GREEN";
  if (pct >= 0.6) return "LIME";
  if (pct >= 0.4) return "YELLOW";
  if (pct >= 0.2) return "ORANGE";
  return "RED";
}

function parseIsoDateStamp(value: string | null | undefined): number | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  const parts = KST_DATE_FORMATTER.formatToParts(parsed);
  const year = Number(parts.find((part) => part.type === "year")?.value ?? "");
  const month = Number(parts.find((part) => part.type === "month")?.value ?? "");
  const day = Number(parts.find((part) => part.type === "day")?.value ?? "");
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  return Date.UTC(year, month - 1, day);
}

function getCurrentKstDateStamp(): number {
  const now = new Date();
  const parts = KST_DATE_FORMATTER.formatToParts(now);
  const year = Number(parts.find((part) => part.type === "year")?.value ?? "");
  const month = Number(parts.find((part) => part.type === "month")?.value ?? "");
  const day = Number(parts.find((part) => part.type === "day")?.value ?? "");
  return Date.UTC(year, month - 1, day);
}

function addMonthsStamp(baseStamp: number, months: number): number {
  const date = new Date(baseStamp);
  date.setUTCMonth(date.getUTCMonth() + months);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function addYearsStamp(baseStamp: number, years: number): number {
  const date = new Date(baseStamp);
  date.setUTCFullYear(date.getUTCFullYear() + years);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function diffMonthsBetween(startStamp: number, endStamp: number): number {
  const start = new Date(startStamp);
  const end = new Date(endStamp);
  const rawMonths =
    (end.getUTCFullYear() - start.getUTCFullYear()) * 12 +
    (end.getUTCMonth() - start.getUTCMonth());
  const adjusted =
    end.getUTCDate() < start.getUTCDate() ? rawMonths - 1 : rawMonths;
  return Math.max(0, adjusted);
}

function isOngoingWindow(
  startStamp: number | null,
  endStamp: number | null,
  todayStamp: number,
): boolean {
  if (startStamp === null) return false;
  if (endStamp === null) return startStamp <= todayStamp;
  return startStamp <= todayStamp && todayStamp <= endStamp;
}

function resolvePurchaseAvailabilityStamp(
  timeline: TimingSatisfactionTimeline | null | undefined,
  todayStamp: number,
): number | null {
  if (!timeline) return null;

  const applicationStart = parseIsoDateStamp(timeline.applicationStart);
  const applicationEnd = parseIsoDateStamp(timeline.applicationEnd);
  const contractStart = parseIsoDateStamp(timeline.contractStart);
  const contractEnd = parseIsoDateStamp(timeline.contractEnd);
  const announcementDate = parseIsoDateStamp(timeline.announcementDate);

  if (
    isOngoingWindow(applicationStart, applicationEnd, todayStamp) ||
    isOngoingWindow(contractStart, contractEnd, todayStamp)
  ) {
    return todayStamp;
  }

  const nextCandidates = [applicationStart, contractStart, announcementDate]
    .filter((value): value is number => value !== null && value >= todayStamp);

  if (nextCandidates.length === 0) return null;
  return Math.min(...nextCandidates);
}

function resolvePurchaseLevel(
  purchaseTiming: PurchaseTiming,
  timeline: TimingSatisfactionTimeline | null | undefined,
  todayStamp: number,
): { score: number; label: string } {
  if (purchaseTiming === "by_property") {
    return { score: 5, label: "현장 일정 기준" };
  }

  const availabilityStamp = resolvePurchaseAvailabilityStamp(timeline, todayStamp);
  if (availabilityStamp === null) {
    return { score: 2, label: "분양 일정 확인 중" };
  }

  const actualLevel =
    availabilityStamp <= addMonthsStamp(todayStamp, 3)
      ? 0
      : availabilityStamp <= addMonthsStamp(todayStamp, 6)
        ? 1
        : availabilityStamp <= addYearsStamp(todayStamp, 1)
          ? 2
          : 3;

  const actualLabel =
    actualLevel === 0
      ? "3개월 이내"
      : actualLevel === 1
        ? "6개월 이내"
        : actualLevel === 2
          ? "1년 이내"
          : "1년 이후";

  if (purchaseTiming === "over_1year") {
    if (actualLevel === 3) {
      return { score: 5, label: `희망 ${PURCHASE_LABELS[purchaseTiming]} · 실제 ${actualLabel}` };
    }
    if (actualLevel === 2) {
      return { score: 3, label: `희망 ${PURCHASE_LABELS[purchaseTiming]} · 실제 ${actualLabel}` };
    }
    return { score: 1, label: `희망 ${PURCHASE_LABELS[purchaseTiming]} · 실제 ${actualLabel}` };
  }

  const requestedLevel =
    purchaseTiming === "within_3months"
      ? 0
      : purchaseTiming === "within_6months"
        ? 1
        : 2;

  if (actualLevel <= requestedLevel) {
    return { score: 5, label: `희망 ${PURCHASE_LABELS[purchaseTiming]} · 실제 ${actualLabel}` };
  }

  const gap = actualLevel - requestedLevel;
  if (gap === 1) {
    return { score: 3, label: `희망 ${PURCHASE_LABELS[purchaseTiming]} · 실제 ${actualLabel}` };
  }
  if (gap === 2) {
    return { score: 2, label: `희망 ${PURCHASE_LABELS[purchaseTiming]} · 실제 ${actualLabel}` };
  }
  return { score: 1, label: `희망 ${PURCHASE_LABELS[purchaseTiming]} · 실제 ${actualLabel}` };
}

function resolveMoveinLevel(
  moveinTiming: MoveinTiming,
  timeline: TimingSatisfactionTimeline | null | undefined,
  todayStamp: number,
): { score: number; label: string } {
  if (moveinTiming === "anytime") {
    return { score: 5, label: "입주 시점 무관" };
  }

  const moveInStamp = parseIsoDateStamp(timeline?.moveInDate);
  if (moveInStamp === null) {
    return { score: 2, label: "입주 일정 확인 중" };
  }

  const actualLevel =
    moveInStamp <= addMonthsStamp(todayStamp, 3)
      ? 0
      : moveInStamp <= addYearsStamp(todayStamp, 1)
        ? 1
        : moveInStamp <= addYearsStamp(todayStamp, 2)
          ? 2
          : moveInStamp <= addYearsStamp(todayStamp, 3)
            ? 3
            : 4;

  const actualLabel =
    actualLevel === 0
      ? "즉시입주"
      : actualLevel === 1
        ? "1년 이내"
        : actualLevel === 2
          ? "2년 이내"
          : actualLevel === 3
            ? "3년 이내"
            : "3년 이후";

  const requestedLevel =
    moveinTiming === "immediate"
      ? 0
      : moveinTiming === "within_1year"
        ? 1
        : moveinTiming === "within_2years"
          ? 2
          : 3;

  if (actualLevel <= requestedLevel) {
    return { score: 5, label: `희망 ${MOVEIN_LABELS[moveinTiming]} · 실제 ${actualLabel}` };
  }

  const gap = actualLevel - requestedLevel;
  if (gap === 1) {
    return { score: 3, label: `희망 ${MOVEIN_LABELS[moveinTiming]} · 실제 ${actualLabel}` };
  }
  if (gap === 2) {
    return { score: 2, label: `희망 ${MOVEIN_LABELS[moveinTiming]} · 실제 ${actualLabel}` };
  }
  return { score: 1, label: `희망 ${MOVEIN_LABELS[moveinTiming]} · 실제 ${actualLabel}` };
}

export function buildScheduleAwareTimingCategory(params: {
  purchaseTiming: PurchaseTiming;
  moveinTiming: MoveinTiming;
  timeline: TimingSatisfactionTimeline | null | undefined;
  todayStamp?: number;
}): FullEvaluationCategoryResult {
  const todayStamp = params.todayStamp ?? getCurrentKstDateStamp();

  const purchase = resolvePurchaseLevel(params.purchaseTiming, params.timeline, todayStamp);
  const movein = resolveMoveinLevel(params.moveinTiming, params.timeline, todayStamp);
  const score = purchase.score + movein.score;

  return {
    grade: categoryGrade5(score, 10),
    score,
    maxScore: 10,
    reasonMessage: `분양시점 ${purchase.score}/5 · ${purchase.label} · 입주시점 ${movein.score}/5 · ${movein.label}`,
  };
}

export function deriveScheduleAwareTimingMonthsDiff(params: {
  purchaseTiming: PurchaseTiming;
  moveinTiming: MoveinTiming;
  timeline: TimingSatisfactionTimeline | null | undefined;
  todayStamp?: number;
}): number | null {
  const todayStamp = params.todayStamp ?? getCurrentKstDateStamp();

  const purchaseGapMonths = (() => {
    if (params.purchaseTiming === "by_property") return null;
    const availabilityStamp = resolvePurchaseAvailabilityStamp(
      params.timeline,
      todayStamp,
    );
    if (availabilityStamp === null) return null;

    const requestedStamp =
      params.purchaseTiming === "within_3months"
        ? addMonthsStamp(todayStamp, 3)
        : params.purchaseTiming === "within_6months"
          ? addMonthsStamp(todayStamp, 6)
          : params.purchaseTiming === "within_1year"
            ? addYearsStamp(todayStamp, 1)
            : addYearsStamp(todayStamp, 1);

    if (params.purchaseTiming === "over_1year") {
      if (availabilityStamp > requestedStamp) return 0;
      return Math.max(1, diffMonthsBetween(availabilityStamp, requestedStamp));
    }

    if (availabilityStamp <= requestedStamp) return 0;
    return diffMonthsBetween(requestedStamp, availabilityStamp);
  })();

  const moveinGapMonths = (() => {
    if (params.moveinTiming === "anytime") return null;
    const moveInStamp = parseIsoDateStamp(params.timeline?.moveInDate);
    if (moveInStamp === null) return null;

    const requestedStamp =
      params.moveinTiming === "immediate"
        ? todayStamp
        : params.moveinTiming === "within_1year"
          ? addYearsStamp(todayStamp, 1)
          : params.moveinTiming === "within_2years"
            ? addYearsStamp(todayStamp, 2)
            : addYearsStamp(todayStamp, 3);

    if (moveInStamp <= requestedStamp) return 0;
    return diffMonthsBetween(requestedStamp, moveInStamp);
  })();

  if (purchaseGapMonths === null && moveinGapMonths === null) {
    return null;
  }

  return Math.max(purchaseGapMonths ?? 0, moveinGapMonths ?? 0);
}
