import { createSupabaseClient } from "@/lib/supabaseClient";

export async function fetchPropertyTimeline(propertyId: number) {
  const supabase = createSupabaseClient();
  return supabase
    .from("property_timeline")
    .select("*")
    .eq("properties_id", propertyId)
    .maybeSingle();
}

export async function savePropertyTimeline(
  propertyId: number,
  payload: Record<string, unknown>,
  timelineId?: number | null,
) {
  const supabase = createSupabaseClient();
  if (timelineId) {
    return supabase
      .from("property_timeline")
      .update(payload)
      .eq("id", timelineId)
      .select("id")
      .maybeSingle();
  }
  return supabase
    .from("property_timeline")
    .insert({
      ...payload,
      properties_id: propertyId,
    })
    .select("id")
    .single();
}
