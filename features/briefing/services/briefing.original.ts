import { createSupabaseServer } from "@/lib/supabaseServer";
import { AppError, ERR, createSupabaseServiceError } from "@/lib/errors";

export async function fetchOboonOriginalPageData() {
  const supabase = await createSupabaseServer();

  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role, deleted_at")
      .eq("id", user.id)
      .maybeSingle();
    isAdmin = !!profile && !profile.deleted_at && profile.role === "admin";
  }

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
    throw new AppError(
      ERR.NOT_FOUND,
      "브리핑 게시판을 찾을 수 없습니다.",
      404,
    );
  }

  const boardId = board.id as string;

  const { data: categories, error: catErr } = await supabase
    .from("briefing_categories")
    .select("id,key,name")
    .eq("board_id", boardId)
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (catErr) {
    throw createSupabaseServiceError(catErr, {
      scope: "briefing.original",
      action: "fetchOboonOriginalPageData.categories",
      defaultMessage: "브리핑 카테고리 조회 중 오류가 발생했습니다.",
    });
  }

  const categoryIds = (categories ?? [])
    .map((c) => c.id)
    .filter(Boolean);

  const categoryCountMap = new Map<string, number>();
  if (categoryIds.length > 0) {
    const { data: rows, error: cntErr } = await supabase
      .from("briefing_posts")
      .select("category_id")
      .eq("board_id", boardId)
      .eq("status", "published")
      .in("category_id", categoryIds);

    if (cntErr) {
      throw createSupabaseServiceError(cntErr, {
        scope: "briefing.original",
        action: "fetchOboonOriginalPageData.categoryCounts",
        defaultMessage: "브리핑 카테고리 집계 중 오류가 발생했습니다.",
        context: { categoryCount: categoryIds.length },
      });
    }

    (rows ?? []).forEach((r) => {
      const id = (r?.category_id ?? null) as string | null;
      if (!id) return;
      categoryCountMap.set(id, (categoryCountMap.get(id) ?? 0) + 1);
    });
  }

  const { data: featuredList, error: featErr } = await supabase
    .from("briefing_posts")
    .select(
      `
      id, slug, title, content_md, created_at, published_at, cover_image_url,
      category:briefing_categories(key,name)
    `,
    )
    .eq("status", "published")
    .eq("board_id", boardId)
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(8);

  if (featErr) {
    throw createSupabaseServiceError(featErr, {
      scope: "briefing.original",
      action: "fetchOboonOriginalPageData.featured",
      defaultMessage: "대표 브리핑 조회 중 오류가 발생했습니다.",
    });
  }

  const { data: tags, error: tagErr } = await supabase
    .from("briefing_tags")
    .select("id,key,name,sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (tagErr) {
    throw createSupabaseServiceError(tagErr, {
      scope: "briefing.original",
      action: "fetchOboonOriginalPageData.tags",
      defaultMessage: "브리핑 태그 조회 중 오류가 발생했습니다.",
    });
  }

  const tagRows = tags ?? [];
  const tagToCategoryIds = new Map<string, Set<string>>();

  if (tagRows.length > 0) {
    const tagIds = tagRows.map((t) => t.id);

    const { data: mapRows, error: mapErr } = await supabase
      .from("briefing_post_tags")
      .select(
        `
        tag_id,
        post:briefing_posts!inner(id, category_id, status, board_id)
      `,
      )
      .in("tag_id", tagIds)
      .eq("post.status", "published")
      .eq("post.board_id", boardId);

    if (mapErr) {
      throw createSupabaseServiceError(mapErr, {
        scope: "briefing.original",
        action: "fetchOboonOriginalPageData.tagMap",
        defaultMessage: "브리핑 태그 매핑 조회 중 오류가 발생했습니다.",
        context: { tagCount: tagIds.length },
      });
    }

    (mapRows ?? []).forEach((row) => {
      const tagId = row?.tag_id as string | undefined;
      const post = Array.isArray(row?.post)
        ? (row.post[0] ?? null)
        : (row?.post ?? null);
      const categoryId = post?.category_id as string | undefined;
      if (!tagId || !categoryId) return;
      const set = tagToCategoryIds.get(tagId) ?? new Set<string>();
      set.add(categoryId);
      tagToCategoryIds.set(tagId, set);
    });
  }

  const featuredPosts = (featuredList ?? []).map((row) => ({
    ...row,
    category: Array.isArray(row?.category)
      ? row.category[0] ?? null
      : row?.category ?? null,
  }));

  return {
    isAdmin,
    boardId,
    categories: categories ?? [],
    categoryCountMap,
    featuredPosts,
    tagRows,
    tagToCategoryIds,
  };
}
