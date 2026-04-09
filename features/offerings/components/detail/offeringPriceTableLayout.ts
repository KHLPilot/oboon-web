// @ts-expect-error - Node's native ESM test runner needs the explicit .ts extension here.
import { grade5DetailLabel } from "../../../condition-validation/lib/grade5Labels.ts";
import type { UnitTypeResultItem } from "../../../condition-validation/domain/types.ts";

type UnitSpecInput = {
  exclusive_area: number | null;
  rooms: number | null;
  bathrooms: number | null;
  unit_count: number | null;
};

type ConditionValidationInput = Pick<
  UnitTypeResultItem,
  "final_grade" | "summary_message" | "grade_label" | "metrics"
> | null;

export type OfferingUnitConditionState =
  | {
      mode: "cta";
      label: "내 조건으로 확인";
    }
  | {
      mode: "result";
      badgeLabel: string;
      metricLine: string;
      helperText: string | null;
    };

function formatDecimal(value: number, digits: number) {
  return value.toFixed(digits).replace(/\.0+$/, "");
}

// These helpers stay local because the shared currency formatters emit broader labels
// than this compact summary needs (`1.4억`, `32.1%`, etc.).
function formatArea(value: number | null) {
  if (value == null || !Number.isFinite(value)) return "전용 확인중";
  return `전용 ${formatDecimal(Math.round(value * 10) / 10, 1)}㎡`;
}

function formatCount(value: number | null, suffix: string) {
  if (value == null || !Number.isFinite(value)) return null;
  return `${value}${suffix}`;
}

function formatManwonToEok(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value) || value <= 0) return "확인 필요";
  return `${formatDecimal(Math.round((value / 10000) * 10) / 10, 1)}억`;
}

function formatMonthlyBurdenPercent(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "계산 불가";
  return `${formatDecimal(Math.round(value * 10) / 10, 1)}%`;
}

function normalizeSummaryMessage(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export function buildOfferingUnitSpecSummary(input: UnitSpecInput) {
  const parts = [
    formatArea(input.exclusive_area),
    formatCount(input.rooms, "룸"),
    formatCount(input.bathrooms, "욕실"),
    formatCount(input.unit_count, "세대"),
  ].filter((part): part is string => Boolean(part));

  return parts.join(" · ");
}

export function buildOfferingUnitConditionState(
  validation: ConditionValidationInput,
): OfferingUnitConditionState {
  if (!validation) {
    return { mode: "cta", label: "내 조건으로 확인" };
  }

  const badgeLabel = validation.grade_label?.trim() || grade5DetailLabel(validation.final_grade);

  return {
    mode: "result",
    badgeLabel,
    metricLine: `초기 필요 자금 ${formatManwonToEok(validation.metrics?.min_cash)} · 월 부담률 ${formatMonthlyBurdenPercent(validation.metrics?.monthly_burden_percent)}`,
    helperText: normalizeSummaryMessage(validation.summary_message),
  };
}

export function validationMeta(grade: UnitTypeResultItem["final_grade"]) {
  switch (grade) {
    case "GREEN":
      return { color: "var(--oboon-grade-green)", bgColor: "var(--oboon-grade-green-bg)" };
    case "LIME":
      return { color: "var(--oboon-grade-lime)", bgColor: "var(--oboon-grade-lime-bg)" };
    case "YELLOW":
      return { color: "var(--oboon-grade-yellow)", bgColor: "var(--oboon-grade-yellow-bg)" };
    case "ORANGE":
      return { color: "var(--oboon-grade-orange)", bgColor: "var(--oboon-grade-orange-bg)" };
    case "RED":
      return { color: "var(--oboon-grade-red)", bgColor: "var(--oboon-grade-red-bg)" };
  }
}
