// features/offerings/services/offering.compare.ts
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServer } from "@/lib/supabaseServer";
import { evaluateFullCondition } from "@/features/condition-validation/domain/fullCustomerEvaluator";
import { buildScheduleAwareTimingCategory } from "@/features/condition-validation/lib/timing-satisfaction";
import type {
  EmploymentType,
  FullCustomerInput,
  FullPurchasePurpose,
  MonthlyLoanRepayment,
  MoveinTiming,
  PurchaseTiming,
} from "@/features/condition-validation/domain/types";
import { loadPropertyProfile } from "@/features/condition-validation/server/profile-resolver";
import {
  ltvInternalScoreFromCreditGrade as sharedLtvInternalScoreFromCreditGrade,
} from "@/features/condition-validation/domain/conditionState";
import {
  normalizeOfferingStatusValue,
  OFFERING_STATUS_VALUES,
} from "@/features/offerings/domain/offering.constants";
import type { OfferingCompareItem } from "../domain/offering.types";
import type { PropertyRow } from "../domain/offeringDetail.types";
import { formatPriceRange } from "@/shared/price";
import { formatManwonWithEok } from "@/lib/format/currency";

type RecoPoiQueryRow = {
  property_id: number;
  category: string;
  rank: number;
  name: string;
  distance_m: number | string | null;
  school_level: string | null;
};

type CompareProfileRow = {
  cv_available_cash_manwon: number | null;
  cv_monthly_income_manwon: number | null;
  cv_monthly_expenses_manwon: number | null;
  cv_owned_house_count: number | null;
  cv_credit_grade: "good" | "normal" | "unstable" | null;
  cv_purchase_purpose: "residence" | "investment" | "both" | null;
  cv_employment_type: EmploymentType | null;
  cv_house_ownership: "none" | "one" | "two_or_more" | null;
  cv_purchase_purpose_v2: FullPurchasePurpose | null;
  cv_purchase_timing: PurchaseTiming | null;
  cv_movein_timing: MoveinTiming | null;
  cv_ltv_internal_score: number | null;
  cv_existing_monthly_repayment: MonthlyLoanRepayment | null;
};

const EMPLOYMENT_TYPES = ["employee", "self_employed", "freelancer", "other"] as const;
const HOUSE_OWNERSHIPS = ["none", "one", "two_or_more"] as const;
const PURCHASE_PURPOSES = [
  "residence",
  "investment_rent",
  "investment_capital",
  "long_term",
] as const;
const PURCHASE_TIMINGS = [
  "by_property",
  "over_1year",
  "within_1year",
  "within_6months",
  "within_3months",
] as const;
const MOVEIN_TIMINGS = [
  "anytime",
  "within_3years",
  "within_2years",
  "within_1year",
  "immediate",
] as const;
const MONTHLY_REPAYMENTS = ["none", "under_50", "50to100", "100to200", "over_200"] as const;

function createAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;
  return createClient(url, serviceRoleKey);
}

function toFiniteInteger(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? Math.max(0, Math.round(value)) : null;
  }
  if (typeof value === "string") {
    const normalized = value.replaceAll(",", "").trim();
    if (!normalized) return null;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : null;
  }
  return null;
}

function isOneOf<T extends string>(values: readonly T[], value: unknown): value is T {
  return typeof value === "string" && (values as readonly string[]).includes(value);
}

function houseOwnershipFromOwnedHouseCount(value: unknown): "none" | "one" | "two_or_more" {
  const count = toFiniteInteger(value) ?? 0;
  if (count >= 2) return "two_or_more";
  if (count === 1) return "one";
  return "none";
}

function purchasePurposeFromLegacy(value: unknown): FullPurchasePurpose {
  if (value === "investment") return "investment_capital";
  if (value === "both") return "long_term";
  return "residence";
}

function buildCompareCustomer(profile: CompareProfileRow | null): FullCustomerInput | null {
  if (!profile) return null;

  const availableCash = toFiniteInteger(profile.cv_available_cash_manwon);
  const monthlyIncome = toFiniteInteger(profile.cv_monthly_income_manwon);
  if (availableCash === null || monthlyIncome === null) return null;

  return {
    employmentType: isOneOf(EMPLOYMENT_TYPES, profile.cv_employment_type)
      ? profile.cv_employment_type
      : "employee",
    availableCash,
    monthlyIncome,
    monthlyExpenses: toFiniteInteger(profile.cv_monthly_expenses_manwon) ?? 0,
    houseOwnership: isOneOf(HOUSE_OWNERSHIPS, profile.cv_house_ownership)
      ? profile.cv_house_ownership
      : houseOwnershipFromOwnedHouseCount(profile.cv_owned_house_count),
    purchasePurpose: isOneOf(PURCHASE_PURPOSES, profile.cv_purchase_purpose_v2)
      ? profile.cv_purchase_purpose_v2
      : purchasePurposeFromLegacy(profile.cv_purchase_purpose),
    purchaseTiming: isOneOf(PURCHASE_TIMINGS, profile.cv_purchase_timing)
      ? profile.cv_purchase_timing
      : "by_property",
    moveinTiming: isOneOf(MOVEIN_TIMINGS, profile.cv_movein_timing)
      ? profile.cv_movein_timing
      : "anytime",
    ltvInternalScore: Math.min(
      100,
      Math.max(
        0,
        toFiniteInteger(profile.cv_ltv_internal_score) ??
          sharedLtvInternalScoreFromCreditGrade(
            profile.cv_credit_grade === "good" ||
              profile.cv_credit_grade === "normal" ||
              profile.cv_credit_grade === "unstable"
              ? profile.cv_credit_grade
              : null,
          ) ?? 0,
      ),
    ),
    existingMonthlyRepayment: isOneOf(
      MONTHLY_REPAYMENTS,
      profile.cv_existing_monthly_repayment,
    )
      ? profile.cv_existing_monthly_repayment
      : "none",
  };
}

export async function loadCompareViewerCustomer(
  userId: string,
): Promise<FullCustomerInput | null> {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "cv_available_cash_manwon, cv_monthly_income_manwon, cv_monthly_expenses_manwon, cv_owned_house_count, cv_credit_grade, cv_purchase_purpose, cv_employment_type, cv_house_ownership, cv_purchase_purpose_v2, cv_purchase_timing, cv_movein_timing, cv_ltv_internal_score, cv_existing_monthly_repayment",
    )
    .eq("id", userId)
    .maybeSingle<CompareProfileRow>();

  if (error || !data) return null;
  return buildCompareCustomer(data);
}

function pickFirst<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

function toArray<T>(v: T | T[] | null | undefined): T[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

function mapToCompareItem(
  row: PropertyRow,
  pois: RecoPoiQueryRow[],
): OfferingCompareItem {
  const loc = pickFirst(row.property_locations);
  const spec = pickFirst(row.property_specs);
  const timeline = pickFirst(row.property_timeline);
  const unitTypes = toArray(row.property_unit_types);

  const publicUnits = unitTypes.filter(
    (u) => u.is_price_public !== false && u.is_public !== false,
  );

  // Price range (DB 원 단위)
  const prices = publicUnits
    .flatMap((u) => [u.price_min, u.price_max])
    .filter((p): p is number => p !== null && p > 0);
  const priceRange =
    prices.length > 0
      ? formatPriceRange(Math.min(...prices), Math.max(...prices))
      : "미정";

  // Price per pyeong (3.3㎡) — DB 원 단위 → 만원/평으로 변환
  const firstWithData = publicUnits.find(
    (u) => (u.price_min ?? u.price_max) !== null && u.exclusive_area,
  );
  const pricePerPyeong = firstWithData
    ? (() => {
        const priceWon = firstWithData.price_min ?? firstWithData.price_max ?? 0;
        const pyeong = (firstWithData.exclusive_area ?? 0) / 3.3058;
        if (!pyeong) return "미정";
        const manwonPerPyeong = Math.round(priceWon / pyeong / 10_000);
        return `3.3㎡당 ${formatManwonWithEok(manwonPerPyeong)}`;
      })()
    : "미정";

  // Floors
  const floorParts = [
    spec?.floor_underground ? `지하${spec.floor_underground}` : null,
    spec?.floor_ground ? `지상${spec.floor_ground}층` : null,
  ].filter(Boolean);
  const floors = floorParts.length > 0 ? floorParts.join(" / ") : "미정";

  // Parking
  const parking =
    spec?.parking_per_household != null
      ? `세대당 ${spec.parking_per_household}대`
      : "미정";

  // Status
  const raw = (row.status ?? "").trim().toUpperCase();
  const status: OfferingCompareItem["status"] =
    normalizeOfferingStatusValue(raw) ?? OFFERING_STATUS_VALUES[2];

  // Location
  const locationParts = [
    loc?.region_1depth,
    loc?.region_2depth,
    loc?.region_3depth,
  ].filter(Boolean);
  const location =
    locationParts.length > 0
      ? locationParts.join(" ")
      : (loc?.road_address ?? "위치 미정");

  // Unit types string
  const unitTypeStr =
    publicUnits
      .filter((u) => u.type_name)
      .map((u) => u.type_name!)
      .join(" · ") || "미정";

  // Nearest station
  const subwayPoi = pois.find((p) => p.category === "SUBWAY");
  const nearestStation = subwayPoi
    ? `${subwayPoi.name}${subwayPoi.distance_m != null ? ` (${Number(subwayPoi.distance_m)}m)` : ""}`
    : "정보 없음";

  // School grade
  const highSchoolDistances = pois
    .filter((p) => p.category === "SCHOOL" && p.school_level === "HIGH")
    .map((p) =>
      p.distance_m == null || !Number.isFinite(Number(p.distance_m))
        ? null
        : Number(p.distance_m),
    )
    .filter((distance): distance is number => distance !== null);
  const nearestHighSchoolDistance =
    highSchoolDistances.length > 0 ? Math.min(...highSchoolDistances) : null;
  const schoolGrade: "우수" | "보통" | "미흡" =
    nearestHighSchoolDistance == null
      ? "미흡"
      : nearestHighSchoolDistance <= 1000
        ? "우수"
        : "보통";

  // Image — 대표 이미지 우선, 없으면 갤러리 첫 번째
  const galleryImages = toArray(row.property_gallery_images);
  const imageUrl =
    row.image_url ||
    (galleryImages[0] as { image_url?: string | null } | undefined)?.image_url ||
    null;

  return {
    id: String(row.id),
    name: row.name,
    location,
    imageUrl,
    priceRange,
    pricePerPyeong,
    totalUnits: spec?.household_total ?? 0,
    unitTypes: unitTypeStr,
    floors,
    parking,
    status,
    announcementDate: timeline?.announcement_date ?? null,
    applicationStart: timeline?.application_start ?? null,
    applicationEnd: timeline?.application_end ?? null,
    winnerAnnounce: timeline?.winner_announce ?? null,
    contractStart: timeline?.contract_start ?? null,
    contractEnd: timeline?.contract_end ?? null,
    moveInDate: timeline?.move_in_date ?? null,
    moveInText: timeline?.move_in_text ?? null,
    nearestStation,
    commuteEstimate: null,
    schoolGrade,
    conditionResult: null,
    conditionCategories: null,
  };
}

export async function getOfferingsForCompare(
  ids: string[],
  viewerCustomer: FullCustomerInput | null = null,
): Promise<OfferingCompareItem[]> {
  if (!ids.length) return [];

  const numericIds = ids
    .map(Number)
    .filter((id) => Number.isFinite(id) && id > 0);
  if (!numericIds.length) return [];

  const supabase = await createSupabaseServer();
  const adminSupabase = viewerCustomer ? createAdminSupabase() : null;

  const [snapshotResult, poisResult] = await Promise.all([
    supabase
      .from("property_public_snapshots")
      .select("property_id, snapshot")
      .in("property_id", numericIds),
    supabase
      .from("property_reco_pois")
      .select("property_id, category, rank, name, distance_m, school_level")
      .in("property_id", numericIds)
      .order("rank", { ascending: true }),
  ]);

  const snapshots = snapshotResult.data ?? [];
  const allPois = (poisResult.data ?? []) as unknown as RecoPoiQueryRow[];

  // Group pois by property_id
  const poisByPropertyId = new Map<number, RecoPoiQueryRow[]>();
  for (const poi of allPois) {
    const key = Number(poi.property_id);
    const existing = poisByPropertyId.get(key) ?? [];
    existing.push(poi);
    poisByPropertyId.set(key, existing);
  }

  // Build snapshot map
  const snapshotMap = new Map<string, PropertyRow>(
    snapshots
      .filter((row) => row.snapshot && typeof row.snapshot === "object")
      .map((row) => [
        String(row.property_id),
        row.snapshot as unknown as PropertyRow,
      ]),
  );

  // Return in the requested order
  const items = await Promise.all(
    ids.map(async (id) => {
      const snapshot = snapshotMap.get(id);
      if (!snapshot) return null;
      const pois = poisByPropertyId.get(Number(id)) ?? [];
      const item = mapToCompareItem(snapshot, pois);

      if (viewerCustomer && adminSupabase) {
        const profile = await loadPropertyProfile({
          adminSupabase,
          propertyIdInput: id,
        });
        if (profile) {
          const timeline = pickFirst(snapshot.property_timeline);
          const evaluation = evaluateFullCondition({
            profile,
            customer: viewerCustomer,
            timingOverride: buildScheduleAwareTimingCategory({
              purchaseTiming: viewerCustomer.purchaseTiming,
              moveinTiming: viewerCustomer.moveinTiming,
              timeline: timeline
                ? {
                    announcementDate: timeline.announcement_date,
                    applicationStart: timeline.application_start,
                    applicationEnd: timeline.application_end,
                    contractStart: timeline.contract_start,
                    contractEnd: timeline.contract_end,
                    moveInDate: timeline.move_in_date,
                  }
                : null,
            }),
          });
          item.conditionResult = evaluation.finalGrade;
          item.conditionCategories = {
            cash: evaluation.categories.cash.grade,
            income: evaluation.categories.income.grade,
            ltvDsr: evaluation.categories.ltvDsr.grade,
            ownership: evaluation.categories.ownership.grade,
            purpose: evaluation.categories.purpose.grade,
            timing: evaluation.categories.timing.grade,
          };
        }
      }

      return item;
    }),
  );

  return items.filter((item): item is OfferingCompareItem => item !== null);
}

// 선택 드롭다운용 기본 현장 목록 (최근 발행 순)
export async function getAvailableOfferingsBasic(): Promise<
  { id: string; name: string; location: string }[]
> {
  const supabase = await createSupabaseServer();
  const { data } = await supabase
    .from("property_public_snapshots")
    .select("property_id, snapshot")
    .order("published_at", { ascending: false })
    .limit(50);

  if (!data) return [];

  return data
    .map((row) => {
      const snap = row.snapshot as unknown as PropertyRow | null;
      if (!snap || typeof snap !== "object") return null;
      const loc = Array.isArray(snap.property_locations)
        ? (snap.property_locations[0] ?? null)
        : (snap.property_locations ?? null);
      const locationParts = [
        loc?.region_1depth,
        loc?.region_2depth,
      ].filter(Boolean);
      return {
        id: String(row.property_id),
        name: snap.name ?? `현장 #${row.property_id}`,
        location:
          locationParts.length > 0
            ? locationParts.join(" ")
            : (loc?.road_address ?? "위치 미정"),
      };
    })
    .filter(
      (item): item is { id: string; name: string; location: string } =>
        item !== null,
    );
}
