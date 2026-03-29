import { createSupabaseServer } from "@/lib/supabaseServer";
import { ServiceResult, createSupabaseServiceError } from "@/lib/errors";

const TABLE_NAME = "profile_gallery_images";

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
    error: createSupabaseServiceError(error, {
      scope: "profile.gallery",
      action: "fetchProfileGalleryImages",
      defaultMessage: "갤러리 조회 중 오류가 발생했습니다.",
      context: { userId },
    }),
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
    error: createSupabaseServiceError(error, {
      scope: "profile.gallery",
      action: "fetchProfileGallerySortRows",
      defaultMessage: "갤러리 정렬 조회 중 오류가 발생했습니다.",
      context: { userId },
    }),
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
    error: createSupabaseServiceError(error, {
      scope: "profile.gallery",
      action: "insertProfileGalleryRows",
      defaultMessage: "갤러리 저장 중 오류가 발생했습니다.",
      context: { rowCount: rows.length },
    }),
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
    error: createSupabaseServiceError(error, {
      scope: "profile.gallery",
      action: "fetchOwnedProfileGalleryRows",
      defaultMessage: "갤러리 소유권 확인 중 오류가 발생했습니다.",
      context: { userId, imageCount: ids.length },
    }),
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
    error: createSupabaseServiceError(error, {
      scope: "profile.gallery",
      action: "updateProfileGalleryRow",
      defaultMessage: "갤러리 수정 중 오류가 발생했습니다.",
      context: { userId, imageId: input.id },
    }),
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
    error: createSupabaseServiceError(error, {
      scope: "profile.gallery",
      action: "fetchProfileGalleryDeleteRows",
      defaultMessage: "삭제 대상 조회 중 오류가 발생했습니다.",
      context: { userId, imageCount: ids.length },
    }),
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
    error: createSupabaseServiceError(error, {
      scope: "profile.gallery",
      action: "deleteProfileGalleryRows",
      defaultMessage: "갤러리 삭제 중 오류가 발생했습니다.",
      context: { userId, imageCount: ids.length },
    }),
  };
}
