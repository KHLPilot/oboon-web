import { createClient } from "@supabase/supabase-js";

type PropertyLocationRow = {
  lat: number | null;
  lng: number | null;
  road_address: string | null;
  jibun_address: string | null;
  region_1depth: string | null;
  region_2depth: string | null;
  region_3depth: string | null;
};

type PropertyUnitTypeRow = {
  price_min: number | string | null;
  price_max: number | string | null;
};

type PropertyRow = {
  id: number;
  name: string | null;
  status: string | null;
  property_locations?: PropertyLocationRow[] | null;
  property_unit_types?: PropertyUnitTypeRow[] | null;
};

type PropertyImageAssetRow = {
  property_id: number;
  image_url: string | null;
  sort_order: number | null;
  created_at: string | null;
};

export type MapRouteItem = PropertyRow & {
  image_url: string | null;
};

function createPublicSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) return null;

  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function normalizeUrl(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export async function fetchMapItemsRouteData(): Promise<MapRouteItem[]> {
  const supabase = createPublicSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("properties")
    .select(
      `
        id,
        name,
        status,
        property_locations (
          lat,
          lng,
          road_address,
          jibun_address,
          region_1depth,
          region_2depth,
          region_3depth
        ),
        property_unit_types (
          price_min,
          price_max
        )
      `
    )
    .order("id", { ascending: false })
    .limit(200);

  if (error || !data) {
    return [];
  }

  const propertyIds = data.map((row) => row.id);
  const { data: mainAssets } = propertyIds.length
    ? await supabase
        .from("property_image_assets")
        .select("property_id, image_url, sort_order, created_at")
        .in("property_id", propertyIds)
        .eq("kind", "main")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true })
    : { data: [] };

  const mainImageMap = new Map<number, string>();
  for (const row of (mainAssets ?? []) as PropertyImageAssetRow[]) {
    const imageUrl = normalizeUrl(row.image_url);
    if (!imageUrl) continue;
    if (!mainImageMap.has(row.property_id)) {
      mainImageMap.set(row.property_id, imageUrl);
    }
  }

  return ((data ?? []) as PropertyRow[]).map((row) => ({
    ...row,
    image_url: mainImageMap.get(row.id) ?? null,
  }));
}
