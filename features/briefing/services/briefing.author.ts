import { createSupabaseServiceError } from "@/lib/errors";
import { createSupabaseServer } from "@/lib/supabaseServer";

type AuthorTab = "general" | "oboon-original";

type AuthorPostRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_image_url: string | null;
  published_at: string | null;
  created_at: string;
  category_id: string | null;
};

export async function fetchAuthorPageData(authorId: string, tab: AuthorTab) {
  const supabase = await createSupabaseServer();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, name, nickname, role, avatar_url, bio")
    .eq("id", authorId)
    .maybeSingle();
  if (profileError) {
    throw createSupabaseServiceError(profileError, {
      scope: "briefing.author",
      action: "fetchAuthorPageData.profile",
      defaultMessage: "작성자 정보 조회 중 오류가 발생했습니다.",
      context: { authorId, tab },
    });
  }

  const boardKey = tab === "general" ? "general" : "oboon_original";
  const { data: board, error: boardError } = await supabase
    .from("briefing_boards")
    .select("id")
    .eq("key", boardKey)
    .single();
  if (boardError) {
    throw createSupabaseServiceError(boardError, {
      scope: "briefing.author",
      action: "fetchAuthorPageData.board",
      defaultMessage: "브리핑 게시판 조회 중 오류가 발생했습니다.",
      context: { authorId, tab, boardKey },
    });
  }

  const { data: posts, error: postsError } = await supabase
    .from("briefing_posts")
    .select(
      "id, slug, title, excerpt, cover_image_url, published_at, created_at, category_id",
    )
    .eq("status", "published")
    .eq("board_id", board.id)
    .eq("author_profile_id", authorId)
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(20);
  if (postsError) {
    throw createSupabaseServiceError(postsError, {
      scope: "briefing.author",
      action: "fetchAuthorPageData.posts",
      defaultMessage: "작성자 글 목록 조회 중 오류가 발생했습니다.",
      context: { authorId, tab, boardId: board.id as string },
    });
  }

  const normalizedPosts = ((posts ?? []) as AuthorPostRow[]).map((post) => ({
    ...post,
    category: null as { key: string | null; name: string | null } | null,
  }));

  if (tab === "oboon-original") {
    const categoryIds = [
      ...new Set(
        normalizedPosts
          .map((post) => post.category_id)
          .filter((value): value is string => Boolean(value)),
      ),
    ];

    if (categoryIds.length > 0) {
      const { data: categories, error: categoriesError } = await supabase
        .from("briefing_categories")
        .select("id, key, name")
        .in("id", categoryIds);

      if (categoriesError) {
        throw createSupabaseServiceError(categoriesError, {
          scope: "briefing.author",
          action: "fetchAuthorPageData.categories",
          defaultMessage: "작성자 카테고리 정보를 조회하지 못했습니다.",
          context: { authorId, tab },
        });
      }

      const categoryMap = new Map<string, { key: string | null; name: string | null }>(
        (categories ?? []).map((category) => [
          category.id as string,
          {
            key: (category.key as string | null) ?? null,
            name: (category.name as string | null) ?? null,
          },
        ]),
      );

      for (const post of normalizedPosts) {
        post.category = post.category_id ? (categoryMap.get(post.category_id) ?? null) : null;
      }
    }
  }

  return { profile, posts: normalizedPosts };
}
