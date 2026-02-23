import { createSupabaseClient } from "@/lib/supabaseClient";

export async function fetchPropertyDetail(id: number) {
  const supabase = createSupabaseClient();
  const propertyResult = await supabase
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

  if (propertyResult.error || !propertyResult.data) {
    return propertyResult;
  }

  const mainImageResult = await supabase
    .from("property_image_assets")
    .select("image_url")
    .eq("property_id", id)
    .eq("kind", "main")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const mainImageUrl =
    typeof mainImageResult.data?.image_url === "string" &&
    mainImageResult.data.image_url.trim().length > 0
      ? mainImageResult.data.image_url.trim()
      : null;

  return {
    data: {
      ...propertyResult.data,
      image_url: mainImageUrl,
    },
    error: propertyResult.error,
  };
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
