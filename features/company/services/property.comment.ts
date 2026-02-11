import { createSupabaseClient } from "@/lib/supabaseClient";

export async function fetchPropertyComments(propertyId: number) {
  const supabase = createSupabaseClient();
  return supabase
    .from("properties")
    .select("confirmed_comment, estimated_comment")
    .eq("id", propertyId)
    .maybeSingle();
}

export async function updatePropertyComments(
  propertyId: number,
  payload: Record<string, string | null>,
) {
  const supabase = createSupabaseClient();
  return supabase.from("properties").update(payload).eq("id", propertyId);
}
