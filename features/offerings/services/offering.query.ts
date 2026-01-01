// features/offerings/services/offering.query.ts
import type { SupabaseClient } from "@supabase/supabase-js";

export async function fetchPropertiesForOfferings(
  supabase: SupabaseClient,
  opts?: { limit?: number }
) {
  const limit = opts?.limit ?? 24;

  return await supabase
    .from("properties")
    .select(
      `
      id,
      created_at,
      name,
      status,
      property_type,
      image_url,
      confirmed_comment,
      estimated_comment,
      pending_comment,
      property_locations (
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
    .order("created_at", { ascending: false })
    .limit(limit);
}
