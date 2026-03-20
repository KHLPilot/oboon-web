import { createSupabaseServer } from "@/lib/supabaseServer";

const TABLE_NAME = "profile_gallery_images";

type ServiceResult<T> = {
  data: T | null;
  error: Error | null;
};

function toErrorMessage(error: { code?: string; message?: string } | null) {
  if (!error) return null;
  const code = error.code ? `${error.code}: ` : "";
  return new Error(`${code}${error.message ?? "unknown_error"}`);
}

export async function fetchProfileGalleryImages(userId: string) {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("id, user_id, storage_path, image_url, sort_order, caption, created_at")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  return {
    data:
      (data as Array<{
        id: string;
        user_id: string;
        storage_path: string | null;
        image_url: string | null;
        sort_order: number;
        caption: string | null;
        created_at: string;
      }> | null) ?? null,
    error: toErrorMessage(error),
  };
}

export async function fetchProfileGallerySortRows(userId: string) {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("id, sort_order")
    .eq("user_id", userId);

  return {
    data:
      (data as Array<{ id: string; sort_order: number }> | null) ?? null,
    error: toErrorMessage(error),
  } as ServiceResult<Array<{ id: string; sort_order: number }>>;
}

export async function insertProfileGalleryRows(
  rows: Array<{
    user_id: string;
    storage_path: string;
    image_url: string;
    sort_order: number;
    caption: string | null;
  }>,
) {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .insert(rows)
    .select("id, user_id, storage_path, image_url, sort_order, caption, created_at")
    .order("sort_order", { ascending: true });

  return {
    data:
      (data as Array<{
        id: string;
        user_id: string;
        storage_path: string | null;
        image_url: string | null;
        sort_order: number;
        caption: string | null;
        created_at: string;
      }> | null) ?? null,
    error: toErrorMessage(error),
  };
}

export async function fetchOwnedProfileGalleryRows(
  userId: string,
  ids: string[],
) {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("id")
    .eq("user_id", userId)
    .in("id", ids);

  return {
    data: (data as Array<{ id: string }> | null) ?? null,
    error: toErrorMessage(error),
  } as ServiceResult<Array<{ id: string }>>;
}

export async function updateProfileGalleryRow(
  userId: string,
  input: { id: string; sort_order: number; caption: string | null },
) {
  const supabase = await createSupabaseServer();
  const { error } = await supabase
    .from(TABLE_NAME)
    .update({
      sort_order: input.sort_order,
      caption: input.caption,
    })
    .eq("id", input.id)
    .eq("user_id", userId);

  return {
    data: error ? null : { success: true },
    error: toErrorMessage(error),
  };
}

export async function fetchProfileGalleryDeleteRows(
  userId: string,
  ids: string[],
) {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("id, storage_path")
    .eq("user_id", userId)
    .in("id", ids);

  return {
    data:
      (data as Array<{ id: string; storage_path: string | null }> | null) ??
      null,
    error: toErrorMessage(error),
  } as ServiceResult<Array<{ id: string; storage_path: string | null }>>;
}

export async function deleteProfileGalleryRows(
  userId: string,
  ids: string[],
) {
  const supabase = await createSupabaseServer();
  const { error } = await supabase
    .from(TABLE_NAME)
    .delete()
    .eq("user_id", userId)
    .in("id", ids);

  return {
    data: error ? null : { success: true },
    error: toErrorMessage(error),
  };
}
