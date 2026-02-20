import { createSupabaseClient } from "@/lib/supabaseClient";
import type { UnitDraft, UnitRow } from "@/features/company/domain/unit.types";

const SELECT_COLUMNS_WITH_FLOOR_PLAN = `
  id, created_at, properties_id,
  type_name, exclusive_area, supply_area, rooms, bathrooms,
  building_layout, orientation,
  price_min, price_max, is_price_public, is_public, unit_count, supply_count,
  floor_plan_url, image_url
`;

const SELECT_COLUMNS_WITHOUT_FLOOR_PLAN = `
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

function extractImageHashFromUrl(imageUrl: string | null | undefined) {
  if (!imageUrl) return null;
  const normalized = imageUrl.trim().toLowerCase();
  const match = normalized.match(/([a-f0-9]{64})/);
  return match?.[1] ?? null;
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

type SupabaseClientLike = ReturnType<typeof createSupabaseClient>;

async function fetchRawUnitRows(
  supabase: SupabaseClientLike,
  propertyId: number,
): Promise<UnitRow[]> {
  const withFloorPlan = await supabase
    .from("property_unit_types")
    .select(SELECT_COLUMNS_WITH_FLOOR_PLAN)
    .eq("properties_id", propertyId)
    .order("created_at", { ascending: true });

  if (!withFloorPlan.error) {
    return (withFloorPlan.data ?? []) as UnitRow[];
  }

  if (withFloorPlan.error.code !== "42703") throw withFloorPlan.error;

  const withoutFloorPlan = await supabase
    .from("property_unit_types")
    .select(SELECT_COLUMNS_WITHOUT_FLOOR_PLAN)
    .eq("properties_id", propertyId)
    .order("created_at", { ascending: true });
  if (withoutFloorPlan.error) throw withoutFloorPlan.error;

  return ((withoutFloorPlan.data ?? []) as Array<Omit<UnitRow, "floor_plan_url">>).map(
    (row) => ({
      ...row,
      floor_plan_url: null,
    }),
  );
}

async function fetchFloorPlanAssetMap(
  supabase: SupabaseClientLike,
  propertyId: number,
) {
  const { data, error } = await supabase
    .from("property_image_assets")
    .select("unit_type_id, image_url, updated_at, created_at")
    .eq("property_id", propertyId)
    .eq("kind", "floor_plan")
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    if (error.code === "42P01") return new Map<number, string>();
    throw error;
  }

  const map = new Map<number, string>();
  (data ?? []).forEach((row) => {
    if (typeof row.unit_type_id !== "number") return;
    if (!map.has(row.unit_type_id) && typeof row.image_url === "string") {
      map.set(row.unit_type_id, row.image_url);
    }
  });
  return map;
}

async function syncFloorPlanAsset(
  supabase: SupabaseClientLike,
  args: { propertyId: number; unitTypeId: number; floorPlanUrl: string | null },
) {
  const { propertyId, unitTypeId, floorPlanUrl } = args;
  const normalizedUrl = normalizeText(floorPlanUrl);

  const { data: activeAsset, error: activeAssetError } = await supabase
    .from("property_image_assets")
    .select("id, image_url")
    .eq("property_id", propertyId)
    .eq("kind", "floor_plan")
    .eq("unit_type_id", unitTypeId)
    .eq("is_active", true)
    .maybeSingle();

  if (activeAssetError) {
    if (activeAssetError.code === "42P01") return;
    throw activeAssetError;
  }

  if (!normalizedUrl) {
    if (activeAsset?.id) {
      const { error: deactivateError } = await supabase
        .from("property_image_assets")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("id", activeAsset.id);
      if (deactivateError && deactivateError.code !== "42P01") {
        throw deactivateError;
      }
    }
    return;
  }

  if (activeAsset?.image_url === normalizedUrl) return;

  if (activeAsset?.id) {
    const { error: deactivateError } = await supabase
      .from("property_image_assets")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", activeAsset.id);
    if (deactivateError && deactivateError.code !== "42P01") {
      throw deactivateError;
    }
  }

  const { error: insertError } = await supabase.from("property_image_assets").insert({
    property_id: propertyId,
    unit_type_id: unitTypeId,
    kind: "floor_plan",
    image_url: normalizedUrl,
    storage_path: null,
    image_hash: extractImageHashFromUrl(normalizedUrl),
    caption: null,
    sort_order: 0,
    is_active: true,
  });
  if (insertError && insertError.code !== "42P01") {
    throw insertError;
  }
}

export async function fetchUnitTypes(propertyId: number): Promise<UnitRow[]> {
  const supabase = createSupabaseClient();
  const [rows, floorPlanByUnitTypeId] = await Promise.all([
    fetchRawUnitRows(supabase, propertyId),
    fetchFloorPlanAssetMap(supabase, propertyId),
  ]);

  return rows.map((row) => {
    const assetFloorPlan = floorPlanByUnitTypeId.get(row.id) ?? null;
    if (!assetFloorPlan) return row;
    return {
      ...row,
      floor_plan_url: assetFloorPlan,
      image_url: assetFloorPlan,
    };
  });
}

export async function createUnitType(
  propertyId: number,
  draft: UnitDraft,
): Promise<UnitRow> {
  const supabase = createSupabaseClient();
  const payload = buildCreatePayload(propertyId, draft);

  const insertWithFloorPlan = await supabase
    .from("property_unit_types")
    .insert(payload)
    .select(SELECT_COLUMNS_WITH_FLOOR_PLAN)
    .single();

  let created: UnitRow;
  if (!insertWithFloorPlan.error) {
    created = insertWithFloorPlan.data as UnitRow;
  } else if (insertWithFloorPlan.error.code === "42703") {
    const fallbackPayload = { ...payload };
    Reflect.deleteProperty(fallbackPayload, "floor_plan_url");
    const insertWithoutFloorPlan = await supabase
      .from("property_unit_types")
      .insert(fallbackPayload)
      .select(SELECT_COLUMNS_WITHOUT_FLOOR_PLAN)
      .single();
    if (insertWithoutFloorPlan.error) throw insertWithoutFloorPlan.error;
    created = {
      ...(insertWithoutFloorPlan.data as Omit<UnitRow, "floor_plan_url">),
      floor_plan_url: null,
    };
  } else {
    throw insertWithFloorPlan.error;
  }

  await syncFloorPlanAsset(supabase, {
    propertyId: created.properties_id,
    unitTypeId: created.id,
    floorPlanUrl: payload.floor_plan_url ?? null,
  });

  const syncedFloorPlan = normalizeText(payload.floor_plan_url) ?? created.floor_plan_url;
  if (!syncedFloorPlan) return created;
  return {
    ...created,
    floor_plan_url: syncedFloorPlan,
    image_url: syncedFloorPlan,
  };
}

export async function updateUnitType(
  id: number,
  draft: UnitDraft,
): Promise<UnitRow> {
  const supabase = createSupabaseClient();
  const payload = buildUpdatePayload(draft);

  const updateWithFloorPlan = await supabase
    .from("property_unit_types")
    .update(payload)
    .eq("id", id)
    .select(SELECT_COLUMNS_WITH_FLOOR_PLAN)
    .single();

  let updated: UnitRow;
  if (!updateWithFloorPlan.error) {
    updated = updateWithFloorPlan.data as UnitRow;
  } else if (updateWithFloorPlan.error.code === "42703") {
    const fallbackPayload = { ...payload };
    Reflect.deleteProperty(fallbackPayload, "floor_plan_url");
    const updateWithoutFloorPlan = await supabase
      .from("property_unit_types")
      .update(fallbackPayload)
      .eq("id", id)
      .select(SELECT_COLUMNS_WITHOUT_FLOOR_PLAN)
      .single();
    if (updateWithoutFloorPlan.error) throw updateWithoutFloorPlan.error;
    updated = {
      ...(updateWithoutFloorPlan.data as Omit<UnitRow, "floor_plan_url">),
      floor_plan_url: null,
    };
  } else {
    throw updateWithFloorPlan.error;
  }

  await syncFloorPlanAsset(supabase, {
    propertyId: updated.properties_id,
    unitTypeId: updated.id,
    floorPlanUrl: payload.floor_plan_url ?? null,
  });

  const syncedFloorPlan = normalizeText(payload.floor_plan_url) ?? null;
  if (!syncedFloorPlan) {
    return {
      ...updated,
      floor_plan_url: null,
      image_url: updated.image_url ?? null,
    };
  }
  return {
    ...updated,
    floor_plan_url: syncedFloorPlan,
    image_url: syncedFloorPlan,
  };
}

export async function deleteUnitType(id: number): Promise<void> {
  const supabase = createSupabaseClient();

  const { error } = await supabase
    .from("property_unit_types")
    .delete()
    .eq("id", id);

  if (error) throw error;
}
