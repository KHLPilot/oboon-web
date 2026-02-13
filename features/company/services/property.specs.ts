import { createSupabaseClient } from "@/lib/supabaseClient";

export async function fetchPropertyUnitTypes(propertyId: number) {
  const supabase = createSupabaseClient();
  return supabase
    .from("property_unit_types")
    .select("unit_count")
    .eq("properties_id", propertyId);
}

export async function fetchPropertySpecs(propertyId: number) {
  const supabase = createSupabaseClient();
  return supabase
    .from("property_specs")
    .select("*")
    .eq("properties_id", propertyId)
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();
}

export async function upsertPropertySpecs(payload: Record<string, unknown>) {
  const supabase = createSupabaseClient();
  return supabase
    .from("property_specs")
    .upsert(payload, {
      onConflict: "properties_id",
    })
    .select("id")
    .maybeSingle();
}
