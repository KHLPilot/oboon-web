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
  payload: Record<string, unknown>,
  id?: number,
) {
  const supabase = createSupabaseClient();
  if (id) {
    return supabase
      .from("property_facilities")
      .update(payload)
      .eq("id", id)
      .select("id")
      .maybeSingle();
  }
  return supabase.from("property_facilities").insert(payload).select("id").single();
}

export async function deletePropertyFacility(id: number) {
  const supabase = createSupabaseClient();
  return supabase.from("property_facilities").delete().eq("id", id).select("id").maybeSingle();
}
