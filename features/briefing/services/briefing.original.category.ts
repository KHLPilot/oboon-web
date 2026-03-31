import { createSupabaseServer } from "@/lib/supabaseServer";
import { AppError, ERR, createSupabaseServiceError } from "@/lib/errors";

export const BRIEFING_CATEGORY_PAGE_SIZE = 8;

export async function fetchOboonOriginalCategoryPageData(categoryKey: string, page = 1) {
  const supabase = await createSupabaseServer();
  const pageSize = BRIEFING_CATEGORY_PAGE_SIZE;
  const offset = (Math.max(1, page) - 1) * pageSize;

  const { data: board, error: boardErr } = await supabase
    .from("briefing_boards")
    .select("id,key")
    .eq("key", "oboon_original")
    .maybeSingle();

  if (boardErr) {
    throw createSupabaseServiceError(boardErr, {
      scope: "briefing.original.category",
      action: "fetchOboonOriginalCategoryPageData.board",
      defaultMessage: "브리핑 게시판 조회 중 오류가 발생했습니다.",
    });
  }
  if (!board?.id) {
    throw new AppError(
      ERR.NOT_FOUND,
      "브리핑 게시판을 찾을 수 없습니다.",
      404,
    );
  }

  const { data: cat, error: catErr } = await supabase
    .from("briefing_categories")
    .select("id,key,name,description,color,cover_image_url")
    .eq("board_id", board.id)
    .eq("key", categoryKey)
    .maybeSingle();

  if (catErr) {
    throw createSupabaseServiceError(catErr, {
      scope: "briefing.original.category",
      action: "fetchOboonOriginalCategoryPageData.category",
      defaultMessage: "브리핑 카테고리 조회 중 오류가 발생했습니다.",
      context: { categoryKey },
    });
  }

  const { data: postsData, error: postsErr, count: postsCount } = await supabase
    .from("briefing_posts")
    .select(
      `
      id, slug, title, excerpt, created_at, published_at, cover_image_url,
      category:briefing_categories(key,name)
    `,
      { count: "exact" }
    )
    .eq("status", "published")
    .eq("board_id", board.id)
    .eq("category_id", cat?.id ?? "")
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (postsErr) {
    throw createSupabaseServiceError(postsErr, {
      scope: "briefing.original.category",
      action: "fetchOboonOriginalCategoryPageData.posts",
      defaultMessage: "브리핑 목록 조회 중 오류가 발생했습니다.",
      context: { categoryKey, page },
    });
  }

  const { data: tagData, error: tagErr } = await supabase
    .from("briefing_tags")
    .select("key,name")
    .eq("is_active", true)
    .order("sort_order");

  if (tagErr) {
    throw createSupabaseServiceError(tagErr, {
      scope: "briefing.original.category",
      action: "fetchOboonOriginalCategoryPageData.tags",
      defaultMessage: "브리핑 태그 조회 중 오류가 발생했습니다.",
      context: { categoryKey },
    });
  }

  return {
    board,
    category: cat,
    posts: postsData ?? [],
    tags: tagData ?? [],
    totalCount: postsCount ?? 0,
    page,
    pageSize,
  };
}
