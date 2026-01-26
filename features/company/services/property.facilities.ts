import { createSupabaseClient } from "@/lib/supabaseClient";

export async function fetchPropertyFacilities(propertyId: number) {
  const supabase = createSupabaseClient();
  return supabase
    .from("property_facilities")
    .select("*")
    .eq("properties_id", propertyId)
    .order("created_at", { ascending: true });
}

export async function savePropertyFacility(
  payload: Record<string, any>,
  id?: number,
) {
  const supabase = createSupabaseClient();
  if (id) {
    return supabase.from("property_facilities").update(payload).eq("id", id);
  }
  return supabase.from("property_facilities").insert(payload);
}

export async function deletePropertyFacility(id: number) {
  const supabase = createSupabaseClient();
  return supabase.from("property_facilities").delete().eq("id", id);
}
