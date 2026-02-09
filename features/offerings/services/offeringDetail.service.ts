import { createSupabaseServer } from "@/lib/supabaseServer";
import type { PropertyRow } from "@/features/offerings/components/detail/OfferingDetailLeft";

const DETAIL_SELECT = `
  id, created_at, name, property_type, status, description, image_url,
  confirmed_comment, estimated_comment, pending_comment,
  property_locations ( road_address, jibun_address, lat, lng, region_1depth, region_2depth, region_3depth ),
  property_specs ( id, properties_id, sale_type, trust_company, site_area, building_area, building_coverage_ratio,
    floor_ground, floor_underground, building_count, household_total, parking_total, parking_per_household,
    heating_type, amenities, builder, developer, floor_area_ratio),
  property_timeline ( id, properties_id, announcement_date, application_start, application_end, winner_announce,
    contract_start, contract_end, move_in_date ),
  property_unit_types ( id, properties_id, type_name, exclusive_area, supply_area, rooms, bathrooms, building_layout, orientation,
    price_min, price_max, unit_count, image_url, supply_count, floor_plan_url )
`.trim();

type RecordValue = Record<string, unknown>;

const isRecord = (value: unknown): value is RecordValue =>
  typeof value === "object" && value !== null;

const isNullableString = (value: unknown): value is string | null =>
  value === null || typeof value === "string";

const isNullableNumber = (value: unknown): value is number | null =>
  value === null || (typeof value === "number" && Number.isFinite(value));

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
  isNullableString(value.pending_comment) &&
  isRowOrArray(value.property_locations, isLocationRow) &&
  isRowOrArray(value.property_specs, isSpecRow) &&
  isRowOrArray(value.property_timeline, isTimelineRow) &&
  isRowOrArray(value.property_unit_types, isUnitTypeRow);

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

  return snapshotRow.snapshot;
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
