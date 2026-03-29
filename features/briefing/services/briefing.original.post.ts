import { createSupabaseServer } from "@/lib/supabaseServer";
import { createSupabaseServiceError } from "@/lib/errors";

export async function fetchOboonOriginalPostPageData(args: {
  categoryKey: string;
  slug: string;
}) {
  const { categoryKey, slug } = args;
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
    .select("id")
    .eq("key", "oboon_original")
    .single();
  if (boardError) {
    throw createSupabaseServiceError(boardError, {
      scope: "briefing.original.post",
      action: "fetchOboonOriginalPostPageData.board",
      defaultMessage: "브리핑 게시판 조회 중 오류가 발생했습니다.",
    });
  }
  const boardId = board.id as string;

  const { data: cat, error: catErr } = await supabase
    .from("briefing_categories")
    .select("id,key,name,description")
    .eq("board_id", boardId)
    .eq("key", categoryKey)
    .eq("is_active", true)
    .maybeSingle();
  if (catErr) {
    throw createSupabaseServiceError(catErr, {
      scope: "briefing.original.post",
      action: "fetchOboonOriginalPostPageData.category",
      defaultMessage: "브리핑 카테고리 조회 중 오류가 발생했습니다.",
      context: { categoryKey },
    });
  }

  const { data: post, error } = await supabase
    .from("briefing_posts")
    .select(
      `
    id,
    slug,
    title,
    content_md,
    content_html,
    created_at,
    published_at,
    cover_image_url,
    author_profile:profiles(
      id,
      name,
      nickname,
      role
    ),
    post_tags:briefing_post_tags(
      tag:briefing_tags(id,name,sort_order,is_active)
    )
  `,
    )
    .eq("status", "published")
    .eq("board_id", boardId)
    .eq("slug", slug)
    .maybeSingle();
  if (error) {
    throw createSupabaseServiceError(error, {
      scope: "briefing.original.post",
      action: "fetchOboonOriginalPostPageData.post",
      defaultMessage: "브리핑 게시글 조회 중 오류가 발생했습니다.",
      context: { categoryKey, slug },
    });
  }

  const { data: relatedData, error: relErr } = await supabase
    .from("briefing_posts")
    .select("id, slug, title, content_md, content_html")
    .eq("status", "published")
    .eq("board_id", boardId)
    .eq("category_id", cat?.id ?? "")
    .neq("slug", slug)
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(3);

  if (relErr) {
    throw createSupabaseServiceError(relErr, {
      scope: "briefing.original.post",
      action: "fetchOboonOriginalPostPageData.related",
      defaultMessage: "관련 브리핑 조회 중 오류가 발생했습니다.",
      context: { categoryKey, slug },
    });
  }

  const { data: recCats, error: recErr } = await supabase
    .from("briefing_categories")
    .select("id,key,name")
    .eq("board_id", boardId)
    .eq("is_active", true)
    .neq("key", categoryKey)
    .order("sort_order", { ascending: true })
    .limit(3);
  if (recErr) {
    throw createSupabaseServiceError(recErr, {
      scope: "briefing.original.post",
      action: "fetchOboonOriginalPostPageData.recommendedCategories",
      defaultMessage: "추천 카테고리 조회 중 오류가 발생했습니다.",
      context: { categoryKey },
    });
  }

  const recCounts = new Map<string, number>();
  if ((recCats ?? []).length > 0) {
    const idToKey = new Map<string, string>(
      (recCats ?? []).map((c) => [c.id, c.key]),
    );
    const recCategoryIds = (recCats ?? []).map((c) => c.id);

    const { data: rows, error: rowsErr } = await supabase
      .from("briefing_posts")
      .select("category_id")
      .eq("status", "published")
      .eq("board_id", boardId)
      .in("category_id", recCategoryIds);

    if (rowsErr) {
      throw createSupabaseServiceError(rowsErr, {
        scope: "briefing.original.post",
        action: "fetchOboonOriginalPostPageData.recommendedCounts",
        defaultMessage: "추천 카테고리 집계 중 오류가 발생했습니다.",
        context: { categoryKey, recommendedCategoryCount: recCategoryIds.length },
      });
    }

    (rows ?? []).forEach((r) => {
      const k = idToKey.get(r.category_id);
      if (!k) return;
      recCounts.set(k, (recCounts.get(k) ?? 0) + 1);
    });
  }

  return {
    isAdmin,
    boardId,
    category: cat,
    post,
    relatedPosts: relatedData ?? [],
    recCats: recCats ?? [],
    recCounts,
  };
}

export async function ensureBriefingAdmin() {
  const supabase = await createSupabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return false;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, deleted_at")
    .eq("id", user.id)
    .maybeSingle();

  return !!profile && !profile.deleted_at && profile.role === "admin";
}

export async function deleteBriefingPost(postId: string) {
  const supabase = await createSupabaseServer();
  await supabase.from("briefing_post_tags").delete().eq("post_id", postId);
  return supabase.from("briefing_posts").delete().eq("id", postId);
}
