import { createSupabaseClient } from "@/lib/supabaseClient";
import type { UnitDraft, UnitRow } from "@/features/company/domain/unit.types";

const SELECT_COLUMNS = `
  id, created_at, properties_id,
  type_name, exclusive_area, supply_area, rooms, bathrooms,
  building_layout, orientation,
  price_min, price_max, is_price_public, is_public, unit_count, supply_count,
  floor_plan_url, image_url
`;

function normalizeText(value?: string | null) {
  const trimmed = (value ?? "").trim();
  return trimmed ? trimmed : null;
}

function buildCreatePayload(propertyId: number, draft: UnitDraft): UnitDraft {
  return {
    ...draft,
    properties_id: propertyId,
    type_name: normalizeText(draft.type_name),
    building_layout: normalizeText(draft.building_layout),
    orientation: normalizeText(draft.orientation),
    floor_plan_url: normalizeText(draft.floor_plan_url),
  };
}

function buildUpdatePayload(draft: UnitDraft): Partial<UnitRow> {
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
    floor_plan_url: normalizeText(draft.floor_plan_url),
  };
}

export async function fetchUnitTypes(propertyId: number): Promise<UnitRow[]> {
  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from("property_unit_types")
    .select(SELECT_COLUMNS)
    .eq("properties_id", propertyId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as UnitRow[];
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
  return data as UnitRow;
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
  return data as UnitRow;
}

export async function deleteUnitType(id: number): Promise<void> {
  const supabase = createSupabaseClient();

  const { error } = await supabase
    .from("property_unit_types")
    .delete()
    .eq("id", id);

  if (error) throw error;
}
