import type {
  FinalGrade5,
  FullPurchasePurpose,
} from "../../condition-validation/domain/types";
// @ts-expect-error - Node's native ESM test runner needs the explicit .ts extension here.
import { buildRecommendationCategoryReason } from "./recommendationCategoryReason.ts";
// @ts-expect-error - Node's native ESM test runner needs the explicit .ts extension here.
import { UXCopy } from "../../../shared/uxCopy.ts";

type NullableNumber = number | null;

export type RecommendationUnitTypeCategoryKey =
  | "cash"
  | "income"
  | "ltvDsr"
  | "credit"
  | "ownership"
  | "purpose"
  | "timing";

export type RecommendationUnitTypeCategory = {
  key: RecommendationUnitTypeCategoryKey;
  label: string;
  grade: FinalGrade5;
  score: number | null;
  maxScore: number | null;
  rawReason: string | null;
  reason: string | null;
};

export type RecommendationUnitType = {
  unitTypeId: number;
  title: string;
  exclusiveArea: number | null;
  exclusiveAreaLabel: string | null;
  listPriceManwon: number | null;
  isPricePublic: boolean;
  finalGrade: FinalGrade5;
  totalScore: number | null;
  gradeLabel: string | null;
  summaryMessage: string | null;
  monthlyBurdenPercent: number | null;
  priceLabel: string;
  categories: RecommendationUnitTypeCategory[];
};

export type RawRecommendationUnitTypeCategory = {
  grade?: FinalGrade5;
  score?: number | null;
  max_score?: number | null;
  reason?: string | null;
} | null;

export type RawRecommendationUnitTypeResult = {
  unit_type_id?: number | string;
  unit_type_name?: string | null;
  exclusive_area?: number | string | null;
  list_price_manwon?: number | string | null;
  is_price_public?: boolean | null;
  final_grade?: FinalGrade5;
  total_score?: number | null;
  summary_message?: string | null;
  grade_label?: string | null;
  metrics?: {
    contract_amount?: number | null;
    loan_amount?: number | null;
    monthly_payment_est?: number | null;
    monthly_burden_percent?: number | null;
    min_cash?: number | string | null;
    recommended_cash?: number | string | null;
    timing_months_diff?: number | string | null;
  } | null;
  categories?: {
    cash?: RawRecommendationUnitTypeCategory;
    income?: RawRecommendationUnitTypeCategory;
    ltv_dsr?: RawRecommendationUnitTypeCategory;
    credit?: RawRecommendationUnitTypeCategory;
    ownership?: RawRecommendationUnitTypeCategory;
    purpose?: RawRecommendationUnitTypeCategory;
    timing?: RawRecommendationUnitTypeCategory;
  } | null;
  recommendation_context?: {
    available_cash_manwon?: number | null;
    monthly_income_manwon?: number | null;
    house_ownership?: "none" | "one" | "two_or_more" | null;
    purchase_purpose?: FullPurchasePurpose | null;
  } | null;
};

type RawRecommendationUnitTypeCollection = {
  unit_type_results?: RawRecommendationUnitTypeResult[] | null;
};

function compareNullableNumber(
  a: NullableNumber,
  b: NullableNumber,
  direction: "asc" | "desc" = "asc",
) {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return direction === "asc" ? a - b : b - a;
}

export function sortRecommendationUnitTypes<
  T extends {
    totalScore: NullableNumber;
    monthlyBurdenPercent: NullableNumber;
    listPriceManwon: NullableNumber;
  },
>(units: T[]): T[] {
  return [...units].sort(
    (a, b) =>
      compareNullableNumber(a.totalScore, b.totalScore, "desc") ||
      compareNullableNumber(
        a.monthlyBurdenPercent,
        b.monthlyBurdenPercent,
        "asc",
      ) ||
      compareNullableNumber(a.listPriceManwon, b.listPriceManwon, "asc"),
  );
}

export function buildRecommendationUnitPreview<T extends { title: string }>(
  units: T[],
) {
  if (units.length === 0) return null;
  if (units.length === 1) return `추천 평형 ${units[0].title} 단일`;

  const titles = units
    .slice(0, 2)
    .map((unit) => unit.title)
    .join(", ");
  const remaining = units.length - 2;

  return remaining > 0
    ? `추천 평형 ${titles} 외 ${remaining}개`
    : `추천 평형 ${titles}`;
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toPositiveInt(value: unknown): number | null {
  const num = typeof value === "string" ? Number(value) : value;
  if (typeof num !== "number" || !Number.isInteger(num) || num <= 0) {
    return null;
  }
  return num;
}

function formatRecommendationAreaLabel(value: unknown): string | null {
  const area = toFiniteNumber(value);
  if (area === null) return null;
  return `${area.toLocaleString("ko-KR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}㎡`;
}

function formatRecommendationUnitTypeTitle(
  unit: RawRecommendationUnitTypeResult,
): string {
  const rawName = unit.unit_type_name?.trim();
  if (rawName) {
    if (
      rawName.includes("타입") ||
      rawName.includes("㎡") ||
      /[A-Za-z]$/.test(rawName)
    ) {
      return rawName;
    }
    return `${rawName}타입`;
  }

  const areaLabel = formatRecommendationAreaLabel(unit.exclusive_area);
  if (areaLabel) return `전용 ${areaLabel}`;

  const unitTypeId = toPositiveInt(unit.unit_type_id);
  return unitTypeId ? `타입 ${unitTypeId}` : "타입 정보";
}

function buildRecommendationUnitPriceLabel(
  listPriceManwon: number | null,
  isPricePublic: boolean,
) {
  if (!isPricePublic) return "비공개";
  if (listPriceManwon === null) return UXCopy.priceRangeShort;

  const singlePriceEok = Math.round((listPriceManwon / 10_000) * 10) / 10;
  return `${singlePriceEok.toLocaleString("ko-KR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  })}억`;
}

function mapRecommendationUnitCategory(
  key: RecommendationUnitTypeCategoryKey,
  label: string,
  raw: RawRecommendationUnitTypeCategory,
  unit: RawRecommendationUnitTypeResult,
): RecommendationUnitTypeCategory | null {
  if (!raw?.grade) return null;
  const rawReason = raw.reason?.trim() || null;

  return {
    key,
    label,
    grade: raw.grade,
    score: toFiniteNumber(raw.score),
    maxScore: toFiniteNumber(raw.max_score),
    rawReason,
    reason: buildRecommendationCategoryReason({
      key,
      grade: raw.grade,
      isPricePublic: unit.is_price_public !== false,
      rawReason,
      metrics: {
        availableCash: toFiniteNumber(
          unit.recommendation_context?.available_cash_manwon,
        ),
        contractAmount: toFiniteNumber(unit.metrics?.contract_amount),
        minCash: toFiniteNumber(unit.metrics?.min_cash),
        recommendedCash: toFiniteNumber(unit.metrics?.recommended_cash),
        monthlyPaymentEst: toFiniteNumber(unit.metrics?.monthly_payment_est),
        monthlyBurdenPercent: toFiniteNumber(unit.metrics?.monthly_burden_percent),
        timingMonthsDiff: toFiniteNumber(unit.metrics?.timing_months_diff),
      },
      inputs: {
        houseOwnership: unit.recommendation_context?.house_ownership ?? null,
        purchasePurpose: unit.recommendation_context?.purchase_purpose ?? null,
      },
    }),
  };
}

export function normalizeRecommendationUnitTypes(
  item: RawRecommendationUnitTypeCollection,
): RecommendationUnitType[] {
  const normalized = (item.unit_type_results ?? [])
    .map((unit) => {
      const unitTypeId = toPositiveInt(unit.unit_type_id);
      const finalGrade = unit.final_grade;
      if (!unitTypeId || !finalGrade) return null;

      const listPriceManwon = toFiniteNumber(unit.list_price_manwon);
      const isPricePublic = unit.is_price_public !== false;

      return {
        unitTypeId,
        title: formatRecommendationUnitTypeTitle(unit),
        exclusiveArea: toFiniteNumber(unit.exclusive_area),
        exclusiveAreaLabel: formatRecommendationAreaLabel(unit.exclusive_area),
        listPriceManwon,
        isPricePublic,
        finalGrade,
        totalScore: toFiniteNumber(unit.total_score),
        gradeLabel: unit.grade_label ?? null,
        summaryMessage: unit.summary_message ?? null,
        monthlyBurdenPercent: toFiniteNumber(
          unit.metrics?.monthly_burden_percent,
        ),
        priceLabel: buildRecommendationUnitPriceLabel(
          listPriceManwon,
          isPricePublic,
        ),
        categories: [
          mapRecommendationUnitCategory(
            "cash",
            "자금력",
            unit.categories?.cash ?? null,
            unit,
          ),
          mapRecommendationUnitCategory(
            "income",
            "소득",
            unit.categories?.income ?? null,
            unit,
          ),
          mapRecommendationUnitCategory(
            "ltvDsr",
            "대출 여건",
            unit.categories?.ltv_dsr ?? null,
            unit,
          ),
          mapRecommendationUnitCategory(
            "credit",
            "신용",
            unit.categories?.credit ?? null,
            unit,
          ),
          mapRecommendationUnitCategory(
            "ownership",
            "주택 보유",
            unit.categories?.ownership ?? null,
            unit,
          ),
          mapRecommendationUnitCategory(
            "purpose",
            "구매 목적",
            unit.categories?.purpose ?? null,
            unit,
          ),
          mapRecommendationUnitCategory(
            "timing",
            "시점",
            unit.categories?.timing ?? null,
            unit,
          ),
        ].filter(
          (category): category is RecommendationUnitTypeCategory =>
            Boolean(category),
        ),
      };
    })
    .filter((unit): unit is RecommendationUnitType => Boolean(unit));

  return sortRecommendationUnitTypes(normalized);
}

export function normalizeRecommendationUnitTypesForTest(
  unitTypeResults: RawRecommendationUnitTypeResult[],
) {
  return normalizeRecommendationUnitTypes({
    unit_type_results: unitTypeResults,
  });
}
