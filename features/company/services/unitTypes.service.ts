import type { UnitDraft, UnitRow } from "@/features/company/domain/unit.types";
import { AppError, ERR, createSupabaseServiceError } from "@/lib/errors";
import { createServiceBrowserClient } from "@/lib/services/supabase-browser";

const SELECT_COLUMNS = `
  id, created_at, properties_id,
  type_name, exclusive_area, supply_area, rooms, bathrooms,
  building_layout, orientation,
  price_min, price_max, is_price_public, is_public, unit_count, supply_count,
  sort_order
`;

function toUnitTypesError(
  action: string,
  error: { code?: string | null; hint?: string | null; message?: string | null } | null,
  context?: Record<string, string | number | boolean | null | undefined>,
) {
  return createSupabaseServiceError(error, {
    scope: "unitTypes.service",
    action,
    defaultMessage: "평면 타입 처리 중 오류가 발생했습니다.",
    context,
  });
}

function normalizeText(value?: string | null) {
  const trimmed = (value ?? "").trim();
  return trimmed ? trimmed : null;
}

function parseFloorPlanUrls(
  floorPlanUrl: string | null | undefined,
  imageUrl: string | null | undefined,
) {
  const urls: string[] = [];
  const primary = normalizeText(floorPlanUrl);
  if (primary) urls.push(primary);

  const rawImage = normalizeText(imageUrl);
  if (rawImage) {
    if (rawImage.startsWith("[")) {
      try {
        const parsed = JSON.parse(rawImage);
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (typeof item !== "string") continue;
            const u = normalizeText(item);
            if (u) urls.push(u);
          }
        } else {
          urls.push(rawImage);
        }
      } catch {
        urls.push(rawImage);
      }
    } else {
      urls.push(rawImage);
    }
  }

  return Array.from(new Set(urls));
}

function buildCreatePayload(
  propertyId: number,
  draft: UnitDraft,
): Omit<UnitDraft, "floor_plan_url" | "image_url"> {
  const rest = { ...draft };
  delete (rest as Partial<UnitDraft>).floor_plan_url;
  delete (rest as Partial<UnitDraft>).image_url;
  return {
    ...rest,
    properties_id: propertyId,
    type_name: normalizeText(draft.type_name),
    building_layout: normalizeText(draft.building_layout),
    orientation: normalizeText(draft.orientation),
    sort_order: draft.sort_order ?? 0,
  };
}

function buildUpdatePayload(
  draft: UnitDraft,
): Partial<Omit<UnitRow, "floor_plan_url" | "image_url">> {
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
    sort_order: draft.sort_order ?? 0,
  };
}

async function fetchFloorPlanUrlsMap(propertyId: number) {
  const supabase = createServiceBrowserClient();
  const { data, error } = await supabase
    .from("property_image_assets")
    .select("id, unit_type_id, image_url, sort_order, updated_at, created_at")
    .eq("property_id", propertyId)
    .eq("kind", "floor_plan")
    .eq("is_active", true)
    .not("unit_type_id", "is", null)
    .order("sort_order", { ascending: true })
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) {
    throw toUnitTypesError("fetchFloorPlanUrlsMap", error, { propertyId });
  }

  const map = new Map<number, string[]>();
  for (const row of data ?? []) {
    if (row.unit_type_id == null) continue;
    const url = normalizeText(row.image_url);
    if (!url) continue;
    const existing = map.get(row.unit_type_id) ?? [];
    if (!existing.includes(url)) existing.push(url);
    map.set(row.unit_type_id, existing);
  }
  return map;
}

function patchFloorPlanUrls(
  rows: UnitRow[],
  floorPlanUrlsMap: Map<number, string[]>,
): UnitRow[] {
  return rows.map((row) => {
    const urls = floorPlanUrlsMap.get(row.id) ?? [];
    const floorPlanUrl = urls[0] ?? null;
    return {
      ...row,
      floor_plan_url: floorPlanUrl,
      image_url: urls.length > 0 ? JSON.stringify(urls) : null,
    };
  });
}

async function syncFloorPlanAssets(
  propertyId: number,
  unitTypeId: number,
  draft: UnitDraft,
) {
  const supabase = createServiceBrowserClient();
  const targetUrls = parseFloorPlanUrls(draft.floor_plan_url, draft.image_url);

  if (targetUrls.length === 0) {
    const { error } = await supabase
      .from("property_image_assets")
      .update({ is_active: false })
      .eq("property_id", propertyId)
      .eq("kind", "floor_plan")
      .eq("unit_type_id", unitTypeId)
      .eq("is_active", true);
    if (error) {
      throw toUnitTypesError("syncFloorPlanAssets", error, {
        propertyId,
        unitTypeId,
      });
    }
    return;
  }

  const { data: activeRows, error: activeRowsError } = await supabase
    .from("property_image_assets")
    .select("id, image_url")
    .eq("property_id", propertyId)
    .eq("kind", "floor_plan")
    .eq("unit_type_id", unitTypeId)
    .eq("is_active", true);

  if (activeRowsError) {
    throw toUnitTypesError("syncFloorPlanAssets", activeRowsError, {
      propertyId,
      unitTypeId,
    });
  }

  const activeUrlSet = new Set(
    (activeRows ?? [])
      .map((row) => normalizeText(row.image_url))
      .filter((url): url is string => Boolean(url)),
  );

  const deactivateUrls = [...activeUrlSet].filter((url) => !targetUrls.includes(url));
  if (deactivateUrls.length > 0) {
    const { error: deactivateError } = await supabase
      .from("property_image_assets")
      .update({ is_active: false })
      .eq("property_id", propertyId)
      .eq("kind", "floor_plan")
      .eq("unit_type_id", unitTypeId)
      .eq("is_active", true)
      .in("image_url", deactivateUrls);
    if (deactivateError) {
      throw toUnitTypesError("syncFloorPlanAssets", deactivateError, {
        propertyId,
        unitTypeId,
      });
    }
  }

  const insertUrls = targetUrls.filter((url) => !activeUrlSet.has(url));
  if (insertUrls.length > 0) {
    const { error: insertError } = await supabase
      .from("property_image_assets")
      .insert(
        insertUrls.map((url) => ({
          property_id: propertyId,
          unit_type_id: unitTypeId,
          kind: "floor_plan",
          image_url: url,
          is_active: true,
        })),
      );
    if (insertError) {
      throw toUnitTypesError("syncFloorPlanAssets", insertError, {
        propertyId,
        unitTypeId,
      });
    }
  }
}

export async function fetchUnitTypes(propertyId: number): Promise<UnitRow[]> {
  const supabase = createServiceBrowserClient();

  const { data, error } = await supabase
    .from("property_unit_types")
    .select(SELECT_COLUMNS)
    .eq("properties_id", propertyId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw toUnitTypesError("fetchUnitTypes", error, { propertyId });
  }
  const rows = ((data ?? []) as Array<Omit<UnitRow, "floor_plan_url" | "image_url">>).map((row) => ({
    ...row,
    floor_plan_url: null,
    image_url: null,
  }));
  const floorPlanUrlsMap = await fetchFloorPlanUrlsMap(propertyId);
  return patchFloorPlanUrls(rows, floorPlanUrlsMap);
}

export async function fetchUnitTypePriceRanges(propertyId: number) {
  const supabase = createServiceBrowserClient();
  const { data, error } = await supabase
    .from("property_unit_types")
    .select("price_min, price_max")
    .eq("properties_id", propertyId);

  return {
    data:
      (data as Array<{ price_min: number | null; price_max: number | null }> | null) ??
      null,
    error: toUnitTypesError("fetchUnitTypePriceRanges", error, { propertyId }),
  };
}

export async function createUnitType(
  propertyId: number,
  draft: UnitDraft,
): Promise<UnitRow> {
  const supabase = createServiceBrowserClient();
  const payload = buildCreatePayload(propertyId, draft);

  const { data, error } = await supabase
    .from("property_unit_types")
    .insert(payload)
    .select(SELECT_COLUMNS)
    .single();

  if (error) {
    throw toUnitTypesError("createUnitType", error, { propertyId });
  }

  const created = {
    ...(data as Omit<UnitRow, "floor_plan_url" | "image_url">),
    floor_plan_url: null,
    image_url: null,
  } as UnitRow;
  await syncFloorPlanAssets(propertyId, created.id, draft);
  const floorPlanUrlsMap = await fetchFloorPlanUrlsMap(propertyId);
  return patchFloorPlanUrls([created], floorPlanUrlsMap)[0];
}

export async function updateUnitType(
  id: number,
  draft: UnitDraft,
): Promise<UnitRow> {
  const supabase = createServiceBrowserClient();
  const payload = buildUpdatePayload(draft);

  const { data, error } = await supabase
    .from("property_unit_types")
    .update(payload)
    .eq("id", id)
    .select(SELECT_COLUMNS)
    .single();

  if (error) {
    throw toUnitTypesError("updateUnitType", error, { unitTypeId: id });
  }

  const updated = {
    ...(data as Omit<UnitRow, "floor_plan_url" | "image_url">),
    floor_plan_url: null,
    image_url: null,
  } as UnitRow;
  await syncFloorPlanAssets(updated.properties_id, updated.id, draft);
  const floorPlanUrlsMap = await fetchFloorPlanUrlsMap(updated.properties_id);
  return patchFloorPlanUrls([updated], floorPlanUrlsMap)[0];
}

export async function deleteUnitType(id: number): Promise<void> {
  const supabase = createServiceBrowserClient();

  const { data: existingUnit, error: existingUnitError } = await supabase
    .from("property_unit_types")
    .select("id, properties_id")
    .eq("id", id)
    .maybeSingle();
  if (existingUnitError) {
    throw toUnitTypesError("deleteUnitType", existingUnitError, {
      unitTypeId: id,
    });
  }

  const { data, error } = await supabase
    .from("property_unit_types")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    throw toUnitTypesError("deleteUnitType", error, { unitTypeId: id });
  }
  if (!data) {
    throw new AppError(
      ERR.NOT_FOUND,
      "삭제 권한이 없거나 삭제할 평면 타입을 찾을 수 없습니다.",
      404,
    );
  }

  if (existingUnit?.properties_id) {
    const { error: deactivateError } = await supabase
      .from("property_image_assets")
      .update({ is_active: false })
      .eq("property_id", existingUnit.properties_id)
      .eq("kind", "floor_plan")
      .eq("unit_type_id", id)
      .eq("is_active", true);
    if (deactivateError) {
      throw toUnitTypesError("deleteUnitType", deactivateError, {
        unitTypeId: id,
        propertyId: existingUnit.properties_id,
      });
    }
  }
}
