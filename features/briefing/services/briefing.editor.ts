import { createSupabaseServiceError } from "@/lib/errors";
import { createSupabaseServer } from "@/lib/supabaseServer";

type EditorDashboardPostRow = {
  id: string;
  title: string;
  status: string;
  like_count: number | null;
  comment_count: number | null;
  view_count: number | null;
  published_at: string | null;
  created_at: string;
  slug: string;
};

type EditorDashboardBoardRow = {
  id: string;
  key: string;
  name: string;
  cover_image_url: string | null;
};

type EditorDashboardCategoryRow = {
  id: string;
  key: string;
  name: string;
  board_id: string;
  cover_image_url: string | null;
};

function isMissingColumnError(error: {
  code?: string | null;
  message?: string | null;
}, columnName: string) {
  return (
    error.code === "42703" &&
    typeof error.message === "string" &&
    error.message.includes(columnName)
  );
}

export async function fetchEditorDashboardData(userId: string) {
  const supabase = await createSupabaseServer();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, name, nickname, role, avatar_url, bio")
    .eq("id", userId)
    .maybeSingle();
  if (profileError) {
    throw createSupabaseServiceError(profileError, {
      scope: "briefing.editor",
      action: "fetchEditorDashboardData.profile",
      defaultMessage: "에디터 정보 조회 중 오류가 발생했습니다.",
      context: { userId },
    });
  }

  const baseSelect =
    "id, title, status, like_count, comment_count, published_at, created_at, slug";
  let posts: EditorDashboardPostRow[] = [];

  const [
    { data: postsWithViews, error: postsWithViewsError },
    { data: boards, error: boardsError },
    { data: categories, error: categoriesError },
  ] = await Promise.all([
    supabase
      .from("briefing_posts")
      .select(`${baseSelect}, view_count`)
      .eq("author_profile_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("briefing_boards")
      .select("id, key, name, cover_image_url")
      .order("id"),
    supabase
      .from("briefing_categories")
      .select("id, key, name, board_id, cover_image_url")
      .order("sort_order"),
  ]);

  if (postsWithViewsError) {
    if (isMissingColumnError(postsWithViewsError, "view_count")) {
      const { data: postsWithoutViews, error: postsWithoutViewsError } = await supabase
        .from("briefing_posts")
        .select(baseSelect)
        .eq("author_profile_id", userId)
        .order("created_at", { ascending: false });

      if (postsWithoutViewsError) {
        throw createSupabaseServiceError(postsWithoutViewsError, {
          scope: "briefing.editor",
          action: "fetchEditorDashboardData.posts",
          defaultMessage: "에디터 글 목록 조회 중 오류가 발생했습니다.",
          context: { userId },
        });
      }

      posts = ((postsWithoutViews ?? []) as EditorDashboardPostRow[]).map((post) => ({
        ...post,
        view_count: 0,
      }));
    } else {
      throw createSupabaseServiceError(postsWithViewsError, {
        scope: "briefing.editor",
        action: "fetchEditorDashboardData.posts",
        defaultMessage: "에디터 글 목록 조회 중 오류가 발생했습니다.",
        context: { userId },
      });
    }
  } else {
    posts = ((postsWithViews ?? []) as EditorDashboardPostRow[]).map((post) => ({
      ...post,
      view_count: post.view_count ?? 0,
    }));
  }

  if (boardsError) {
    throw createSupabaseServiceError(boardsError, {
      scope: "briefing.editor",
      action: "fetchEditorDashboardData.boards",
      defaultMessage: "브리핑 보드 조회 중 오류가 발생했습니다.",
      context: { userId },
    });
  }

  if (categoriesError) {
    throw createSupabaseServiceError(categoriesError, {
      scope: "briefing.editor",
      action: "fetchEditorDashboardData.categories",
      defaultMessage: "브리핑 카테고리 조회 중 오류가 발생했습니다.",
      context: { userId },
    });
  }

  const stats = {
    totalPosts: posts.length,
    totalLikes: posts.reduce((sum, post) => sum + (post.like_count ?? 0), 0),
    totalComments: posts.reduce((sum, post) => sum + (post.comment_count ?? 0), 0),
    totalViews: posts.reduce((sum, post) => sum + (post.view_count ?? 0), 0),
  };

  return {
    profile,
    posts,
    stats,
    boards: (boards ?? []) as EditorDashboardBoardRow[],
    categories: (categories ?? []) as EditorDashboardCategoryRow[],
  };
}
