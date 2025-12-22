import { createSupabaseClient } from "@/lib/supabaseClient";

export async function uploadPropertyImage(
  file: File,
  propertyId: number
) {
  const supabase = createSupabaseClient();

  const ext = file.name.split(".").pop();

  const filePath = `properties/${propertyId}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("property-images")
    .upload(filePath, file, {
      upsert: false,
      cacheControl: "3600",
    });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage
    .from("property-images")
    .getPublicUrl(filePath);

  return data.publicUrl;
}
