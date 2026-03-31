import { createSupabaseServer } from "@/lib/supabaseServer";
import { createSupabaseServiceError } from "@/lib/errors";

type BriefingCommentRow = {
  id: string;
  nickname: string;
  content: string;
  created_at: string;
  profile_id: string | null;
  is_anonymous: boolean;
  avatar_url: string | null;
};

type BriefingCommentQueryRow = {
  id: string;
  nickname: string;
  content: string;
  created_at: string;
  profile_id: string | null;
  is_anonymous: boolean;
  profile: { avatar_url: string | null } | { avatar_url: string | null }[] | null;
};

type BriefingCommentFallbackRow = {
  id: string;
  nickname: string;
  content: string;
  created_at: string;
  profile_id: string | null;
};

type BriefingProfileMapValue = {
  avatar_url: string | null;
  nickname: string | null;
  name: string | null;
};

function normalizeCommentAvatar(
  profile: BriefingCommentQueryRow["profile"],
): string | null {
  if (Array.isArray(profile)) return profile[0]?.avatar_url ?? null;
  return profile?.avatar_url ?? null;
}

function normalizeBriefingComments(
  rows: BriefingCommentQueryRow[] | null | undefined,
): BriefingCommentRow[] {
  return (rows ?? []).map((row) => ({
    id: row.id,
    nickname: row.nickname,
    content: row.content,
    created_at: row.created_at,
    profile_id: row.profile_id,
    is_anonymous: row.is_anonymous === true,
    avatar_url: row.is_anonymous ? null : normalizeCommentAvatar(row.profile),
  }));
}

function normalizeBriefingFallbackComments(
  rows: BriefingCommentFallbackRow[] | null | undefined,
  profileMap?: Map<string, BriefingProfileMapValue>,
): BriefingCommentRow[] {
  return (rows ?? []).map((row) => {
    const profile = row.profile_id ? profileMap?.get(row.profile_id) ?? null : null;
    const isAnonymous =
      !!profile &&
      row.nickname !== (profile.nickname?.trim() || profile.name?.trim() || "");

    return {
      id: row.id,
      nickname: row.nickname,
      content: row.content,
      created_at: row.created_at,
      profile_id: row.profile_id,
      is_anonymous: isAnonymous,
      avatar_url: isAnonymous ? null : (profile?.avatar_url ?? null),
    };
  });
}

async function loadProfileMap(
  supabase: Awaited<ReturnType<typeof createSupabaseServer>>,
  rows: BriefingCommentFallbackRow[] | null | undefined,
) {
  const profileIds = [...new Set((rows ?? []).map((row) => row.profile_id).filter(Boolean))];
  if (profileIds.length === 0) return new Map<string, BriefingProfileMapValue>();

  const { data } = await supabase
    .from("profiles")
    .select("id, avatar_url, nickname, name")
    .in("id", profileIds);

  return new Map(
    (data ?? []).map((profile) => [
      profile.id as string,
      {
        avatar_url: (profile.avatar_url as string | null) ?? null,
        nickname: (profile.nickname as string | null) ?? null,
        name: (profile.name as string | null) ?? null,
      },
    ]),
  );
}

function isOptionalBriefingCommentsSchemaError(error: {
  code?: string | null;
  message?: string | null;
}) {
  const code = typeof error.code === "string" ? error.code : "";
  const message = typeof error.message === "string" ? error.message : "";

  return (
    code === "42P01" ||
    code === "42703" ||
    code === "PGRST200" ||
    code === "PGRST204" ||
    message.includes("briefing_comments") ||
    message.includes("is_anonymous") ||
    message.includes("avatar_url")
  );
}

export async function fetchOboonOriginalPostPageData(args: {
  categoryKey: string;
  slug: string;
}) {
  const { categoryKey, slug } = args;
  const supabase = await createSupabaseServer();

  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  let isAdmin = false;
  let currentUserAvatarUrl: string | null = null;
  let currentUserNickname = "";
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role, deleted_at, avatar_url, nickname, name")
      .eq("id", user.id)
      .maybeSingle();
    isAdmin = !!profile && !profile.deleted_at && profile.role === "admin";
    currentUserAvatarUrl = profile?.avatar_url ?? null;
    currentUserNickname = profile?.nickname?.trim() || profile?.name?.trim() || "익명";
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
    .select("id,key,name,description,cover_image_url")
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
    content_html,
    like_count,
    comment_count,
    created_at,
    published_at,
    cover_image_url,
    author_profile:profiles(
      id,
      name,
      nickname,
      role,
      avatar_url,
      bio
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
    .select("id, slug, title, excerpt, content_html, cover_image_url")
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

  const { data: initialComments, error: commentsError } = await supabase
    .from("briefing_comments")
    .select(
      "id, nickname, content, created_at, profile_id, is_anonymous, profile:profiles(avatar_url)",
    )
    .eq("post_id", post?.id ?? "")
    .order("created_at", { ascending: false })
    .limit(21);

  if (commentsError) {
    if (isOptionalBriefingCommentsSchemaError(commentsError)) {
      const { data: fallbackComments, error: fallbackError } = await supabase
        .from("briefing_comments")
        .select("id, nickname, content, created_at, profile_id")
        .eq("post_id", post?.id ?? "")
        .order("created_at", { ascending: false })
        .limit(21);

      if (!fallbackError) {
        const profileMap = await loadProfileMap(
          supabase,
          (fallbackComments ?? []) as BriefingCommentFallbackRow[],
        );
        const normalizedComments = normalizeBriefingFallbackComments(
          (fallbackComments ?? []) as BriefingCommentFallbackRow[],
          profileMap,
        );
        const hasMore = normalizedComments.length > 20;
        const comments = hasMore
          ? normalizedComments.slice(0, 20)
          : normalizedComments;
        const nextCursor = hasMore
          ? comments[comments.length - 1]?.created_at ?? null
          : null;

        return {
          isAdmin,
          boardId,
          category: cat,
          post,
          relatedPosts: relatedData ?? [],
          initialComments: comments,
          initialNextCursor: nextCursor,
          currentUserId: user?.id ?? null,
          currentUserAvatarUrl,
          currentUserNickname,
          recCats: recCats ?? [],
          recCounts,
        };
      }

      return {
        isAdmin,
        boardId,
        category: cat,
        post,
        relatedPosts: relatedData ?? [],
        initialComments: [],
        initialNextCursor: null,
        currentUserId: user?.id ?? null,
        currentUserAvatarUrl,
        currentUserNickname,
        recCats: recCats ?? [],
        recCounts,
      };
    }

    throw createSupabaseServiceError(commentsError, {
      scope: "briefing.original.post",
      action: "fetchOboonOriginalPostPageData.comments",
      defaultMessage: "초기 댓글 조회 중 오류가 발생했습니다.",
      context: { categoryKey, slug, postId: post?.id ?? null },
    });
  }

  const normalizedComments = normalizeBriefingComments(
    (initialComments ?? []) as BriefingCommentQueryRow[],
  );
  const hasMore = normalizedComments.length > 20;
  const comments = hasMore
    ? normalizedComments.slice(0, 20)
    : normalizedComments;
  const nextCursor = hasMore ? comments[comments.length - 1]?.created_at ?? null : null;

  return {
    isAdmin,
    boardId,
    category: cat,
    post,
    relatedPosts: relatedData ?? [],
    initialComments: comments,
    initialNextCursor: nextCursor,
    currentUserId: user?.id ?? null,
    currentUserAvatarUrl,
    currentUserNickname,
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
