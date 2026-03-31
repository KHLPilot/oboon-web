import { createSupabaseServer } from "@/lib/supabaseServer";
import { createSupabaseServiceError } from "@/lib/errors";
import { createServiceAdminClient } from "@/lib/services/supabase-admin";

type BriefingAuthorProfile = {
  id: string;
  name: string | null;
  nickname: string | null;
  role: string | null;
  avatar_url: string | null;
  bio: string | null;
};

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

function normalizeAuthorProfile(
  profile:
    | BriefingAuthorProfile
    | BriefingAuthorProfile[]
    | null
    | undefined,
): BriefingAuthorProfile | null {
  if (!profile) return null;
  return Array.isArray(profile) ? (profile[0] ?? null) : profile;
}

async function resolveBriefingAuthorProfile(authorProfileId: string | null) {
  if (!authorProfileId) return null;

  const admin = createServiceAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("id, name, nickname, role, avatar_url, bio")
    .eq("id", authorProfileId)
    .maybeSingle();

  if (error || !data) return null;
  return data as BriefingAuthorProfile;
}

export async function fetchGeneralPostPageData(slug: string) {
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
    .eq("key", "general")
    .single();
  if (boardError) {
    throw createSupabaseServiceError(boardError, {
      scope: "briefing.general.post",
      action: "fetchGeneralPostPageData.board",
      defaultMessage: "브리핑 게시판 조회 중 오류가 발생했습니다.",
    });
  }
  const boardId = board.id as string;

  const { data, error } = await supabase
    .from("briefing_posts")
    .select(
      `
    id,
    slug,
    title,
    author_profile_id,
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
      scope: "briefing.general.post",
      action: "fetchGeneralPostPageData.post",
      defaultMessage: "브리핑 게시글 조회 중 오류가 발생했습니다.",
      context: { slug },
    });
  }

  const normalizedAuthor = normalizeAuthorProfile(
    (data as { author_profile?: BriefingAuthorProfile | BriefingAuthorProfile[] | null } | null)
      ?.author_profile,
  );
  const resolvedAuthor =
    normalizedAuthor ??
    (await resolveBriefingAuthorProfile(
      ((data as { author_profile_id?: string | null } | null)?.author_profile_id ?? null),
    ));
  const resolvedPost = data
    ? {
        ...data,
        author_profile: resolvedAuthor,
      }
    : data;

  const { data: relatedData, error: relErr } = await supabase
    .from("briefing_posts")
    .select("id, slug, title, excerpt, content_html, cover_image_url")
    .eq("status", "published")
    .eq("board_id", boardId)
    .neq("slug", slug)
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(4);
  if (relErr) {
    throw createSupabaseServiceError(relErr, {
      scope: "briefing.general.post",
      action: "fetchGeneralPostPageData.related",
      defaultMessage: "관련 브리핑 조회 중 오류가 발생했습니다.",
      context: { slug },
    });
  }

  const { data: initialComments, error: commentsError } = await supabase
    .from("briefing_comments")
    .select(
      "id, nickname, content, created_at, profile_id, is_anonymous, profile:profiles(avatar_url)",
    )
    .eq("post_id", data?.id ?? "")
    .order("created_at", { ascending: false })
    .limit(21);

  if (commentsError) {
    if (isOptionalBriefingCommentsSchemaError(commentsError)) {
      const { data: fallbackComments, error: fallbackError } = await supabase
        .from("briefing_comments")
        .select("id, nickname, content, created_at, profile_id")
        .eq("post_id", data?.id ?? "")
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
          post: resolvedPost,
          relatedPosts: relatedData ?? [],
          initialComments: comments,
          initialNextCursor: nextCursor,
          currentUserId: user?.id ?? null,
          currentUserAvatarUrl,
          currentUserNickname,
        };
      }

      return {
        isAdmin,
        boardId,
        post: resolvedPost,
        relatedPosts: relatedData ?? [],
        initialComments: [],
        initialNextCursor: null,
        currentUserId: user?.id ?? null,
        currentUserAvatarUrl,
        currentUserNickname,
      };
    }

    throw createSupabaseServiceError(commentsError, {
      scope: "briefing.general.post",
      action: "fetchGeneralPostPageData.comments",
      defaultMessage: "초기 댓글 조회 중 오류가 발생했습니다.",
      context: { slug, postId: data?.id ?? null },
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
    post: resolvedPost,
    relatedPosts: relatedData ?? [],
    initialComments: comments,
    initialNextCursor: nextCursor,
    currentUserId: user?.id ?? null,
    currentUserAvatarUrl,
    currentUserNickname,
  };
}

export async function ensureGeneralBriefingAdmin() {
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

export async function deleteGeneralBriefingPost(postId: string) {
  const supabase = await createSupabaseServer();
  await supabase.from("briefing_post_tags").delete().eq("post_id", postId);
  return supabase.from("briefing_posts").delete().eq("id", postId);
}
