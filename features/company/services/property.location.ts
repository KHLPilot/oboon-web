import { createSupabaseClient } from "@/lib/supabaseClient";

export async function fetchPropertyLocation(propertyId: number) {
  const supabase = createSupabaseClient();
  return supabase
    .from("property_locations")
    .select("*")
    .eq("properties_id", propertyId)
    .single();
}

export async function savePropertyLocation(
  propertyId: number,
  payload: Record<string, unknown>,
  isEdit: boolean,
) {
  const supabase = createSupabaseClient();
  if (isEdit) {
    return supabase
      .from("property_locations")
      .update(payload)
      .eq("properties_id", propertyId);
  }
  return supabase.from("property_locations").insert({
    ...payload,
    properties_id: propertyId,
  });
}
