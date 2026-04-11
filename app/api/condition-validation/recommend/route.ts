import { unstable_cache } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { handleStructuredApiError } from "@/lib/api/route-error";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { AppError, ERR } from "@/lib/errors";
import {
  checkRateLimit,
  conditionRecommendationIpLimiter,
  getClientIp,
} from "@/lib/rateLimit";

import { evaluateFullCondition } from "@/features/condition-validation/domain/fullCustomerEvaluator";
import { evaluateGuestCondition } from "@/features/condition-validation/domain/guestEvaluator";
import {
  buildScheduleAwareTimingCategory,
  deriveScheduleAwareTimingMonthsDiff,
} from "@/features/condition-validation/lib/timing-satisfaction";
import { resolveProfileForRecommendation } from "@/features/condition-validation/server/profile-resolver";
import {
  shouldShowRecommendationForPropertyListing,
} from "@/features/recommendations/lib/recommendation-visibility.mjs";
import { normalizeOfferingStatusValue } from "@/features/offerings/domain/offering.constants";
import { OFFERING_STATUS_VALUES } from "@/features/offerings/domain/offering.types";
import type {
  FinalGrade5,
  FullCustomerInput,
  FullEvaluationResult,
  GuestCustomerInput,
  GuestEvaluationResult,
  MoveinTiming,
  UnitTypeEvaluationResult,
  UnitTypeValidationProfile,
  ValidationAssetType,
  PropertyValidationProfile,
  PurchaseTiming,
} from "@/features/condition-validation/domain/types";

type ValidationProfileRow = {
  property_id: string;
  asset_type: string;
  list_price_manwon: number | string;
  contract_ratio: number | string;
  regulation_area: string;
  transfer_restriction: boolean | null;
};

type UnitValidationProfileRow = {
  property_id: string;
  unit_type_id: number;
  unit_type_name: string | null;
  exclusive_area: number | string | null;
  list_price_manwon: number | string;
  asset_type: string;
  contract_ratio: number | string;
  regulation_area: string;
  transfer_restriction: boolean | null;
  is_price_public: boolean | null;
};

type PropertyRow = {
  id: number;
  name: string | null;
  status: string | null;
  property_type: string | null;
  property_specs:
    | Array<{
        id: number;
        sale_type: string | null;
        developer: string | null;
        builder: string | null;
        household_total: number | string | null;
        parking_per_household: number | string | null;
        heating_type: string | null;
        amenities: string | null;
        floor_area_ratio: number | string | null;
        building_coverage_ratio: number | string | null;
      }>
    | {
        id: number;
        sale_type: string | null;
        developer: string | null;
        builder: string | null;
        household_total: number | string | null;
        parking_per_household: number | string | null;
        heating_type: string | null;
        amenities: string | null;
        floor_area_ratio: number | string | null;
        building_coverage_ratio: number | string | null;
      }
    | null;
  property_timeline:
    | Array<{
        id: number;
        announcement_date: string | null;
        application_start: string | null;
        application_end: string | null;
        winner_announce: string | null;
        contract_start: string | null;
        contract_end: string | null;
        move_in_date: string | null;
        move_in_text?: string | null;
      }>
    | {
        id: number;
        announcement_date: string | null;
        application_start: string | null;
        application_end: string | null;
        winner_announce: string | null;
        contract_start: string | null;
        contract_end: string | null;
        move_in_date: string | null;
        move_in_text?: string | null;
      }
    | null;
  property_unit_types: Array<{
    price_min: number | string | null;
    price_max: number | string | null;
    is_price_public?: boolean | null;
  }> | null;
};

type PropertyUnitFallbackRow = {
  id: number;
  property_type: string | null;
  property_unit_types: Array<{
    id: number;
    type_name: string | null;
    exclusive_area: number | string | null;
    price_min: number | string | null;
    price_max: number | string | null;
    is_price_public?: boolean | null;
  }> | null;
};

type PropertyTimelineRow = {
  announcement_date: string | null;
  application_start: string | null;
  application_end: string | null;
  winner_announce: string | null;
  contract_start: string | null;
  contract_end: string | null;
  move_in_date: string | null;
  move_in_text?: string | null;
};

type PropertySnapshotRow = {
  property_id: number | string | null;
  snapshot: unknown;
  published_at: string | null;
};

type DisplayMetrics = {
  list_price: number;
  min_cash: number;
  recommended_cash: number;
  monthly_payment_est: number;
  monthly_burden_percent: number | null;
};

type EvaluatedRecommendationBase = {
  property_id: number;
  property_name: string | null;
  property_type: string | null;
  status: string | null;
  property_image_url: string | null;
  show_detailed_metrics: boolean;
  displayMetrics: DisplayMetrics;
  unit_type_results: EvaluatedUnitTypeRecommendation[];
};

type FullEvaluatedRecommendation = EvaluatedRecommendationBase & {
  evaluationMode: "full";
  result: FullEvaluationResult;
};

type GuestEvaluatedRecommendation = EvaluatedRecommendationBase & {
  evaluationMode: "guest";
  result: GuestEvaluationResult;
};

type EvaluatedRecommendation =
  | FullEvaluatedRecommendation
  | GuestEvaluatedRecommendation;

type EvaluatedUnitTypeRecommendation = UnitTypeEvaluationResult & {
  passesCategoryVisibility: boolean;
};

type RecommendationContextSnapshot = {
  properties: PropertyRow[];
  profileEntries: Array<[string, ValidationProfileRow]>;
  unitProfileEntries: Array<[string, UnitTypeValidationProfile[]]>;
  propertyImageEntries: Array<[number, string | null]>;
};

const amountSchema = z.preprocess((value) => {
  if (typeof value === "string") {
    const normalized = value.replaceAll(",", "").trim();
    if (!normalized) return Number.NaN;
    return Number(normalized);
  }
  return value;
}, z.number().finite());

const manwonAmountSchema = amountSchema
  .refine((value) => value >= 0, { message: "must be >= 0" })
  .refine((value) => Number.isInteger(value), { message: "must be integer in manwon unit" });

const closedStatusValue = OFFERING_STATUS_VALUES[OFFERING_STATUS_VALUES.length - 1];
const RECOMMENDATION_CONTEXT_CACHE_TTL_SECONDS = 60 * 5;

function compareNullableNumber(
  a: number | null,
  b: number | null,
  direction: "asc" | "desc" = "asc",
) {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return direction === "asc" ? a - b : b - a;
}

const requestSchema = z.object({
  customer: z.object({
    available_cash: manwonAmountSchema,
    monthly_income: manwonAmountSchema,
    monthly_expenses: manwonAmountSchema.optional().default(0),
    credit_grade: z.enum(["good", "normal", "unstable"]).optional(),
    employment_type: z
      .enum(["employee", "self_employed", "freelancer", "other"])
      .optional()
      .default("employee"),
    house_ownership: z
      .enum(["none", "one", "two_or_more"])
      .optional()
      .default("none"),
    purchase_purpose_v2: z
      .enum(["residence", "investment_rent", "investment_capital", "long_term"])
      .optional()
      .default("residence"),
    purchase_timing: z
      .enum(["by_property", "over_1year", "within_1year", "within_6months", "within_3months"])
      .optional()
      .default("over_1year"),
    movein_timing: z
      .enum(["anytime", "within_3years", "within_2years", "within_1year", "immediate"])
      .optional()
      .default("anytime"),
    ltv_internal_score: z.number().int().min(0).max(100).optional().default(0),
    existing_monthly_repayment: z
      .enum(["none", "under_50", "50to100", "100to200", "over_200"])
      .optional()
      .default("none"),
  }),
  options: z
    .object({
      exclude_property_id: z
        .union([z.number().int().positive(), z.string().trim().min(1)])
        .optional(),
      guest_mode: z.boolean().optional(),
      include_red: z.boolean().optional(),
      limit: z.number().int().min(1).max(60).optional(),
    })
    .optional(),
});

function createAdminSupabase() {
  try {
    return createSupabaseAdminClient();
  } catch {
    throw new AppError(
      ERR.CONFIG,
      "추천 처리 중 오류가 발생했습니다.",
      500,
    );
  }
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const normalized = value.replaceAll(",", "").trim();
    if (!normalized) return null;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toPositiveInt(value: unknown): number | null {
  const parsed = toFiniteNumber(value);
  if (parsed === null) return null;
  const asInt = Math.floor(parsed);
  return asInt > 0 ? asInt : null;
}

const KST_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function parseIsoDateStamp(value: string | null | undefined): number | null {
  if (!value) return null;
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }

  return Date.UTC(year, month - 1, day);
}

function getTodayKstStamp(now: Date = new Date()): number {
  const parts = KST_DATE_FORMATTER.formatToParts(now);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);
  return Date.UTC(year, month - 1, day);
}

function addMonthsStamp(stamp: number, months: number): number {
  const date = new Date(stamp);
  return Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth() + months,
    date.getUTCDate(),
  );
}

function addYearsStamp(stamp: number, years: number): number {
  const date = new Date(stamp);
  return Date.UTC(
    date.getUTCFullYear() + years,
    date.getUTCMonth(),
    date.getUTCDate(),
  );
}

function pickTimelineRow(property: PropertyRow): PropertyTimelineRow | null {
  if (Array.isArray(property.property_timeline)) {
    return property.property_timeline[0] ?? null;
  }
  return property.property_timeline ?? null;
}

function toTimingSatisfactionTimeline(
  timeline: PropertyTimelineRow | null,
): Parameters<typeof buildScheduleAwareTimingCategory>[0]["timeline"] {
  if (!timeline) return null;
  return {
    announcementDate: timeline.announcement_date,
    applicationStart: timeline.application_start,
    applicationEnd: timeline.application_end,
    contractStart: timeline.contract_start,
    contractEnd: timeline.contract_end,
    moveInDate: timeline.move_in_date,
  };
}

function isOngoingWindow(
  startStamp: number | null,
  endStamp: number | null,
  todayStamp: number,
): boolean {
  if (startStamp === null || todayStamp < startStamp) return false;
  return endStamp === null || todayStamp <= endStamp;
}

function resolvePurchaseAvailabilityStamp(
  timeline: PropertyTimelineRow | null,
  todayStamp: number,
): number | null {
  if (!timeline) return null;

  const applicationStart = parseIsoDateStamp(timeline.application_start);
  const applicationEnd = parseIsoDateStamp(timeline.application_end);
  const contractStart = parseIsoDateStamp(timeline.contract_start);
  const contractEnd = parseIsoDateStamp(timeline.contract_end);
  const announcementDate = parseIsoDateStamp(timeline.announcement_date);

  if (
    isOngoingWindow(applicationStart, applicationEnd, todayStamp) ||
    isOngoingWindow(contractStart, contractEnd, todayStamp)
  ) {
    return todayStamp;
  }

  const nextCandidates = [
    applicationStart,
    contractStart,
    announcementDate,
  ].filter((value): value is number => value !== null && value >= todayStamp);

  if (nextCandidates.length === 0) return null;
  return Math.min(...nextCandidates);
}

function matchesPurchaseTiming(
  purchaseTiming: PurchaseTiming,
  timeline: PropertyTimelineRow | null,
  todayStamp: number,
): boolean {
  if (purchaseTiming === "by_property") return true;

  const availabilityStamp = resolvePurchaseAvailabilityStamp(timeline, todayStamp);
  if (availabilityStamp === null) return false;

  switch (purchaseTiming) {
    case "within_3months":
      return availabilityStamp <= addMonthsStamp(todayStamp, 3);
    case "within_6months":
      return availabilityStamp <= addMonthsStamp(todayStamp, 6);
    case "within_1year":
      return availabilityStamp <= addYearsStamp(todayStamp, 1);
    case "over_1year":
      return availabilityStamp > addYearsStamp(todayStamp, 1);
  }
}

function matchesMoveinTiming(
  moveinTiming: MoveinTiming,
  timeline: PropertyTimelineRow | null,
  todayStamp: number,
): boolean {
  if (moveinTiming === "anytime") return true;

  const moveInStamp = parseIsoDateStamp(timeline?.move_in_date);
  if (moveInStamp === null) return false;

  switch (moveinTiming) {
    case "immediate":
      return moveInStamp <= addMonthsStamp(todayStamp, 3);
    case "within_1year":
      return moveInStamp <= addYearsStamp(todayStamp, 1);
    case "within_2years":
      return moveInStamp <= addYearsStamp(todayStamp, 2);
    case "within_3years":
      return moveInStamp <= addYearsStamp(todayStamp, 3);
  }
}

function matchesRecommendationSchedule(
  property: PropertyRow,
  customer: FullCustomerInput,
  todayStamp: number,
): boolean {
  if (
    customer.purchaseTiming === "by_property" &&
    customer.moveinTiming === "anytime"
  ) {
    return true;
  }

  const timeline = pickTimelineRow(property);
  return (
    matchesPurchaseTiming(customer.purchaseTiming, timeline, todayStamp) &&
    matchesMoveinTiming(customer.moveinTiming, timeline, todayStamp)
  );
}

function getCashRule(assetType: ValidationAssetType): {
  minExtraRate: number;
  recommendedExtraRate: number;
} {
  if (assetType === "apartment") return { minExtraRate: 0.08, recommendedExtraRate: 0.12 };
  if (assetType === "officetel") return { minExtraRate: 0.1, recommendedExtraRate: 0.15 };
  return { minExtraRate: 0.12, recommendedExtraRate: 0.18 };
}

function computeDisplayMetrics(
  profile: PropertyValidationProfile,
  monthlyPaymentEst: number,
  monthlyIncome: number,
): DisplayMetrics {
  const contractAmount = profile.listPrice * profile.contractRatio;
  const cashRule = getCashRule(profile.assetType);
  const minCash = contractAmount + profile.listPrice * cashRule.minExtraRate;
  const recommendedCash = contractAmount + profile.listPrice * cashRule.recommendedExtraRate;
  const monthlyBurdenPercent =
    monthlyIncome > 0
      ? Math.round((monthlyPaymentEst / monthlyIncome) * 10000) / 100
      : null;
  return {
    list_price: Math.round(profile.listPrice),
    min_cash: Math.round(minCash),
    recommended_cash: Math.round(recommendedCash),
    monthly_payment_est: Math.round(monthlyPaymentEst),
    monthly_burden_percent: monthlyBurdenPercent,
  };
}

function mapGradeToAction(
  grade: FinalGrade5,
): string {
  if (grade === "GREEN") return "VISIT_BOOKING";
  if (grade === "LIME") return "PRE_VISIT_CONSULT";
  if (grade === "YELLOW") return "PRE_VISIT_CONSULT";
  return "RECOMMEND_ALTERNATIVE_AND_CONSULT";
}

function normalizeGuestCreditGrade(params: {
  creditGrade?: GuestCustomerInput["creditGrade"];
  ltvInternalScore?: number;
}): GuestCustomerInput["creditGrade"] {
  const { creditGrade, ltvInternalScore = 0 } = params;
  if (creditGrade) return creditGrade;
  if (ltvInternalScore >= 70) return "good";
  if (ltvInternalScore >= 40) return "normal";
  return "unstable";
}

function shouldShowDetailedMetrics(
  unitTypes: Array<{ is_price_public?: boolean | null }> | null,
): boolean {
  const rows = unitTypes ?? [];
  if (rows.length === 0) return true;
  return rows.some((row) => row.is_price_public !== false);
}

function toUnknownRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function pickImageUrlFromSnapshot(snapshot: unknown): string | null {
  const record = toUnknownRecord(snapshot);
  if (!record) return null;
  const directCandidates = [
    record.image_url,
    record.imageUrl,
    record.main_image_url,
    record.mainImageUrl,
  ];
  for (const candidate of directCandidates) {
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
  }
  const galleries = [record.property_gallery_images, record.gallery_images, record.images];
  for (const gallery of galleries) {
    if (!Array.isArray(gallery)) continue;
    for (const item of gallery) {
      const image = toUnknownRecord(item);
      if (!image) continue;
      const candidate = image.image_url ?? image.imageUrl;
      if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
    }
  }
  return null;
}

async function loadRecommendationProperties(
  adminSupabase: ReturnType<typeof createAdminSupabase>,
) {
  const rows: PropertyRow[] = [];
  const chunkSize = 200;
  const maxRows = 1200;
  let from = 0;
  while (rows.length < maxRows) {
    const { data, error } = await adminSupabase
      .from("properties")
      .select(
        "id, name, status, property_type, property_specs(id,sale_type,developer,builder,household_total,parking_per_household,heating_type,amenities,floor_area_ratio,building_coverage_ratio), property_timeline(id,announcement_date,application_start,application_end,winner_announce,contract_start,contract_end,move_in_date,move_in_text), property_unit_types(price_min,price_max,is_price_public)",
      )
      .order("id", { ascending: false })
      .range(from, from + chunkSize - 1)
      .returns<PropertyRow[]>();
    if (error) throw new Error(error.message);
    const page = data ?? [];
    if (page.length === 0) break;
    rows.push(...page);
    if (page.length < chunkSize) break;
    from += chunkSize;
  }
  return rows.slice(0, maxRows);
}

async function loadValidationProfilesByPropertyIds(
  adminSupabase: ReturnType<typeof createAdminSupabase>,
  ids: number[],
) {
  if (ids.length === 0) return new Map<string, ValidationProfileRow>();
  const rows: ValidationProfileRow[] = [];
  const chunkSize = 200;
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize).map((id) => String(id));
    const { data, error } = await adminSupabase
      .from("property_validation_profiles")
      .select(
        "property_id, asset_type, list_price_manwon, contract_ratio, regulation_area, transfer_restriction",
      )
      .in("property_id", chunk)
      .returns<ValidationProfileRow[]>();
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
  }
  return new Map(rows.map((row) => [String(row.property_id), row]));
}

function toFiniteNumberLocal(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const normalized = value.replaceAll(",", "").trim();
    if (!normalized) return null;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizePriceToManwon(value: number): number {
  return Math.abs(value) >= 10_000_000 ? value / 10_000 : value;
}

function parseAssetTypeLocal(raw: string): ValidationAssetType | null {
  if (
    raw === "apartment" ||
    raw === "officetel" ||
    raw === "commercial" ||
    raw === "knowledge_industry"
  ) {
    return raw;
  }
  return null;
}

function normalizeTextLocal(value: string | null | undefined): string {
  return (value ?? "").toLowerCase().replace(/\s+/g, "");
}

function inferAssetTypeLocal(raw: string | null): ValidationAssetType {
  const normalized = normalizeTextLocal(raw);
  if (normalized.includes("오피스텔") || normalized.includes("officetel")) {
    return "officetel";
  }
  if (normalized.includes("아파트") || normalized.includes("apartment")) {
    return "apartment";
  }
  if (normalized.includes("지식산업")) {
    return "knowledge_industry";
  }
  if (normalized.includes("상가") || normalized.includes("상업")) {
    return "commercial";
  }
  return "apartment";
}

function defaultContractRatioLocal(): number {
  return 0.1;
}

async function loadUnitValidationProfilesByPropertyIds(
  adminSupabase: ReturnType<typeof createAdminSupabase>,
  ids: number[],
): Promise<Map<string, UnitTypeValidationProfile[]>> {
  const resultMap = new Map<string, UnitTypeValidationProfile[]>();
  if (ids.length === 0) return resultMap;

  const chunkSize = 200;
  const rows: UnitValidationProfileRow[] = [];

  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize).map((id) => String(id));
    const { data, error } = await adminSupabase
      .from("property_unit_validation_profiles")
      .select(
        "property_id,unit_type_id,unit_type_name,exclusive_area,list_price_manwon,asset_type,contract_ratio,regulation_area,transfer_restriction,is_price_public",
      )
      .in("property_id", chunk)
      .returns<UnitValidationProfileRow[]>();
    if (error) {
      // 테이블이 없으면 빈 맵 반환 (폴백 처리는 상위에서)
      if (error.code === "42P01" || error.code === "PGRST205") break;
      throw new Error(error.message);
    }
    rows.push(...(data ?? []));
  }

  for (const row of rows) {
    const assetType = parseAssetTypeLocal(String(row.asset_type));
    const listPriceRaw = toFiniteNumberLocal(row.list_price_manwon);
    const contractRatioRaw = toFiniteNumberLocal(row.contract_ratio);
    if (!assetType || listPriceRaw === null || contractRatioRaw === null) continue;

    const listPriceManwon = normalizePriceToManwon(listPriceRaw);
    if (listPriceManwon <= 0) continue;

    const contractRatio = contractRatioRaw > 1 ? contractRatioRaw / 100 : contractRatioRaw;
    const profile: UnitTypeValidationProfile = {
      propertyId: String(row.property_id),
      unitTypeId: row.unit_type_id,
      unitTypeName: row.unit_type_name ?? null,
      exclusiveArea: toFiniteNumberLocal(row.exclusive_area),
      listPriceManwon,
      isPricePublic: row.is_price_public !== false,
      assetType,
      contractRatio,
      regulationArea:
        row.regulation_area === "adjustment_target" || row.regulation_area === "speculative_overheated"
          ? row.regulation_area
          : "non_regulated",
      transferRestriction: Boolean(row.transfer_restriction),
    };

    const key = String(row.property_id);
    const existing = resultMap.get(key) ?? [];
    existing.push(profile);
    resultMap.set(key, existing);
  }

  const missingIds = ids.filter((id) => {
    const units = resultMap.get(String(id));
    return !units || units.length === 0;
  });

  if (missingIds.length === 0) return resultMap;

  for (let i = 0; i < missingIds.length; i += chunkSize) {
    const chunk = missingIds.slice(i, i + chunkSize);
    const { data: properties, error } = await adminSupabase
      .from("properties")
      .select(
        "id, property_type, property_unit_types(id,type_name,exclusive_area,price_min,price_max,is_price_public)",
      )
      .in("id", chunk)
      .returns<PropertyUnitFallbackRow[]>();

    if (error) {
      throw new Error(error.message);
    }

    for (const property of properties ?? []) {
      const assetType = inferAssetTypeLocal(property.property_type);
      const contractRatio = defaultContractRatioLocal();
      const units = (property.property_unit_types ?? [])
        .map((unit): UnitTypeValidationProfile | null => {
          const priceMax = toFiniteNumberLocal(unit.price_max);
          const priceMin = toFiniteNumberLocal(unit.price_min);
          const rawPrice =
            priceMax !== null && priceMax > 0
              ? priceMax
              : priceMin !== null && priceMin > 0
                ? priceMin
                : null;
          if (rawPrice === null) return null;

          const listPriceManwon = normalizePriceToManwon(rawPrice);
          if (listPriceManwon <= 0) return null;

          return {
            propertyId: String(property.id),
            unitTypeId: unit.id,
            unitTypeName: unit.type_name ?? null,
            exclusiveArea: toFiniteNumberLocal(unit.exclusive_area),
            listPriceManwon,
            isPricePublic: unit.is_price_public !== false,
            assetType,
            contractRatio,
            regulationArea: "non_regulated",
            transferRestriction: false,
          };
        })
        .filter((unit): unit is UnitTypeValidationProfile => unit !== null);

      if (units.length > 0) {
        resultMap.set(String(property.id), units);
      }
    }
  }

  return resultMap;
}

function evaluateUnitTypes(params: {
  unitProfiles: UnitTypeValidationProfile[];
  baseProfile: PropertyValidationProfile;
  customer: FullCustomerInput | GuestCustomerInput;
  isGuestMode: boolean;
  monthlyIncome: number;
  timeline: PropertyTimelineRow | null;
  todayStamp: number;
}): EvaluatedUnitTypeRecommendation[] {
  const {
    unitProfiles,
    baseProfile,
    customer,
    isGuestMode,
    monthlyIncome,
    timeline,
    todayStamp,
  } = params;

  return unitProfiles.map((unitProfile): EvaluatedUnitTypeRecommendation => {
    const profile: PropertyValidationProfile = {
      ...baseProfile,
      propertyId: unitProfile.propertyId,
      propertyName: baseProfile.propertyName,
      assetType: unitProfile.assetType,
      listPrice: unitProfile.listPriceManwon,
      contractRatio: unitProfile.contractRatio,
      regulationArea: unitProfile.regulationArea,
      transferRestriction: unitProfile.transferRestriction,
      matchedPropertyId: toPositiveInt(unitProfile.propertyId),
      source: baseProfile.source,
    };

    let result: FullEvaluationResult | GuestEvaluationResult;
    let passesCategoryVisibility: boolean;

    if (isGuestMode) {
      result = evaluateGuestCondition({ profile, customer: customer as GuestCustomerInput });
      passesCategoryVisibility = passesGuestCategoryVisibility(result);
    } else {
      result = evaluateFullCondition({
        profile,
        customer: customer as FullCustomerInput,
        timingOverride: buildScheduleAwareTimingCategory({
          purchaseTiming: (customer as FullCustomerInput).purchaseTiming,
          moveinTiming: (customer as FullCustomerInput).moveinTiming,
          timeline: toTimingSatisfactionTimeline(timeline),
          todayStamp,
        }),
      });
      passesCategoryVisibility = passesFullCategoryVisibility(result);
    }

    const contractAmount = unitProfile.listPriceManwon * unitProfile.contractRatio;
    const minCash = unitProfile.listPriceManwon * unitProfile.contractRatio;
    const recommendedCash = minCash + unitProfile.listPriceManwon * 0.1;
    const loanAmount = unitProfile.listPriceManwon * (unitProfile.listPriceManwon <= 90000 ? 0.55 : 0.45);
    const monthlyPaymentEst = result.metrics.monthlyPaymentEst;
    const monthlyBurdenPercent =
      monthlyIncome > 0
        ? Math.round((monthlyPaymentEst / monthlyIncome) * 10000) / 100
        : null;
    const timingMonthsDiff =
      isGuestMode || !timeline
        ? null
        : deriveScheduleAwareTimingMonthsDiff({
            purchaseTiming: (customer as FullCustomerInput).purchaseTiming,
            moveinTiming: (customer as FullCustomerInput).moveinTiming,
            timeline: toTimingSatisfactionTimeline(timeline),
            todayStamp,
          });

    let categories: EvaluatedUnitTypeRecommendation["categories"];
    if (isGuestMode) {
      const guestResult = result as GuestEvaluationResult;
      categories = {
        cash: {
          grade: guestResult.categories.cash.grade,
          score: guestResult.categories.cash.score,
          maxScore: guestResult.categories.cash.maxScore,
          reason: guestResult.categories.cash.reasonMessage,
        },
        income: {
          grade: guestResult.categories.income.grade,
          score: guestResult.categories.income.score,
          maxScore: guestResult.categories.income.maxScore,
          reason: guestResult.categories.income.reasonMessage,
        },
        credit: {
          grade: guestResult.categories.credit.grade,
          score: guestResult.categories.credit.score,
          maxScore: guestResult.categories.credit.maxScore,
          reason: guestResult.categories.credit.reasonMessage,
        },
        ownership: {
          grade: guestResult.categories.ownership.grade,
          score: guestResult.categories.ownership.score,
          maxScore: guestResult.categories.ownership.maxScore,
          reason: guestResult.categories.ownership.reasonMessage,
        },
        purpose: {
          grade: guestResult.categories.purpose.grade,
          score: guestResult.categories.purpose.score,
          maxScore: guestResult.categories.purpose.maxScore,
          reason: guestResult.categories.purpose.reasonMessage,
        },
      };
    } else {
      const fullResult = result as FullEvaluationResult;
      categories = {
        cash: {
          grade: fullResult.categories.cash.grade,
          score: fullResult.categories.cash.score,
          maxScore: fullResult.categories.cash.maxScore,
          reason: fullResult.categories.cash.reasonMessage,
        },
        income: {
          grade: fullResult.categories.income.grade,
          score: fullResult.categories.income.score,
          maxScore: fullResult.categories.income.maxScore,
          reason: fullResult.categories.income.reasonMessage,
        },
        ltv_dsr: {
          grade: fullResult.categories.ltvDsr.grade,
          score: fullResult.categories.ltvDsr.score,
          maxScore: fullResult.categories.ltvDsr.maxScore,
          reason: fullResult.categories.ltvDsr.reasonMessage,
        },
        ownership: {
          grade: fullResult.categories.ownership.grade,
          score: fullResult.categories.ownership.score,
          maxScore: fullResult.categories.ownership.maxScore,
          reason: fullResult.categories.ownership.reasonMessage,
        },
        purpose: {
          grade: fullResult.categories.purpose.grade,
          score: fullResult.categories.purpose.score,
          maxScore: fullResult.categories.purpose.maxScore,
          reason: fullResult.categories.purpose.reasonMessage,
        },
        timing: {
          grade: fullResult.categories.timing.grade,
          score: fullResult.categories.timing.score,
          maxScore: fullResult.categories.timing.maxScore,
          reason: fullResult.categories.timing.reasonMessage,
        },
      };
    }

    return {
      unitTypeId: unitProfile.unitTypeId,
      unitTypeName: unitProfile.unitTypeName,
      exclusiveArea: unitProfile.exclusiveArea,
      listPriceManwon: unitProfile.listPriceManwon,
      isPricePublic: unitProfile.isPricePublic,
      finalGrade: result.finalGrade,
      totalScore: result.totalScore,
      summaryMessage: result.summaryMessage,
      gradeLabel: result.gradeLabel,
      passesCategoryVisibility,
      metrics: {
        contractAmount: Math.round(contractAmount),
        minCash: Math.round(minCash),
        recommendedCash: Math.round(recommendedCash),
        loanAmount: Math.round(loanAmount),
        monthlyPaymentEst: Math.round(monthlyPaymentEst),
        monthlyBurdenPercent,
        timingMonthsDiff,
      },
      categories,
    };
  });
}

function passesGuestCategoryVisibility(result: GuestEvaluationResult): boolean {
  return shouldShowRecommendationForPropertyListing({
    cash: result.categories.cash.grade,
    income: result.categories.income.grade,
    credit: result.categories.credit.grade,
    ownership: result.categories.ownership.grade,
  });
}

function passesFullCategoryVisibility(result: FullEvaluationResult): boolean {
  return shouldShowRecommendationForPropertyListing({
    cash: result.categories.cash.grade,
    income: result.categories.income.grade,
    ltvDsr: result.categories.ltvDsr.grade,
    ownership: result.categories.ownership.grade,
    timing: result.categories.timing.grade,
  });
}

const GRADE_ORDER: Record<string, number> = {
  GREEN: 0,
  LIME: 1,
  YELLOW: 2,
  ORANGE: 3,
  RED: 4,
};

function pickBestUnitResult(
  results: UnitTypeEvaluationResult[],
): UnitTypeEvaluationResult | null {
  if (results.length === 0) return null;
  return results.reduce((best, curr) =>
    (GRADE_ORDER[curr.finalGrade] ?? 4) < (GRADE_ORDER[best.finalGrade] ?? 4) ? curr : best,
  );
}

async function loadPropertyImageMapByIds(
  adminSupabase: ReturnType<typeof createAdminSupabase>,
  ids: number[],
) {
  const imageMap = new Map<number, string | null>();
  if (ids.length === 0) return imageMap;
  const chunkSize = 200;
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    const { data, error } = await adminSupabase
      .from("property_public_snapshots")
      .select("property_id, snapshot, published_at")
      .in("property_id", chunk)
      .order("published_at", { ascending: false })
      .returns<PropertySnapshotRow[]>();
    if (error) throw new Error(error.message);
    for (const row of data ?? []) {
      const propertyId = toPositiveInt(row.property_id);
      if (!propertyId) continue;
      if (imageMap.has(propertyId)) continue;
      imageMap.set(propertyId, pickImageUrlFromSnapshot(row.snapshot));
    }
  }
  return imageMap;
}

const loadRecommendationContextCached = unstable_cache(
  async (): Promise<RecommendationContextSnapshot> => {
    const adminSupabase = createAdminSupabase();
    const properties = await loadRecommendationProperties(adminSupabase);
    const propertyIds = properties.map((property) => property.id);
    const [profileByPropertyId, unitProfilesByPropertyId, propertyImageMap] = await Promise.all([
      loadValidationProfilesByPropertyIds(adminSupabase, propertyIds),
      loadUnitValidationProfilesByPropertyIds(adminSupabase, propertyIds),
      loadPropertyImageMapByIds(adminSupabase, propertyIds),
    ]);

    return {
      properties,
      profileEntries: Array.from(profileByPropertyId.entries()),
      unitProfileEntries: Array.from(unitProfilesByPropertyId.entries()),
      propertyImageEntries: Array.from(propertyImageMap.entries()),
    };
  },
  ["condition-validation-recommendation-context"],
  { revalidate: RECOMMENDATION_CONTEXT_CACHE_TTL_SECONDS },
);

export async function POST(request: Request) {
  const rateLimitRes = await checkRateLimit(
    conditionRecommendationIpLimiter,
    getClientIp(request),
    {
      windowMs: 60 * 1000,
      message: "맞춤 현장 추천 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
    },
  );
  if (rateLimitRes) return rateLimitRes;

  let payload: unknown = null;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: "VALIDATION_ERROR", message: "invalid json payload" } },
      { status: 400 },
    );
  }

  const parsed = requestSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "입력값이 올바르지 않습니다.",
        },
      },
      { status: 400 },
    );
  }

  try {
    const input = parsed.data.customer;
    const limit = parsed.data.options?.limit ?? 24;
    const includeRed = parsed.data.options?.include_red ?? false;
    const isGuestMode = parsed.data.options?.guest_mode === true;
    const excludePropertyId = toPositiveInt(parsed.data.options?.exclude_property_id);

    const fullCustomer: FullCustomerInput = {
      availableCash: input.available_cash,
      monthlyIncome: input.monthly_income,
      monthlyExpenses: input.monthly_expenses,
      employmentType: input.employment_type,
      houseOwnership: input.house_ownership,
      purchasePurpose: input.purchase_purpose_v2,
      purchaseTiming: input.purchase_timing,
      moveinTiming: input.movein_timing,
      ltvInternalScore: input.ltv_internal_score,
      existingMonthlyRepayment: input.existing_monthly_repayment,
    };
    const guestCustomer: GuestCustomerInput = {
      availableCash: input.available_cash,
      monthlyIncome: input.monthly_income,
      creditGrade: normalizeGuestCreditGrade({
        creditGrade: input.credit_grade,
        ltvInternalScore: input.ltv_internal_score,
      }),
      houseOwnership: input.house_ownership,
      purchasePurpose: input.purchase_purpose_v2,
    };
    const todayStamp = getTodayKstStamp();

    const recommendationContext = await loadRecommendationContextCached();
    const properties = recommendationContext.properties;
    const profileByPropertyId = new Map(recommendationContext.profileEntries);
    const unitProfilesByPropertyId = new Map(recommendationContext.unitProfileEntries);
    const propertyImageMap = new Map(recommendationContext.propertyImageEntries);

    const evaluated: EvaluatedRecommendation[] = properties
      .map((property): EvaluatedRecommendation | null => {
        if (excludePropertyId && property.id === excludePropertyId) return null;
        if (normalizeOfferingStatusValue(property.status) === closedStatusValue) return null;
        if (!isGuestMode && !matchesRecommendationSchedule(property, fullCustomer, todayStamp)) {
          return null;
        }

        const profile = resolveProfileForRecommendation({
          property,
          profileRow: profileByPropertyId.get(String(property.id)),
        });
        if (!profile) return null;
        const timeline = pickTimelineRow(property);

        // 타입별 평가
        const unitProfiles = unitProfilesByPropertyId.get(String(property.id)) ?? [];
        const unitTypeResults = evaluateUnitTypes({
          unitProfiles,
          baseProfile: profile,
          customer: isGuestMode ? guestCustomer : fullCustomer,
          isGuestMode,
          monthlyIncome: isGuestMode ? guestCustomer.monthlyIncome : fullCustomer.monthlyIncome,
          timeline,
          todayStamp,
        });

        if (isGuestMode) {
          const result = evaluateGuestCondition({ profile, customer: guestCustomer });
          const displayMetrics = computeDisplayMetrics(
            profile,
            result.metrics.monthlyPaymentEst,
            guestCustomer.monthlyIncome,
          );

          return {
            property_id: property.id,
            property_name: property.name,
            property_type: property.property_type,
            status: property.status,
            property_image_url: propertyImageMap.get(property.id) ?? null,
            show_detailed_metrics: shouldShowDetailedMetrics(property.property_unit_types),
            evaluationMode: "guest",
            result,
            displayMetrics,
            unit_type_results: unitTypeResults,
          };
        }

        const result = evaluateFullCondition({
          profile,
          customer: fullCustomer,
          timingOverride: buildScheduleAwareTimingCategory({
            purchaseTiming: fullCustomer.purchaseTiming,
            moveinTiming: fullCustomer.moveinTiming,
            timeline: toTimingSatisfactionTimeline(timeline),
            todayStamp,
          }),
        });
        const displayMetrics = computeDisplayMetrics(
          profile,
          result.metrics.monthlyPaymentEst,
          fullCustomer.monthlyIncome,
        );

        return {
          property_id: property.id,
          property_name: property.name,
          property_type: property.property_type,
          status: property.status,
          property_image_url: propertyImageMap.get(property.id) ?? null,
          show_detailed_metrics: shouldShowDetailedMetrics(property.property_unit_types),
          evaluationMode: "full",
          result,
          displayMetrics,
          unit_type_results: unitTypeResults,
        };
      })
      .filter((item): item is EvaluatedRecommendation => item !== null)
      .sort((a, b) => {
        const scoreDiff = b.result.totalScore - a.result.totalScore;
        if (scoreDiff !== 0) return scoreDiff;
        const burdenDiff = compareNullableNumber(
          a.displayMetrics.monthly_burden_percent,
          b.displayMetrics.monthly_burden_percent,
          "asc",
        );
        if (burdenDiff !== 0) return burdenDiff;
        return a.displayMetrics.min_cash - b.displayMetrics.min_cash;
      });

    // 모든 평가 카테고리가 GREEN/LIME인 결과만 노출
    const filtered = includeRed
      ? evaluated
      : evaluated.filter((item) => {
          if (item.unit_type_results.length > 0) {
            return item.unit_type_results.some((u) => u.passesCategoryVisibility);
          }
          return item.evaluationMode === "guest"
            ? passesGuestCategoryVisibility(item.result)
            : passesFullCategoryVisibility(item.result);
        });

    const selected = filtered.slice(0, limit);

    return NextResponse.json({
      ok: true,
      scanned: evaluated.length,
      returned: selected.length,
      property_ids: selected.map((item) => item.property_id),
      recommendations: selected.map((item) => ({
        property_id: item.property_id,
        property_name: item.property_name,
        property_type: item.property_type,
        status: item.status,
        image_url: item.property_image_url,
        final_grade: item.result.finalGrade,
        grade_label: item.result.gradeLabel,
        total_score: item.result.totalScore,
        action: mapGradeToAction(item.result.finalGrade),
        summary_message: item.result.summaryMessage,
        reason_messages: [item.result.categories.cash.reasonMessage],
        show_detailed_metrics: item.show_detailed_metrics,
        categories:
          item.evaluationMode === "guest"
            ? {
                cash: {
                  grade: item.result.categories.cash.grade,
                  score: item.result.categories.cash.score,
                },
                income: {
                  grade: item.result.categories.income.grade,
                  score: item.result.categories.income.score,
                },
                ltv_dsr: {
                  grade: item.result.categories.credit.grade,
                  score: item.result.categories.credit.score,
                },
                ownership: {
                  grade: item.result.categories.ownership.grade,
                  score: item.result.categories.ownership.score,
                },
                purpose: {
                  grade: item.result.categories.purpose.grade,
                  score: item.result.categories.purpose.score,
                },
              }
            : {
                cash: {
                  grade: item.result.categories.cash.grade,
                  score: item.result.categories.cash.score,
                },
                income: {
                  grade: item.result.categories.income.grade,
                  score: item.result.categories.income.score,
                },
                ltv_dsr: {
                  grade: item.result.categories.ltvDsr.grade,
                  score: item.result.categories.ltvDsr.score,
                },
                ownership: {
                  grade: item.result.categories.ownership.grade,
                  score: item.result.categories.ownership.score,
                },
                purpose: {
                  grade: item.result.categories.purpose.grade,
                  score: item.result.categories.purpose.score,
                },
                timing: {
                  grade: item.result.categories.timing.grade,
                  score: item.result.categories.timing.score,
                },
              },
        metrics: {
          list_price: item.displayMetrics.list_price,
          min_cash: item.displayMetrics.min_cash,
          recommended_cash: item.displayMetrics.recommended_cash,
          monthly_payment_est: item.displayMetrics.monthly_payment_est,
          monthly_burden_percent: item.displayMetrics.monthly_burden_percent,
        },
        best_unit_type: pickBestUnitResult(item.unit_type_results) ?? null,
        unit_type_results: item.unit_type_results.map((u) => ({
          unit_type_id: u.unitTypeId,
          unit_type_name: u.unitTypeName,
          exclusive_area: u.exclusiveArea,
          list_price_manwon: u.listPriceManwon,
          is_price_public: u.isPricePublic,
          final_grade: u.finalGrade,
          total_score: u.totalScore,
          summary_message: u.summaryMessage,
          grade_label: u.gradeLabel,
          metrics: {
            contract_amount: u.metrics.contractAmount,
            min_cash: u.metrics.minCash,
            recommended_cash: u.metrics.recommendedCash,
            loan_amount: u.metrics.loanAmount,
            monthly_payment_est: u.metrics.monthlyPaymentEst,
            monthly_burden_percent: u.metrics.monthlyBurdenPercent,
            timing_months_diff: u.metrics.timingMonthsDiff,
          },
          categories: u.categories
            ? {
                cash: u.categories.cash
                  ? {
                      grade: u.categories.cash.grade,
                      score: u.categories.cash.score,
                      max_score: u.categories.cash.maxScore,
                      reason: u.categories.cash.reason,
                    }
                  : undefined,
                income: u.categories.income
                  ? {
                      grade: u.categories.income.grade,
                      score: u.categories.income.score,
                      max_score: u.categories.income.maxScore,
                      reason: u.categories.income.reason,
                    }
                  : undefined,
                ltv_dsr: u.categories.ltv_dsr
                  ? {
                      grade: u.categories.ltv_dsr.grade,
                      score: u.categories.ltv_dsr.score,
                      max_score: u.categories.ltv_dsr.maxScore,
                      reason: u.categories.ltv_dsr.reason,
                    }
                  : undefined,
                credit: u.categories.credit
                  ? {
                      grade: u.categories.credit.grade,
                      score: u.categories.credit.score,
                      max_score: u.categories.credit.maxScore,
                      reason: u.categories.credit.reason,
                    }
                  : undefined,
                ownership: u.categories.ownership
                  ? {
                      grade: u.categories.ownership.grade,
                      score: u.categories.ownership.score,
                      max_score: u.categories.ownership.maxScore,
                      reason: u.categories.ownership.reason,
                    }
                  : undefined,
                purpose: u.categories.purpose
                  ? {
                      grade: u.categories.purpose.grade,
                      score: u.categories.purpose.score,
                      max_score: u.categories.purpose.maxScore,
                      reason: u.categories.purpose.reason,
                    }
                  : undefined,
                timing: u.categories.timing
                  ? {
                      grade: u.categories.timing.grade,
                      score: u.categories.timing.score,
                      max_score: u.categories.timing.maxScore,
                      reason: u.categories.timing.reason,
                    }
                  : undefined,
              }
            : undefined,
          recommendation_context: {
            available_cash_manwon: isGuestMode
              ? guestCustomer.availableCash
              : fullCustomer.availableCash,
            monthly_income_manwon: isGuestMode
              ? guestCustomer.monthlyIncome
              : fullCustomer.monthlyIncome,
            house_ownership: isGuestMode
              ? guestCustomer.houseOwnership
              : fullCustomer.houseOwnership,
            purchase_purpose: isGuestMode
              ? guestCustomer.purchasePurpose
              : fullCustomer.purchasePurpose,
          },
        })),
      })),
      evaluated_at: new Date().toISOString(),
    });
  } catch (error) {
    return handleStructuredApiError("condition-validation/recommend", error, {
      status: 500,
      code: "RECOMMENDATION_FAILED",
      message: "추천 현장 조회 중 오류가 발생했습니다.",
    });
  }
}
