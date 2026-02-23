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

export async function updatePropertyImage(
  propertyId: number,
  url: string | null,
) {
  const supabase = createSupabaseClient();
  const trimmedUrl = typeof url === "string" ? url.trim() : "";

  if (!trimmedUrl) {
    const deactivateResult = await supabase
      .from("property_image_assets")
      .update({ is_active: false })
      .eq("property_id", propertyId)
      .eq("kind", "main")
      .eq("is_active", true);
    return { data: deactivateResult.data ?? null, error: deactivateResult.error };
  }

  const deactivateResult = await supabase
    .from("property_image_assets")
    .update({ is_active: false })
    .eq("property_id", propertyId)
    .eq("kind", "main")
    .eq("is_active", true)
    .neq("image_url", trimmedUrl);

  if (deactivateResult.error) {
    return { data: null, error: deactivateResult.error };
  }

  const publicBaseUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL?.replace(/\/+$/, "");
  const storagePath =
    publicBaseUrl && trimmedUrl.startsWith(`${publicBaseUrl}/`)
      ? trimmedUrl.slice(publicBaseUrl.length + 1)
      : null;

  const candidatePayloads: Array<Record<string, unknown>> = [
    {
      property_id: propertyId,
      kind: "main",
      unit_type_id: null,
      storage_path: storagePath,
      image_url: trimmedUrl,
      sort_order: 0,
      caption: null,
      image_hash: null,
      is_active: true,
    },
    {
      property_id: propertyId,
      kind: "main",
      unit_type_id: null,
      storage_path: storagePath,
      image_url: trimmedUrl,
      sort_order: 0,
      caption: null,
      is_active: true,
    },
    {
      property_id: propertyId,
      kind: "main",
      unit_type_id: null,
      image_url: trimmedUrl,
      is_active: true,
    },
  ];

  let lastError: unknown = null;

  for (const payload of candidatePayloads) {
    const insertResult = await supabase
      .from("property_image_assets")
      .insert(payload)
      .select("id")
      .single();

    if (!insertResult.error) {
      return { data: insertResult.data, error: null };
    }

    if (insertResult.error.code !== "42703") {
      return { data: null, error: insertResult.error };
    }

    lastError = insertResult.error;
  }

  return { data: null, error: lastError };
}
