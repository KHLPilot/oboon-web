import { createSupabaseClient } from "@/lib/supabaseClient";

export type PropertyCreatePayload = {
  name: string;
  property_type: string | null;
  status: string | null;
  description: string | null;
  confirmed_comment: string | null;
  estimated_comment: string | null;
  created_by: string;
};

export async function createProperty(payload: PropertyCreatePayload) {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("properties")
    .insert(payload)
    .select("id")
    .single();
  return { data, error };
}

export async function updatePropertyImage(propertyId: number, url: string) {
  const supabase = createSupabaseClient();
  const { error: deactivateError } = await supabase
    .from("property_image_assets")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("property_id", propertyId)
    .eq("kind", "main")
    .eq("is_active", true);

  if (deactivateError) return { error: deactivateError };

  const { error: insertError } = await supabase
    .from("property_image_assets")
    .insert({
      property_id: propertyId,
      kind: "main",
      image_url: url,
      is_active: true,
      sort_order: 0,
    });

  return { error: insertError };
}
