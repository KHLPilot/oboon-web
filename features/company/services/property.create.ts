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
  const { error } = await supabase
    .from("properties")
    .update({ image_url: url })
    .eq("id", propertyId);
  return { error };
}
