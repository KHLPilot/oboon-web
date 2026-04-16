// features/offerings/services/offering.compare.ts
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServer } from "@/lib/supabaseServer";
import { evaluateFullCondition } from "@/features/condition-validation/domain/fullCustomerEvaluator";
import type {
  EmploymentType,
  FullEvaluationResponse,
  FullCustomerInput,
  FullPurchasePurpose,
  MonthlyLoanRepayment,
  MoveinTiming,
  PurchaseTiming,
} from "@/features/condition-validation/domain/types";
import {
  loadPropertyProfile,
  loadUnitValidationProfiles,
} from "@/features/condition-validation/server/profile-resolver";
import {
  buildRawUnitTypeValidationResults,
  buildTimingContext,
  calculateCashThresholds,
} from "@/features/condition-validation/server/unitTypeValidationResults";
import {
  ltvInternalScoreFromCreditGrade as sharedLtvInternalScoreFromCreditGrade,
} from "@/features/condition-validation/domain/conditionState";
import { buildFullConditionCategoryDisplay } from "@/features/offerings/components/detail/conditionValidationDisplay";
import {
  normalizeOfferingStatusValue,
  OFFERING_STATUS_VALUES,
} from "@/features/offerings/domain/offering.constants";
import { normalizeRecommendationUnitTypes } from "@/features/recommendations/lib/recommendationUnitTypes";
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

type FamousZoneInfo = { name: string; shortLabel: string; tier: number };

async function fetchAcademyCount(lat: number, lng: number): Promise<number | null> {
  const kakaoApiKey = process.env.KAKAO_REST_API_KEY;
  if (!kakaoApiKey) return null;
  try {
    const query = new URLSearchParams({
      category_group_code: "AC5",
      x: String(lng),
      y: String(lat),
      radius: "1000",
      size: "1",
    });
    const res = await fetch(
      `https://dapi.kakao.com/v2/local/search/category.json?${query}`,
      {
        headers: { Authorization: `KakaoAK ${kakaoApiKey}` },
        next: { revalidate: 60 * 60 * 24 },
      },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { meta?: { total_count?: number } };
    return data.meta?.total_count ?? null;
  } catch {
    return null;
  }
}

function mapToCompareItem(
  row: PropertyRow,
  pois: RecoPoiQueryRow[],
  famousZone: FamousZoneInfo | null = null,
  academyCount: number | null = null,
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

  // School grade — 옵션 A: 유명 학군 우선, 학원 수 보완, 고등학교 거리 fallback
  const schoolGrade: "우수" | "보통" | "미흡" = (() => {
    // 유명 학군 Tier 1, 2 → 무조건 우수
    if (famousZone && famousZone.tier <= 2) return "우수";

    // 유명 학군 Tier 3 → 학원 50개+ 우수, 미만 보통
    if (famousZone && famousZone.tier === 3) {
      return (academyCount ?? 0) >= 50 ? "우수" : "보통";
    }

    // 유명 학군 없음 → 학원 수 기반
    if (academyCount != null) {
      if (academyCount >= 100) return "우수";
      if (academyCount >= 50) return "보통";
      return "미흡";
    }

    // fallback: 고등학교 POI 거리 (좌표 없거나 카카오 API 실패 시)
    const highSchoolDistances = pois
      .filter((p) => p.category === "SCHOOL" && p.school_level === "HIGH")
      .map((p) =>
        p.distance_m == null || !Number.isFinite(Number(p.distance_m))
          ? null
          : Number(p.distance_m),
      )
      .filter((d): d is number => d !== null);
    const nearest =
      highSchoolDistances.length > 0 ? Math.min(...highSchoolDistances) : null;
    return nearest == null ? "미흡" : nearest <= 1000 ? "우수" : "보통";
  })();

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
    siteLat: loc?.lat != null ? Number(loc.lat) : null,
    siteLng: loc?.lng != null ? Number(loc.lng) : null,
    commuteEstimate: null,
    schoolGrade,
    famousZone,
    academyCount,
    conditionResult: null,
    conditionCategories: null,
    unitTypeResults: null,
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

  const [snapshotResult, poisResult, famousZonesResult] = await Promise.all([
    supabase
      .from("property_public_snapshots")
      .select("property_id, snapshot")
      .in("property_id", numericIds),
    supabase
      .from("property_reco_pois")
      .select("property_id, category, rank, name, distance_m, school_level")
      .in("property_id", numericIds)
      .order("rank", { ascending: true }),
    supabase
      .from("famous_school_zones")
      .select("name, short_label, tier, match_keys")
      .order("tier", { ascending: true }),
  ]);

  const snapshots = snapshotResult.data ?? [];
  const allPois = (poisResult.data ?? []) as unknown as RecoPoiQueryRow[];
  const allFamousZones = (famousZonesResult.data ?? []) as {
    name: string;
    short_label: string;
    tier: number;
    match_keys: string[];
  }[];

  // Group pois by property_id
  const poisByPropertyId = new Map<number, RecoPoiQueryRow[]>();
  for (const poi of allPois) {
    const key = Number(poi.property_id);
    const existing = poisByPropertyId.get(key) ?? [];
    existing.push(poi);
    poisByPropertyId.set(key, existing);
  }

  // Build location key → famous zone map (tier ASC already ordered)
  const famousZoneByLocationKey = new Map<string, FamousZoneInfo>();
  for (const zone of allFamousZones) {
    for (const key of zone.match_keys) {
      if (!famousZoneByLocationKey.has(key)) {
        famousZoneByLocationKey.set(key, {
          name: zone.name,
          shortLabel: zone.short_label,
          tier: zone.tier,
        });
      }
    }
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
      const loc = pickFirst(snapshot.property_locations);
      const locationKey =
        loc?.region_2depth && loc?.region_3depth
          ? `${loc.region_2depth}|${loc.region_3depth}`
          : null;
      const famousZone = locationKey
        ? (famousZoneByLocationKey.get(locationKey) ?? null)
        : null;
      const lat = loc?.lat != null ? Number(loc.lat) : null;
      const lng = loc?.lng != null ? Number(loc.lng) : null;
      const academyCount =
        lat != null && lng != null ? await fetchAcademyCount(lat, lng) : null;
      const item = mapToCompareItem(snapshot, pois, famousZone, academyCount);

      if (viewerCustomer && adminSupabase) {
        const profile = await loadPropertyProfile({
          adminSupabase,
          propertyIdInput: id,
        });
        if (profile) {
          const timeline = pickFirst(snapshot.property_timeline);
          const timingContext = buildTimingContext({
            customer: viewerCustomer,
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
          });
          const { timingOverride, timingMonthsDiff } = timingContext;
          const evaluation = evaluateFullCondition({
            profile,
            customer: viewerCustomer,
            timingOverride,
          });
          item.conditionResult = evaluation.finalGrade;
          const cashThresholds = calculateCashThresholds({
            assetType: profile.assetType,
            listPrice: profile.listPrice,
            contractRatio: profile.contractRatio,
          });
          const monthlyBurdenPercent =
            viewerCustomer.monthlyIncome > 0
              ? Math.round((evaluation.metrics.monthlyPaymentEst / viewerCustomer.monthlyIncome) * 100)
              : null;
          const unitTypes = toArray(snapshot.property_unit_types);
          const isPricePublic = unitTypes.some(
            (unit) => unit.is_price_public !== false && unit.is_public !== false,
          );
          const displayItems = buildFullConditionCategoryDisplay({
            categories: {
              cash: {
                grade: evaluation.categories.cash.grade,
                score: evaluation.categories.cash.score,
                max_score: evaluation.categories.cash.maxScore,
                reason: evaluation.categories.cash.reasonMessage,
              },
              income: {
                grade: evaluation.categories.income.grade,
                score: evaluation.categories.income.score,
                max_score: evaluation.categories.income.maxScore,
                reason: evaluation.categories.income.reasonMessage,
              },
              ltv_dsr: {
                grade: evaluation.categories.ltvDsr.grade,
                score: evaluation.categories.ltvDsr.score,
                max_score: evaluation.categories.ltvDsr.maxScore,
                reason: evaluation.categories.ltvDsr.reasonMessage,
              },
              ownership: {
                grade: evaluation.categories.ownership.grade,
                score: evaluation.categories.ownership.score,
                max_score: evaluation.categories.ownership.maxScore,
                reason: evaluation.categories.ownership.reasonMessage,
              },
              purpose: {
                grade: evaluation.categories.purpose.grade,
                score: evaluation.categories.purpose.score,
                max_score: evaluation.categories.purpose.maxScore,
                reason: evaluation.categories.purpose.reasonMessage,
              },
              timing: {
                grade: evaluation.categories.timing.grade,
                score: evaluation.categories.timing.score,
                max_score: evaluation.categories.timing.maxScore,
                reason: evaluation.categories.timing.reasonMessage,
              },
            } satisfies FullEvaluationResponse["categories"],
            metrics: {
              contract_amount: Math.round(cashThresholds.contractAmount),
              min_cash: Math.round(cashThresholds.minCash),
              recommended_cash: Math.round(cashThresholds.recommendedCash),
              loan_amount: Math.round(evaluation.metrics.loanAmount),
              monthly_payment_est: Math.round(evaluation.metrics.monthlyPaymentEst),
              monthly_surplus: viewerCustomer.monthlyIncome - viewerCustomer.monthlyExpenses,
              monthly_burden_percent: monthlyBurdenPercent,
              dsr_percent: evaluation.metrics.dsrPercent,
              timing_months_diff: timingMonthsDiff,
            } satisfies FullEvaluationResponse["metrics"],
            inputs: {
              availableCash: viewerCustomer.availableCash,
              monthlyIncome: viewerCustomer.monthlyIncome,
              employmentType: viewerCustomer.employmentType,
              houseOwnership: viewerCustomer.houseOwnership,
              purchasePurpose: viewerCustomer.purchasePurpose,
            },
            isPricePublic,
          });
          const reasonByKey = new Map(displayItems.map((item) => [item.key, item.reason]));

          item.conditionCategories = {
            cash: {
              grade: evaluation.categories.cash.grade,
              reasonMessage: reasonByKey.get("cash") ?? evaluation.categories.cash.reasonMessage,
            },
            income: {
              grade: evaluation.categories.income.grade,
              reasonMessage: reasonByKey.get("income") ?? evaluation.categories.income.reasonMessage,
            },
            ltvDsr: {
              grade: evaluation.categories.ltvDsr.grade,
              reasonMessage: reasonByKey.get("ltv_dsr") ?? evaluation.categories.ltvDsr.reasonMessage,
            },
            ownership: {
              grade: evaluation.categories.ownership.grade,
              reasonMessage: reasonByKey.get("ownership") ?? evaluation.categories.ownership.reasonMessage,
            },
            purpose: {
              grade: evaluation.categories.purpose.grade,
              reasonMessage: reasonByKey.get("purpose") ?? evaluation.categories.purpose.reasonMessage,
            },
            timing: {
              grade: evaluation.categories.timing.grade,
              reasonMessage: reasonByKey.get("timing") ?? evaluation.categories.timing.reasonMessage,
            },
          };

          const resolvedPropertyId =
            profile.matchedPropertyId != null
              ? String(profile.matchedPropertyId)
              : id;
          const unitProfiles = await loadUnitValidationProfiles({
            adminSupabase,
            propertyId: resolvedPropertyId,
          });
          item.unitTypeResults = normalizeRecommendationUnitTypes({
            unit_type_results: buildRawUnitTypeValidationResults({
              profile,
              customer: viewerCustomer,
              unitProfiles,
              timingOverride,
              timingMonthsDiff,
            }),
          });
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
