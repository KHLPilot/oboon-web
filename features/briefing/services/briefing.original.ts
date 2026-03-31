import { AppError, ERR, createSupabaseServiceError } from "@/lib/errors";
import { createSupabaseServer } from "@/lib/supabaseServer";
import { isMissingCoverImageUrlError } from "@/features/briefing/services/briefing.schema";

type TagRelation = {
  id: string;
  key: string;
  name: string;
};

type SeriesItem = {
  id: string;
  key: string;
  name: string;
  coverImageUrl: string | null;
  count: number;
  tags: { id: string; key: string; name: string }[];
};

type TagItem = {
  id: string;
  key: string;
  name: string;
};

function pickFirst<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export async function fetchOboonOriginalPageData(): Promise<{
  series: SeriesItem[];
  tags: TagItem[];
}> {
  const supabase = await createSupabaseServer();

  const { data: board, error: boardError } = await supabase
    .from("briefing_boards")
    .select("id,key")
    .eq("key", "oboon_original")
    .maybeSingle();

  if (boardError) {
    throw createSupabaseServiceError(boardError, {
      scope: "briefing.original",
      action: "fetchOboonOriginalPageData.board",
      defaultMessage: "브리핑 게시판 조회 중 오류가 발생했습니다.",
    });
  }
  if (!board?.id) {
    throw new AppError(ERR.NOT_FOUND, "브리핑 게시판을 찾을 수 없습니다.", 404);
  }

  const boardId = board.id as string;

  const [categoriesResult, tagsResult, categoryTagsResult] = await Promise.all([
    supabase
      .from("briefing_categories")
      .select("id,key,name,cover_image_url")
      .eq("board_id", boardId)
      .eq("is_active", true)
      .order("name", { ascending: true }),
    supabase
      .from("briefing_tags")
      .select("id,key,name")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("briefing_category_tags")
      .select("category_id, tag:briefing_tags(id,key,name)"),
  ]);

  let categories = categoriesResult.data ?? [];
  if (categoriesResult.error) {
    if (isMissingCoverImageUrlError(categoriesResult.error)) {
      const fallbackResult = await supabase
        .from("briefing_categories")
        .select("id,key,name")
        .eq("board_id", boardId)
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (fallbackResult.error) {
        throw createSupabaseServiceError(fallbackResult.error, {
          scope: "briefing.original",
          action: "fetchOboonOriginalPageData.categories",
          defaultMessage: "브리핑 카테고리 조회 중 오류가 발생했습니다.",
        });
      }

      categories = (fallbackResult.data ?? []).map((category) => ({
        ...category,
        cover_image_url: null,
      }));
    } else {
      throw createSupabaseServiceError(categoriesResult.error, {
        scope: "briefing.original",
        action: "fetchOboonOriginalPageData.categories",
        defaultMessage: "브리핑 카테고리 조회 중 오류가 발생했습니다.",
      });
    }
  }
  if (tagsResult.error) {
    throw createSupabaseServiceError(tagsResult.error, {
      scope: "briefing.original",
      action: "fetchOboonOriginalPageData.tags",
      defaultMessage: "브리핑 태그 조회 중 오류가 발생했습니다.",
    });
  }
  if (categoryTagsResult.error) {
    throw createSupabaseServiceError(categoryTagsResult.error, {
      scope: "briefing.original",
      action: "fetchOboonOriginalPageData.categoryTags",
      defaultMessage: "브리핑 카테고리 태그 조회 중 오류가 발생했습니다.",
    });
  }

  const categoryIds = categories.map((item) => item.id);
  const countMap = new Map<string, number>();

  if (categoryIds.length > 0) {
    const { data: countRows, error: countErr } = await supabase
      .from("briefing_posts")
      .select("category_id")
      .eq("board_id", boardId)
      .eq("status", "published")
      .in("category_id", categoryIds);

    if (countErr) {
      throw createSupabaseServiceError(countErr, {
        scope: "briefing.original",
        action: "fetchOboonOriginalPageData.counts",
        defaultMessage: "브리핑 아티클 수 조회 중 오류가 발생했습니다.",
      });
    }

    (countRows ?? []).forEach((row) => {
      const id = (row?.category_id ?? null) as string | null;
      if (!id) return;
      countMap.set(id, (countMap.get(id) ?? 0) + 1);
    });
  }

  const tagsByCategoryId = new Map<string, TagItem[]>();
  (categoryTagsResult.data ?? []).forEach((row) => {
    const categoryId = (row?.category_id ?? null) as string | null;
    const tag = pickFirst(row?.tag as TagRelation | TagRelation[] | null);
    if (!categoryId || !tag?.id || !tag?.key || !tag?.name) return;

    const current = tagsByCategoryId.get(categoryId) ?? [];
    current.push({ id: tag.id, key: tag.key, name: tag.name });
    tagsByCategoryId.set(categoryId, current);
  });

  const series: SeriesItem[] = categories.map((category) => ({
    id: category.id as string,
    key: category.key as string,
    name: category.name as string,
    coverImageUrl: (category as { cover_image_url?: string | null }).cover_image_url ?? null,
    count: countMap.get(category.id as string) ?? 0,
    tags: tagsByCategoryId.get(category.id as string) ?? [],
  }));

  const tags: TagItem[] = (tagsResult.data ?? []).map((tag) => ({
    id: tag.id as string,
    key: tag.key as string,
    name: tag.name as string,
  }));

  return { series, tags };
}
