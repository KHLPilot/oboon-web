import { createSupabaseServer } from "@/lib/supabaseServer";
import type { PropertyRow } from "@/features/offerings/components/detail/OfferingDetailLeft";

type RecordValue = Record<string, unknown>;

const isRecord = (value: unknown): value is RecordValue =>
  typeof value === "object" && value !== null;

const isNullableString = (value: unknown): value is string | null =>
  value === null || typeof value === "string";

const isNullableNumber = (value: unknown): value is number | null =>
  value === null || (typeof value === "number" && Number.isFinite(value));

const isNullableNumberLike = (value: unknown) =>
  value === null ||
  (typeof value === "number" && Number.isFinite(value)) ||
  (typeof value === "string" && value.trim().length > 0 && Number.isFinite(Number(value)));

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
  isNullableString(value.move_in_date);

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
  isNullableString(value.image_url);

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

type PropertyImageAssetRow = {
  id: string;
  unit_type_id: number | null;
  kind: "main" | "gallery" | "floor_plan";
  image_url: string;
  sort_order: number | null;
  created_at: string;
  is_active: boolean;
};

export async function fetchOfferingDetail(
  id: number
): Promise<PropertyRow | null> {
  const supabase = createSupabaseServer();

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

  const { data: imageAssetRows, error: imageAssetsError } = await supabase
    .from("property_image_assets")
    .select(
      "id, unit_type_id, kind, image_url, sort_order, created_at, is_active",
    )
    .eq("property_id", id)
    .eq("is_active", true)
    .order("kind", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  const assets: PropertyImageAssetRow[] =
    !imageAssetsError &&
    Array.isArray(imageAssetRows)
      ? (imageAssetRows as PropertyImageAssetRow[]).filter(
          (row) =>
            row &&
            typeof row.image_url === "string" &&
            row.image_url.trim().length > 0 &&
            (row.kind === "main" ||
              row.kind === "gallery" ||
              row.kind === "floor_plan"),
        )
      : [];

  const mainAsset = assets.find((row) => row.kind === "main");
  const galleryAssets = assets.filter((row) => row.kind === "gallery");
  const floorPlanAssets = assets.filter(
    (row) => row.kind === "floor_plan" && typeof row.unit_type_id === "number",
  );

  const unitTypes = Array.isArray(base.property_unit_types)
    ? base.property_unit_types
    : base.property_unit_types
      ? [base.property_unit_types]
      : [];
  const floorPlanUrlsByUnitTypeId = new Map<number, string[]>();
  floorPlanAssets.forEach((row) => {
    if (typeof row.unit_type_id !== "number") return;
    const current = floorPlanUrlsByUnitTypeId.get(row.unit_type_id) ?? [];
    current.push(row.image_url);
    floorPlanUrlsByUnitTypeId.set(row.unit_type_id, current);
  });
  const patchedUnitTypes = unitTypes.map((unit) => {
    const floorPlans = floorPlanUrlsByUnitTypeId.get(unit.id) ?? [];
    const floorPlan = floorPlans[0];
    if (!floorPlan) return unit;
    return {
      ...unit,
      floor_plan_url: floorPlan,
      image_url: floorPlan,
      floor_plan_urls: floorPlans,
    };
  });

  const galleryFromAssets =
    galleryAssets.length > 0
      ? galleryAssets.map((row, index) => ({
          id: row.id,
          property_id: id,
          image_url: row.image_url,
          sort_order: row.sort_order ?? index,
          created_at: row.created_at,
        }))
      : base.property_gallery_images ?? null;

  return {
    ...base,
    image_url: mainAsset?.image_url ?? base.image_url,
    property_unit_types: patchedUnitTypes,
    property_gallery_images: galleryFromAssets,
    property_facilities: propertyFacilities,
  } as PropertyRow;
}

// 해당 현장에 승인된 상담사가 있는지 확인
export async function hasApprovedAgent(propertyId: number): Promise<boolean> {
  const supabase = createSupabaseServer();
  const { count, error } = await supabase
    .from("property_agents")
    .select("id", { count: "exact", head: true })
    .eq("property_id", propertyId)
    .eq("status", "approved");

  if (error) return false;
  return (count ?? 0) > 0;
}
