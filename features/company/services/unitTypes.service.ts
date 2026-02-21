import { createSupabaseClient } from "@/lib/supabaseClient";
import type { UnitDraft, UnitRow } from "@/features/company/domain/unit.types";

const SELECT_COLUMNS = `
  id, created_at, properties_id,
  type_name, exclusive_area, supply_area, rooms, bathrooms,
  building_layout, orientation,
  price_min, price_max, is_price_public, is_public, unit_count, supply_count,
  image_url
`;

function normalizeText(value?: string | null) {
  const trimmed = (value ?? "").trim();
  return trimmed ? trimmed : null;
}

function buildCreatePayload(
  propertyId: number,
  draft: UnitDraft,
): Omit<UnitDraft, "floor_plan_url"> {
  const rest = { ...draft };
  delete (rest as Partial<UnitDraft>).floor_plan_url;
  return {
    ...rest,
    properties_id: propertyId,
    type_name: normalizeText(draft.type_name),
    building_layout: normalizeText(draft.building_layout),
    orientation: normalizeText(draft.orientation),
    image_url: normalizeText(draft.image_url),
  };
}

function buildUpdatePayload(draft: UnitDraft): Partial<Omit<UnitRow, "floor_plan_url">> {
  return {
    type_name: normalizeText(draft.type_name),
    exclusive_area: draft.exclusive_area,
    supply_area: draft.supply_area,
    rooms: draft.rooms,
    bathrooms: draft.bathrooms,
    building_layout: normalizeText(draft.building_layout),
    orientation: normalizeText(draft.orientation),
    price_min: draft.price_min,
    price_max: draft.price_max,
    is_price_public: draft.is_price_public,
    is_public: draft.is_public,
    unit_count: draft.unit_count,
    supply_count: draft.supply_count,
    image_url: normalizeText(draft.image_url),
  };
}

async function fetchFloorPlanUrlMap(propertyId: number) {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("property_image_assets")
    .select("id, unit_type_id, image_url, sort_order, created_at")
    .eq("property_id", propertyId)
    .eq("kind", "floor_plan")
    .eq("is_active", true)
    .not("unit_type_id", "is", null)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw error;

  const map = new Map<number, string>();
  for (const row of data ?? []) {
    if (row.unit_type_id == null) continue;
    const url = normalizeText(row.image_url);
    if (!url) continue;
    if (!map.has(row.unit_type_id)) {
      map.set(row.unit_type_id, url);
    }
  }
  return map;
}

function patchFloorPlanUrls(
  rows: UnitRow[],
  floorPlanUrlMap: Map<number, string>,
): UnitRow[] {
  return rows.map((row) => {
    const floorPlanUrl = floorPlanUrlMap.get(row.id) ?? null;
    return {
      ...row,
      floor_plan_url: floorPlanUrl,
      image_url: floorPlanUrl ?? row.image_url,
    };
  });
}

async function syncFloorPlanAsset(
  propertyId: number,
  unitTypeId: number,
  floorPlanUrl: string | null,
) {
  const supabase = createSupabaseClient();
  const normalizedUrl = normalizeText(floorPlanUrl);

  if (!normalizedUrl) {
    const { error } = await supabase
      .from("property_image_assets")
      .update({ is_active: false })
      .eq("property_id", propertyId)
      .eq("kind", "floor_plan")
      .eq("unit_type_id", unitTypeId)
      .eq("is_active", true);
    if (error) throw error;
    return;
  }

  const { data: sameUrlActive, error: sameUrlError } = await supabase
    .from("property_image_assets")
    .select("id")
    .eq("property_id", propertyId)
    .eq("kind", "floor_plan")
    .eq("unit_type_id", unitTypeId)
    .eq("is_active", true)
    .eq("image_url", normalizedUrl)
    .limit(1);

  if (sameUrlError) throw sameUrlError;

  const { error: deactivateError } = await supabase
    .from("property_image_assets")
    .update({ is_active: false })
    .eq("property_id", propertyId)
    .eq("kind", "floor_plan")
    .eq("unit_type_id", unitTypeId)
    .eq("is_active", true)
    .neq("image_url", normalizedUrl);

  if (deactivateError) throw deactivateError;

  if ((sameUrlActive?.length ?? 0) > 0) {
    return;
  }

  const { error: insertError } = await supabase
    .from("property_image_assets")
    .insert({
      property_id: propertyId,
      unit_type_id: unitTypeId,
      kind: "floor_plan",
      image_url: normalizedUrl,
      is_active: true,
    });

  if (insertError) throw insertError;
}

export async function fetchUnitTypes(propertyId: number): Promise<UnitRow[]> {
  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from("property_unit_types")
    .select(SELECT_COLUMNS)
    .eq("properties_id", propertyId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  const rows = (data ?? []) as UnitRow[];
  const floorPlanUrlMap = await fetchFloorPlanUrlMap(propertyId);
  return patchFloorPlanUrls(rows, floorPlanUrlMap);
}

export async function createUnitType(
  propertyId: number,
  draft: UnitDraft,
): Promise<UnitRow> {
  const supabase = createSupabaseClient();
  const payload = buildCreatePayload(propertyId, draft);

  const { data, error } = await supabase
    .from("property_unit_types")
    .insert(payload)
    .select(SELECT_COLUMNS)
    .single();

  if (error) throw error;

  const created = data as UnitRow;
  await syncFloorPlanAsset(propertyId, created.id, draft.floor_plan_url);
  const floorPlanUrlMap = await fetchFloorPlanUrlMap(propertyId);
  return patchFloorPlanUrls([created], floorPlanUrlMap)[0];
}

export async function updateUnitType(
  id: number,
  draft: UnitDraft,
): Promise<UnitRow> {
  const supabase = createSupabaseClient();
  const payload = buildUpdatePayload(draft);

  const { data, error } = await supabase
    .from("property_unit_types")
    .update(payload)
    .eq("id", id)
    .select(SELECT_COLUMNS)
    .single();

  if (error) throw error;

  const updated = data as UnitRow;
  await syncFloorPlanAsset(updated.properties_id, updated.id, draft.floor_plan_url);
  const floorPlanUrlMap = await fetchFloorPlanUrlMap(updated.properties_id);
  return patchFloorPlanUrls([updated], floorPlanUrlMap)[0];
}

export async function deleteUnitType(id: number): Promise<void> {
  const supabase = createSupabaseClient();

  const { data: existingUnit, error: existingUnitError } = await supabase
    .from("property_unit_types")
    .select("id, properties_id")
    .eq("id", id)
    .maybeSingle();
  if (existingUnitError) throw existingUnitError;

  const { data, error } = await supabase
    .from("property_unit_types")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new Error("삭제 권한이 없거나 삭제할 평면 타입을 찾을 수 없습니다.");
  }

  if (existingUnit?.properties_id) {
    const { error: deactivateError } = await supabase
      .from("property_image_assets")
      .update({ is_active: false })
      .eq("property_id", existingUnit.properties_id)
      .eq("kind", "floor_plan")
      .eq("unit_type_id", id)
      .eq("is_active", true);
    if (deactivateError) throw deactivateError;
  }
}
