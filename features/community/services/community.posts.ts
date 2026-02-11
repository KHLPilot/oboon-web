import { createSupabaseClient } from "@/lib/supabaseClient";

import type {
  CommunityPostRow,
  CommunityPostStatus,
  CommunityTabKey,
} from "../domain/community";

type CommunityPostWithAuthorDbRow = {
  id: string;
  status: string | null;
  title: string | null;
  body: string | null;
  like_count: number | null;
  comment_count: number | null;
  created_at: string | null;
  visited_on: string | null;

  author_profile_id: string | null;
  author_name: string | null;
  author_nickname: string | null;
  author_avatar_url: string | null;
  is_anonymous: boolean | null;
  anonymous_nickname: string | null;

  property_id: number | null;
  property_name: string | null;
};

type CommunityPostBaseDbRow = {
  id: string;
  status: string | null;
  title: string | null;
  body: string | null;
  like_count: number | null;
  comment_count: number | null;
  created_at: string | null;
  visited_on: string | null;
  author_profile_id: string | null;
  is_anonymous: boolean | null;
  anonymous_nickname: string | null;
  property_id: number | null;
};

type CommunityAuthorDbRow = {
  id: string;
  name: string | null;
  nickname: string | null;
  avatar_url: string | null;
};

type CommunityPropertyDbRow = {
  id: number;
  name: string | null;
};

type BookmarkDbRow = {
  post_id: string;
  created_at: string | null;
};

type CommentDbRow = {
  post_id: string;
  created_at: string | null;
};

type CreateCommunityPostArgs = {
  status: CommunityPostStatus;
  title: string;
  body: string;
  propertyId: number | null;
  visitedOn?: string | null;
  isAnonymous?: boolean;
  anonymousNickname?: string | null;
};

type CreateCommunityPostResult =
  | { ok: true; id: string }
  | { ok: false; message: string };

const mapPostRow = (row: CommunityPostWithAuthorDbRow): CommunityPostRow => {
  const isAnonymous = row.is_anonymous === true;
  const uiStatus: CommunityPostStatus =
    Boolean(row.visited_on) ? "visited" : "thinking";
  const anonymousName =
    row.anonymous_nickname && row.anonymous_nickname.trim().length > 0
      ? row.anonymous_nickname.trim()
      : "익명";
  const authorDisplayName =
    row.author_nickname?.trim() ||
    row.author_name?.trim() ||
    "익명";

  return {
    id: row.id,
    status: uiStatus,
    propertyName: row.property_name || "현장",
    title: row.title ?? "",
    body: row.body ?? "",
    authorName: isAnonymous ? anonymousName : authorDisplayName,
    authorAvatarUrl: isAnonymous ? null : (row.author_avatar_url ?? null),
    likes: row.like_count ?? 0,
    comments: row.comment_count ?? 0,
    isLiked: false,
    isBookmarked: false,
    createdAt: row.created_at ?? new Date().toISOString(),
  };
};

const postBaseSelect = `
  id,
  status,
  title,
  body,
  like_count,
  comment_count,
  created_at,
  visited_on,
  author_profile_id,
  is_anonymous,
  anonymous_nickname,
  property_id
`;

async function enrichPostRows(
  rows: CommunityPostBaseDbRow[],
): Promise<CommunityPostWithAuthorDbRow[]> {
  if (rows.length === 0) return [];

  const supabase = createSupabaseClient();

  const authorIds = Array.from(
    new Set(rows.map((row) => row.author_profile_id).filter(Boolean)),
  ) as string[];
  const propertyIds = Array.from(
    new Set(rows.map((row) => row.property_id).filter((id) => id !== null)),
  ) as number[];

  const [authorsRes, propertiesRes] = await Promise.all([
    authorIds.length > 0
      ? supabase
          .from("profiles")
          .select("id, name, nickname, avatar_url")
          .in("id", authorIds)
      : Promise.resolve({ data: [] as CommunityAuthorDbRow[], error: null }),
    propertyIds.length > 0
      ? supabase.from("properties").select("id, name").in("id", propertyIds)
      : Promise.resolve({ data: [] as CommunityPropertyDbRow[], error: null }),
  ]);

  if (authorsRes.error) {
    console.error("community authors load error:", authorsRes.error.message);
  }
  if (propertiesRes.error) {
    console.error(
      "community properties load error:",
      propertiesRes.error.message,
    );
  }

  const authorMap = new Map<string, CommunityAuthorDbRow>(
    (authorsRes.data ?? []).map((row) => [row.id, row]),
  );
  const propertyMap = new Map<number, CommunityPropertyDbRow>(
    (propertiesRes.data ?? []).map((row) => [row.id, row]),
  );

  return rows.map((row) => {
    const author = row.author_profile_id
      ? authorMap.get(row.author_profile_id)
      : undefined;
    const property =
      row.property_id !== null ? propertyMap.get(row.property_id) : undefined;

    return {
      ...row,
      author_name: author?.name ?? null,
      author_nickname: author?.nickname ?? null,
      author_avatar_url: author?.avatar_url ?? null,
      is_anonymous: row.is_anonymous ?? false,
      anonymous_nickname: row.anonymous_nickname ?? null,
      property_name: property?.name ?? null,
    };
  });
}

async function getPostsByIdsPreserveOrder(
  ids: string[],
): Promise<CommunityPostRow[]> {
  if (ids.length === 0) return [];
  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from("community_posts")
    .select(postBaseSelect)
    .in("id", ids)
    .eq("status", "published");

  if (error) {
    console.error("community posts by ids load error:", error.message);
    return [];
  }

  const enriched = await enrichPostRows((data ?? []) as CommunityPostBaseDbRow[]);
  const byId = new Map<string, CommunityPostWithAuthorDbRow>();
  enriched.forEach((row) => byId.set(row.id, row));

  // 입력 ids 순서대로 정렬(북마크/댓글 “최근순” 유지)
  return ids
    .map((id) => byId.get(id))
    .filter(Boolean)
    .map((row) => mapPostRow(row as CommunityPostWithAuthorDbRow));
}

async function attachViewerReactions(
  rows: CommunityPostRow[],
): Promise<CommunityPostRow[]> {
  if (rows.length === 0) return rows;

  const supabase = createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return rows;

  const postIds = rows.map((row) => row.id);

  const [{ data: likedRows }, { data: bookmarkedRows }] = await Promise.all([
    supabase
      .from("community_likes")
      .select("post_id")
      .eq("profile_id", user.id)
      .in("post_id", postIds),
    supabase
      .from("community_bookmarks")
      .select("post_id")
      .eq("profile_id", user.id)
      .in("post_id", postIds),
  ]);

  const likedSet = new Set(
    (likedRows ?? [])
      .map((row) => (row as { post_id?: string | null }).post_id)
      .filter((id): id is string => Boolean(id)),
  );
  const bookmarkedSet = new Set(
    (bookmarkedRows ?? [])
      .map((row) => (row as { post_id?: string | null }).post_id)
      .filter((id): id is string => Boolean(id)),
  );

  return rows.map((row) => ({
    ...row,
    isLiked: likedSet.has(row.id),
    isBookmarked: bookmarkedSet.has(row.id),
  }));
}

export async function getCommunityFeed(
  tabKey: CommunityTabKey,
): Promise<CommunityPostRow[]> {
  const supabase = createSupabaseClient();

  let query = supabase
    .from("community_posts")
    .select(postBaseSelect)
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (tabKey !== "all") {
    if (tabKey === "visited") {
      query = query.not("visited_on", "is", null);
    } else {
      query = query.is("visited_on", null);
    }
  }

  const { data, error } = await query;

  if (error) {
    console.error("community feed load error:", error.message);
    return [];
  }

  const enriched = await enrichPostRows((data ?? []) as CommunityPostBaseDbRow[]);
  return attachViewerReactions(enriched.map((row) => mapPostRow(row)));
}

export async function getCommunityProfileFeed(
  profileId: string,
  tabKey: CommunityTabKey,
): Promise<CommunityPostRow[]> {
  const supabase = createSupabaseClient();

  let query = supabase
    .from("community_posts")
    .select(postBaseSelect)
    .eq("status", "published")
    .eq("author_profile_id", profileId)
    .order("created_at", { ascending: false });

  if (tabKey !== "all") {
    if (tabKey === "visited") {
      query = query.not("visited_on", "is", null);
    } else {
      query = query.is("visited_on", null);
    }
  }

  const { data, error } = await query;

  if (error) {
    console.error("community profile feed load error:", error.message);
    return [];
  }

  const enriched = await enrichPostRows((data ?? []) as CommunityPostBaseDbRow[]);
  return attachViewerReactions(enriched.map((row) => mapPostRow(row)));
}

export async function getCommunityTrendingPosts(
  limit = 4,
): Promise<CommunityPostRow[]> {
  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from("community_posts")
    .select(postBaseSelect)
    .eq("status", "published")
    .order("comment_count", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("community trending load error:", error.message);
    return [];
  }

  const enriched = await enrichPostRows((data ?? []) as CommunityPostBaseDbRow[]);
  return attachViewerReactions(enriched.map((row) => mapPostRow(row)));
}

export async function getCommunityBookmarkedPosts(
  profileId: string,
  limit = 4,
): Promise<CommunityPostRow[]> {
  const supabase = createSupabaseClient();

  // 1) 북마크 테이블에서 post_id만 먼저 뽑는다 (정렬/limit 기준은 북마크 created_at)
  const { data: bookmarks, error: bookmarkError } = await supabase
    .from("community_bookmarks")
    .select("post_id, created_at")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (bookmarkError) {
    console.error("community bookmarks load error:", bookmarkError.message);
    return [];
  }

  const ids = (bookmarks ?? [])
    .map((r) => (r as BookmarkDbRow).post_id)
    .filter(Boolean);

  // 2) VIEW에서 해당 글들을 조회한 뒤, ids 순서대로 정렬해서 반환
  const posts = await getPostsByIdsPreserveOrder(ids);
  return attachViewerReactions(posts);
}

export async function getCommunityCommentedPosts(
  profileId: string,
  limit = 20,
): Promise<CommunityPostRow[]> {
  const supabase = createSupabaseClient();

  // 1) 댓글 테이블에서 post_id만 먼저 뽑는다 (정렬 기준은 댓글 created_at)
  const { data: comments, error: commentError } = await supabase
    .from("community_comments")
    .select("post_id, created_at")
    .eq("author_profile_id", profileId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (commentError) {
    console.error("community comments load error:", commentError.message);
    return [];
  }

  // 중복 제거(댓글 여러 번 단 글은 1번만), “최근 댓글 단 순”은 유지
  const seen = new Set<string>();
  const ids: string[] = [];

  (comments ?? []).forEach((r) => {
    const id = (r as CommentDbRow).post_id;
    if (!id) return;
    if (seen.has(id)) return;
    seen.add(id);
    ids.push(id);
  });

  // 2) VIEW에서 조회 후 ids 순서대로 반환
  const posts = await getPostsByIdsPreserveOrder(ids);
  return attachViewerReactions(posts);
}

export async function createCommunityPost(
  args: CreateCommunityPostArgs,
): Promise<CreateCommunityPostResult> {
  const supabase = createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "로그인이 필요합니다." };
  }

  if (args.status === "visited") {
    if (!args.propertyId) {
      return { ok: false, message: "다녀온 현장을 선택해주세요." };
    }

    const { count, error: visitError } = await supabase
      .from("consultations")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", user.id)
      .eq("property_id", args.propertyId)
      .in("status", ["visited", "contracted"]);

    if (visitError) {
      console.error("community visited validation error:", visitError.message);
      return {
        ok: false,
        message: "방문 이력을 확인하지 못했습니다. 잠시 후 다시 시도해주세요.",
      };
    }

    if (!count || count < 1) {
      return {
        ok: false,
        message: "해당 현장 방문 기록이 있는 경우에만 '다녀왔어요'를 작성할 수 있습니다.",
      };
    }
  }

  const { data, error } = await supabase
    .from("community_posts")
    .insert({
      author_profile_id: user.id,
      property_id: args.propertyId,
      status: "published",
      title: args.title,
      body: args.body,
      like_count: 0,
      comment_count: 0,
      visited_on: args.visitedOn ?? null,
      is_anonymous: args.isAnonymous ?? false,
      anonymous_nickname:
        args.isAnonymous && args.anonymousNickname
          ? args.anonymousNickname.trim()
          : null,
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    console.error("community post create error:", error?.message);
    return {
      ok: false,
      message:
        error?.message ?? "기록 등록 중 오류가 발생했습니다. 다시 시도해주세요.",
    };
  }

  return { ok: true, id: data.id };
}

type ToggleLikeResult =
  | { ok: true; liked: boolean; likeCount: number }
  | { ok: false; message: string };

type ToggleBookmarkResult =
  | { ok: true; bookmarked: boolean }
  | { ok: false; message: string };

export type CommunityComment = {
  id: string;
  body: string;
  createdAt: string;
  authorId: string | null;
  authorName: string;
  authorAvatarUrl?: string | null;
  parentCommentId?: string | null;
  likeCount: number;
  isLiked: boolean;
  isAnonymous: boolean;
};

export async function toggleCommunityLike(
  postId: string,
): Promise<ToggleLikeResult> {
  const response = await fetch(`/api/community/posts/${postId}/like`, {
    method: "POST",
  });
  const data = await response.json();

  if (!response.ok) {
    return {
      ok: false,
      message: String(data?.error ?? "좋아요 처리에 실패했습니다."),
    };
  }

  return {
    ok: true,
    liked: Boolean(data?.liked),
    likeCount:
      typeof data?.likeCount === "number" && Number.isFinite(data.likeCount)
        ? data.likeCount
        : 0,
  };
}

export async function toggleCommunityBookmark(
  postId: string,
): Promise<ToggleBookmarkResult> {
  const response = await fetch(`/api/community/posts/${postId}/bookmark`, {
    method: "POST",
  });
  const data = await response.json();

  if (!response.ok) {
    return {
      ok: false,
      message: String(data?.error ?? "북마크 처리에 실패했습니다."),
    };
  }

  return {
    ok: true,
    bookmarked: Boolean(data?.bookmarked),
  };
}

type LoadCommentsResult =
  | { ok: true; comments: CommunityComment[] }
  | { ok: false; message: string };

type CreateCommentResult =
  | { ok: true; comment: CommunityComment; commentCount: number }
  | { ok: false; message: string };

export async function getCommunityComments(
  postId: string,
): Promise<LoadCommentsResult> {
  const response = await fetch(`/api/community/posts/${postId}/comments`, {
    method: "GET",
  });
  const data = await response.json();

  if (!response.ok) {
    return {
      ok: false,
      message: String(data?.error ?? "댓글을 불러오지 못했습니다."),
    };
  }

  const comments = Array.isArray(data?.comments)
    ? (data.comments as Array<Partial<CommunityComment>>).map((comment) => ({
        id: String(comment.id ?? ""),
        body: String(comment.body ?? ""),
        createdAt: String(comment.createdAt ?? new Date().toISOString()),
        authorId:
          typeof comment.authorId === "string" && comment.authorId.length > 0
            ? comment.authorId
            : null,
        authorName: String(comment.authorName ?? "사용자"),
        authorAvatarUrl: comment.authorAvatarUrl ?? null,
        parentCommentId:
          typeof comment.parentCommentId === "string"
            ? comment.parentCommentId
            : null,
        likeCount:
          typeof comment.likeCount === "number" && Number.isFinite(comment.likeCount)
            ? comment.likeCount
            : 0,
        isLiked: Boolean(comment.isLiked),
        isAnonymous: Boolean(comment.isAnonymous),
      }))
    : [];

  return {
    ok: true,
    comments,
  };
}

export async function createCommunityComment(
  postId: string,
  body: string,
  parentCommentId?: string,
  isAnonymous = false,
  anonymousNickname = "",
): Promise<CreateCommentResult> {
  const response = await fetch(`/api/community/posts/${postId}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      body,
      parentCommentId,
      isAnonymous,
      anonymousNickname,
    }),
  });
  const data = await response.json();

  if (!response.ok) {
    return {
      ok: false,
      message: String(data?.error ?? "댓글 등록에 실패했습니다."),
    };
  }

  return {
    ok: true,
    comment: {
      id: String(data?.comment?.id ?? ""),
      body: String(data?.comment?.body ?? ""),
      createdAt: String(data?.comment?.createdAt ?? new Date().toISOString()),
      authorId:
        typeof data?.comment?.authorId === "string" &&
        data.comment.authorId.length > 0
          ? data.comment.authorId
          : null,
      authorName: String(data?.comment?.authorName ?? "사용자"),
      authorAvatarUrl: data?.comment?.authorAvatarUrl ?? null,
      parentCommentId:
        typeof data?.comment?.parentCommentId === "string"
          ? data.comment.parentCommentId
          : null,
      likeCount:
        typeof data?.comment?.likeCount === "number" &&
        Number.isFinite(data.comment.likeCount)
          ? data.comment.likeCount
          : 0,
      isLiked: Boolean(data?.comment?.isLiked),
      isAnonymous: Boolean(data?.comment?.isAnonymous),
    },
    commentCount:
      typeof data?.commentCount === "number" && Number.isFinite(data.commentCount)
        ? data.commentCount
        : 0,
  };
}

type ToggleCommentLikeResult =
  | { ok: true; liked: boolean; likeCount: number }
  | { ok: false; message: string };

export async function toggleCommunityCommentLike(
  commentId: string,
): Promise<ToggleCommentLikeResult> {
  const response = await fetch(`/api/community/comments/${commentId}/like`, {
    method: "POST",
  });
  const data = await response.json();

  if (!response.ok) {
    return {
      ok: false,
      message: String(data?.error ?? "댓글 좋아요 처리에 실패했습니다."),
    };
  }

  return {
    ok: true,
    liked: Boolean(data?.liked),
    likeCount:
      typeof data?.likeCount === "number" && Number.isFinite(data.likeCount)
        ? data.likeCount
        : 0,
  };
}
