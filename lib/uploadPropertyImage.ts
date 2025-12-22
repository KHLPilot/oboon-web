import { createSupabaseClient } from "@/lib/supabaseClient";

export async function uploadPropertyImage(
  file: File,
  propertyId: number
) {
  const supabase = createSupabaseClient();

  const ext = file.name.split(".").pop();
  const filePath = `properties/${propertyId}/main.${ext}`;

  const { error } = await supabase.storage
    .from("property-images")
    .upload(filePath, file, { upsert: true });

  if (error) throw error;

  const { data } = supabase.storage
    .from("property-images")
    .getPublicUrl(filePath);

  return data.publicUrl;
}