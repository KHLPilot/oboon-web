import { createSupabaseServer } from "@/lib/supabaseServer";
import { ERR, ServiceResult, createSupabaseServiceError } from "@/lib/errors";

const TABLE_NAME = "property_image_assets";
const GALLERY_KIND = "gallery";

export async function fetchPropertyGalleryProfileRole(userId: string) {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  return {
    data: (data as { role: string | null } | null) ?? null,
    error: createSupabaseServiceError(error, {
      scope: "property.gallery",
      action: "fetchPropertyGalleryProfileRole",
      defaultMessage: "프로필 조회 중 오류가 발생했습니다.",
      context: { userId },
      codeMap: {
        PGRST116: {
          code: ERR.NOT_FOUND,
          clientMessage: "프로필을 찾을 수 없습니다.",
          statusHint: 404,
        },
      },
    }),
  } as ServiceResult<{ role: string | null }>;
}

export async function fetchPropertyGalleryProperty(propertyId: number) {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("properties")
    .select("created_by")
    .eq("id", propertyId)
    .single();

  return {
    data: (data as { created_by: string | null } | null) ?? null,
    error: createSupabaseServiceError(error, {
      scope: "property.gallery",
      action: "fetchPropertyGalleryProperty",
      defaultMessage: "현장 조회 중 오류가 발생했습니다.",
      context: { propertyId },
      codeMap: {
        PGRST116: {
          code: ERR.NOT_FOUND,
          clientMessage: "현장을 찾을 수 없습니다.",
          statusHint: 404,
        },
      },
    }),
  } as ServiceResult<{ created_by: string | null }>;
}

export async function fetchPropertyGalleryMembership(
  propertyId: number,
  agentId: string,
) {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("property_agents")
    .select("id")
    .eq("property_id", propertyId)
    .eq("agent_id", agentId)
    .eq("status", "approved")
    .limit(1);

  return {
    data: (data as Array<{ id: string }> | null) ?? null,
    error: createSupabaseServiceError(error, {
      scope: "property.gallery",
      action: "fetchPropertyGalleryMembership",
      defaultMessage: "소속 정보 조회 중 오류가 발생했습니다.",
      context: { propertyId, agentId },
    }),
  } as ServiceResult<Array<{ id: string }>>;
}

export async function fetchPropertyGalleryImages(propertyId: number) {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("id, property_id, storage_path, image_url, sort_order, caption, created_at")
    .eq("property_id", propertyId)
    .eq("kind", GALLERY_KIND)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  return {
    data:
      (data as Array<{
        id: string;
        property_id: number;
        storage_path: string | null;
        image_url: string | null;
        sort_order: number;
        caption: string | null;
        created_at: string;
      }> | null) ?? null,
    error: createSupabaseServiceError(error, {
      scope: "property.gallery",
      action: "fetchPropertyGalleryImages",
      defaultMessage: "추가 사진 조회 중 오류가 발생했습니다.",
      context: { propertyId },
    }),
  };
}

export async function fetchPropertyGallerySortRows(propertyId: number) {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("id, sort_order")
    .eq("property_id", propertyId)
    .eq("kind", GALLERY_KIND)
    .eq("is_active", true);

  return {
    data:
      (data as Array<{ id: string; sort_order: number }> | null) ?? null,
    error: createSupabaseServiceError(error, {
      scope: "property.gallery",
      action: "fetchPropertyGallerySortRows",
      defaultMessage: "추가 사진 정렬 조회 중 오류가 발생했습니다.",
      context: { propertyId },
    }),
  } as ServiceResult<Array<{ id: string; sort_order: number }>>;
}

export async function insertPropertyGalleryRows(
  rows: Array<{
    property_id: number;
    kind: string;
    storage_path: string;
    image_url: string;
    sort_order: number;
    caption: string | null;
    is_active: boolean;
  }>,
) {
  const supabase = await createSupabaseServer();
  const { error } = await supabase.from(TABLE_NAME).insert(rows);

  return {
    data: error ? null : { success: true },
    error: createSupabaseServiceError(error, {
      scope: "property.gallery",
      action: "insertPropertyGalleryRows",
      defaultMessage: "추가 사진 저장 중 오류가 발생했습니다.",
      context: { rowCount: rows.length },
    }),
  };
}

export async function fetchPropertyGalleryExistingRows(
  propertyId: number,
  ids: string[],
) {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("id")
    .eq("property_id", propertyId)
    .eq("kind", GALLERY_KIND)
    .eq("is_active", true)
    .in("id", ids);

  return {
    data: (data as Array<{ id: string }> | null) ?? null,
    error: createSupabaseServiceError(error, {
      scope: "property.gallery",
      action: "fetchPropertyGalleryExistingRows",
      defaultMessage: "추가 사진 확인 중 오류가 발생했습니다.",
      context: { propertyId, imageCount: ids.length },
    }),
  } as ServiceResult<Array<{ id: string }>>;
}

export async function updatePropertyGalleryRow(
  propertyId: number,
  imageId: string,
  input: { sort_order: number; caption: string | null },
) {
  const supabase = await createSupabaseServer();
  const { error } = await supabase
    .from(TABLE_NAME)
    .update({
      sort_order: input.sort_order,
      caption: input.caption,
    })
    .eq("id", imageId)
    .eq("property_id", propertyId)
    .eq("kind", GALLERY_KIND)
    .eq("is_active", true);

  return {
    data: error ? null : { success: true },
    error: createSupabaseServiceError(error, {
      scope: "property.gallery",
      action: "updatePropertyGalleryRow",
      defaultMessage: "추가 사진 수정 중 오류가 발생했습니다.",
      context: { propertyId, imageId },
    }),
  };
}

export async function fetchPropertyGalleryTarget(
  propertyId: number,
  imageId: string,
) {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("id, storage_path")
    .eq("id", imageId)
    .eq("property_id", propertyId)
    .eq("kind", GALLERY_KIND)
    .eq("is_active", true)
    .maybeSingle();

  return {
    data:
      (data as { id: string; storage_path: string | null } | null) ?? null,
    error: createSupabaseServiceError(error, {
      scope: "property.gallery",
      action: "fetchPropertyGalleryTarget",
      defaultMessage: "사진 조회 중 오류가 발생했습니다.",
      context: { propertyId, imageId },
    }),
  } as ServiceResult<{ id: string; storage_path: string | null }>;
}

export async function softDeletePropertyGalleryImage(
  propertyId: number,
  imageId: string,
) {
  const supabase = await createSupabaseServer();
  const { error } = await supabase
    .from(TABLE_NAME)
    .update({ is_active: false })
    .eq("id", imageId)
    .eq("property_id", propertyId)
    .eq("kind", GALLERY_KIND)
    .eq("is_active", true);

  return {
    data: error ? null : { success: true },
    error: createSupabaseServiceError(error, {
      scope: "property.gallery",
      action: "softDeletePropertyGalleryImage",
      defaultMessage: "사진 삭제 중 오류가 발생했습니다.",
      context: { propertyId, imageId },
    }),
  };
}
