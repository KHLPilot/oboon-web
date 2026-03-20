import { createClient } from "@supabase/supabase-js";
import { createSupabaseServer } from "@/lib/supabaseServer";
import type { PropertyRow } from "@/features/offerings/domain/offeringDetail.types";

type RecordValue = Record<string, unknown>;
type ServiceResult<T> = {
  data: T | null;
  error: Error | null;
};

const isRecord = (value: unknown): value is RecordValue =>
  typeof value === "object" && value !== null;

const isNullableString = (value: unknown): value is string | null =>
  value === null || typeof value === "string";

const isNullableNumber = (value: unknown): value is number | null =>
  value === null || (typeof value === "number" && Number.isFinite(value));

const isNullableNumberLike = (value: unknown) =>
  value === null ||
  (typeof value === "number" && Number.isFinite(value)) ||
  (typeof value === "string" &&
    value.trim().length > 0 &&
    Number.isFinite(Number(value)));

const isNullableStringArray = (value: unknown) =>
  value === null ||
  value === undefined ||
  (Array.isArray(value) && value.every((item) => typeof item === "string"));

const isLocationRow = (value: unknown) =>
  isRecord(value) &&
  isNullableString(value.road_address) &&
  isNullableString(value.jibun_address) &&
  isNullableString(value.region_1depth) &&
  isNullableString(value.region_2depth) &&
  isNullableString(value.region_3depth) &&
  isNullableNumber(value.lat) &&
  isNullableNumber(value.lng);

const isSpecRow = (value: unknown) =>
  isRecord(value) &&
  isNullableNumber(value.household_total) &&
  isNullableNumber(value.parking_total);

const isTimelineRow = (value: unknown) =>
  isRecord(value) &&
  isNullableString(value.announcement_date) &&
  isNullableString(value.application_start) &&
  isNullableString(value.application_end) &&
  isNullableString(value.winner_announce) &&
  isNullableString(value.contract_start) &&
  isNullableString(value.contract_end) &&
  isNullableString(value.move_in_date) &&
  (value.move_in_text === undefined || isNullableString(value.move_in_text));

const isFacilityRow = (value: unknown) =>
  isRecord(value) &&
  isNullableString(value.type) &&
  isNullableString(value.road_address) &&
  isNullableNumberLike(value.lat) &&
  isNullableNumberLike(value.lng) &&
  (value.is_active === undefined ||
    value.is_active === null ||
    typeof value.is_active === "boolean");

const isUnitTypeRow = (value: unknown) =>
  isRecord(value) &&
  typeof value.id === "number" &&
  isNullableString(value.type_name) &&
  isNullableNumber(value.price_min) &&
  isNullableNumber(value.price_max) &&
  (value.floor_plan_url === undefined || isNullableString(value.floor_plan_url));

const isRecoPoiCategory = (value: unknown) =>
  value === "HOSPITAL" ||
  value === "CLINIC_DAILY" ||
  value === "MART" ||
  value === "SUBWAY" ||
  value === "HIGH_SPEED_RAIL" ||
  value === "SCHOOL" ||
  value === "DEPARTMENT_STORE" ||
  value === "SHOPPING_MALL";

const isRecoSchoolLevel = (value: unknown) =>
  value === null ||
  value === undefined ||
  value === "ELEMENTARY" ||
  value === "MIDDLE" ||
  value === "HIGH" ||
  value === "UNIVERSITY" ||
  value === "OTHER";

const isRecoPoiRow = (value: unknown) =>
  isRecord(value) &&
  isRecoPoiCategory(value.category) &&
  typeof value.rank === "number" &&
  typeof value.kakao_place_id === "string" &&
  typeof value.name === "string" &&
  isNullableNumberLike(value.distance_m) &&
  isNullableString(value.category_name) &&
  isNullableStringArray(value.subway_lines) &&
  isRecoSchoolLevel(value.school_level);

const isRowOrArray = (value: unknown, guard: (input: unknown) => boolean) =>
  value === null ||
  guard(value) ||
  (Array.isArray(value) && value.every(guard));

const isPropertyRow = (value: unknown): value is PropertyRow =>
  isRecord(value) &&
  typeof value.id === "number" &&
  typeof value.created_at === "string" &&
  typeof value.name === "string" &&
  typeof value.property_type === "string" &&
  isNullableString(value.status) &&
  isNullableString(value.description) &&
  isNullableString(value.image_url) &&
  isNullableString(value.confirmed_comment) &&
  isNullableString(value.estimated_comment) &&
  isRowOrArray(value.property_locations, isLocationRow) &&
  isRowOrArray(value.property_specs, isSpecRow) &&
  isRowOrArray(value.property_timeline, isTimelineRow) &&
  isRowOrArray(value.property_unit_types, isUnitTypeRow);

function createOfferingAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    return null;
  }

  return createClient(url, serviceRoleKey);
}

export async function fetchOfferingDetail(
  id: number,
): Promise<PropertyRow | null> {
  const supabase = await createSupabaseServer();

  const { data: snapshotRow, error } = await supabase
    .from("property_public_snapshots")
    .select("snapshot")
    .eq("property_id", id)
    .maybeSingle();

  if (error || !snapshotRow?.snapshot) return null;
  if (!isPropertyRow(snapshotRow.snapshot)) return null;

  const base = snapshotRow.snapshot as PropertyRow;

  const { data: facilitiesRows } = await supabase
    .from("property_facilities")
    .select("id, type, road_address, lat, lng, is_active")
    .eq("properties_id", id)
    .order("created_at", { ascending: true });

  const propertyFacilities = Array.isArray(facilitiesRows)
    ? facilitiesRows.filter(isFacilityRow)
    : [];

  const { data: poiRows } = await supabase
    .from("property_reco_pois")
    .select(
      "category, rank, kakao_place_id, name, distance_m, category_name, subway_lines, school_level",
    )
    .eq("property_id", id)
    .order("category", { ascending: true })
    .order("rank", { ascending: true });

  const propertyRecoPois = Array.isArray(poiRows)
    ? poiRows.filter(isRecoPoiRow)
    : [];

  const { data: modelhouseImageRows } = await supabase
    .from("property_image_assets")
    .select("id, property_id, kind, image_url, sort_order, created_at")
    .eq("property_id", id)
    .eq("is_active", true)
    .in("kind", ["modelhouse_main", "modelhouse_gallery"])
    .order("created_at", { ascending: true });

  const propertyModelhouseImages = Array.isArray(modelhouseImageRows)
    ? modelhouseImageRows
        .filter((row): row is {
          id: string;
          property_id: number;
          kind: "modelhouse_main" | "modelhouse_gallery";
          image_url: string;
          sort_order: number | null;
          created_at: string;
        } => {
          if (!isRecord(row)) return false;
          if (typeof row.id !== "string") return false;
          if (typeof row.property_id !== "number") return false;
          if (
            row.kind !== "modelhouse_main" &&
            row.kind !== "modelhouse_gallery"
          ) {
            return false;
          }
          if (typeof row.image_url !== "string") return false;
          const validSortOrder =
            row.sort_order === null ||
            (typeof row.sort_order === "number" &&
              Number.isFinite(row.sort_order));
          if (!validSortOrder) return false;
          if (typeof row.created_at !== "string") return false;
          return true;
        })
        .sort((a, b) => {
          const rank = (kind: "modelhouse_main" | "modelhouse_gallery") =>
            kind === "modelhouse_main" ? 0 : 1;
          if (rank(a.kind) !== rank(b.kind)) return rank(a.kind) - rank(b.kind);
          if ((a.sort_order ?? 0) !== (b.sort_order ?? 0)) {
            return (a.sort_order ?? 0) - (b.sort_order ?? 0);
          }
          return a.created_at.localeCompare(b.created_at);
        })
    : [];

  return {
    ...base,
    property_facilities: propertyFacilities,
    property_reco_pois: propertyRecoPois,
    property_modelhouse_images: propertyModelhouseImages,
  } as PropertyRow;
}

// 해당 현장에 승인된 상담사가 있는지 확인
export async function hasApprovedAgent(propertyId: number): Promise<boolean> {
  const supabase = await createSupabaseServer();
  const { count, error } = await supabase
    .from("property_agents")
    .select("id", { count: "exact", head: true })
    .eq("property_id", propertyId)
    .eq("status", "approved");

  if (error) return false;
  return (count ?? 0) > 0;
}

export async function fetchOfferingViewSnapshot(
  propertyId: number,
): Promise<ServiceResult<{ property_id: number }>> {
  const supabase = createOfferingAdminClient();
  if (!supabase) {
    return {
      data: null,
      error: new Error("missing supabase env"),
    };
  }

  const { data, error } = await supabase
    .from("property_public_snapshots")
    .select("property_id")
    .eq("property_id", propertyId)
    .maybeSingle();

  return {
    data: (data as { property_id: number } | null) ?? null,
    error: error ? new Error(error.message) : null,
  };
}

export async function incrementOfferingViewCount(
  propertyId: number,
): Promise<ServiceResult<number>> {
  const supabase = createOfferingAdminClient();
  if (!supabase) {
    return {
      data: null,
      error: new Error("missing supabase env"),
    };
  }

  const { data, error } = await supabase.rpc(
    "increment_property_view_count",
    { p_property_id: propertyId },
  );

  return {
    data: typeof data === "number" ? data : null,
    error: error ? new Error(error.message) : null,
  };
}
