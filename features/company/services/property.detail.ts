import { createSupabaseClient } from "@/lib/supabaseClient";

export async function fetchPropertyDetail(id: number) {
  const supabase = createSupabaseClient();
  return supabase
    .from("properties")
    .select(
      `
      *,
      property_locations(id),
      property_facilities(id),
      property_specs!properties_id(*),
      property_timeline(*),
      property_unit_types(id)
    `,
    )
    .eq("id", id)
    .single();
}

export async function updatePropertyBasicInfo(
  id: number,
  payload: Record<string, unknown>,
) {
  const supabase = createSupabaseClient();
  return supabase.from("properties").update(payload).eq("id", id).select("id").maybeSingle();
}

export async function deletePropertyCascade(id: number) {
  const supabase = createSupabaseClient();
  const tables = [
    "property_locations",
    "property_facilities",
    "property_specs",
    "property_timeline",
    "property_unit_types",
  ];

  for (const table of tables) {
    const { error } = await supabase.from(table).delete().eq("properties_id", id);
    if (error) {
      throw error;
    }
  }

  const { data, error } = await supabase
    .from("properties")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) {
    throw error;
  }
  if (!data) {
    throw new Error("삭제 권한이 없거나 삭제할 현장을 찾을 수 없습니다.");
  }
  return { data };
}
