import { createSupabaseClient } from "@/lib/supabaseClient";

import type {
  CommunityPostRow,
  CommunityPostStatus,
  CommunityTabKey,
} from "../domain/community";

type CommunityPostWithAuthorDbRow = {
  id: string;
  status: CommunityPostStatus;
  title: string | null;
  body: string | null;
  like_count: number | null;
  comment_count: number | null;
  created_at: string | null;

  author_profile_id: string | null;
  author_name: string | null;
  author_avatar_url: string | null;

  property_id: number | null;
  property_name: string | null;
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
  hasConsulted?: boolean | null;
};

type CreateCommunityPostResult =
  | { ok: true; id: string }
  | { ok: false; message: string };

const mapPostRow = (row: CommunityPostWithAuthorDbRow): CommunityPostRow => {
  return {
    id: row.id,
    status: row.status,
    propertyName: row.property_name || "현장",
    title: row.title ?? "",
    body: row.body ?? "",
    authorName: row.author_name || "익명",
    authorAvatarUrl: row.author_avatar_url ?? null,
    likes: row.like_count ?? 0,
    comments: row.comment_count ?? 0,
    createdAt: row.created_at ?? new Date().toISOString(),
  };
};

const viewSelect = `
  id,
  status,
  title,
  body,
  like_count,
  comment_count,
  created_at,
  author_profile_id,
  author_name,
  author_avatar_url,
  property_id,
  property_name
`;

async function getPostsByIdsPreserveOrder(
  ids: string[],
): Promise<CommunityPostRow[]> {
  if (ids.length === 0) return [];
  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from("community_posts_with_author")
    .select(viewSelect)
    .in("id", ids);

  if (error) {
    console.error("community posts by ids load error:", error.message);
    return [];
  }

  const byId = new Map<string, CommunityPostWithAuthorDbRow>();
  (data ?? []).forEach((row) => byId.set((row as any).id, row as any));

  // 입력 ids 순서대로 정렬(북마크/댓글 “최근순” 유지)
  return ids
    .map((id) => byId.get(id))
    .filter(Boolean)
    .map((row) => mapPostRow(row as CommunityPostWithAuthorDbRow));
}

export async function getCommunityFeed(
  tabKey: CommunityTabKey,
): Promise<CommunityPostRow[]> {
  const supabase = createSupabaseClient();

  let query = supabase
    .from("community_posts_with_author")
    .select(viewSelect)
    .order("created_at", { ascending: false });

  if (tabKey !== "all") {
    query = query.eq("status", tabKey);
  }

  const { data, error } = await query;

  if (error) {
    console.error("community feed load error:", error.message);
    return [];
  }

  return (data ?? []).map((row) => mapPostRow(row as any));
}

export async function getCommunityProfileFeed(
  profileId: string,
  tabKey: CommunityTabKey,
): Promise<CommunityPostRow[]> {
  const supabase = createSupabaseClient();

  let query = supabase
    .from("community_posts_with_author")
    .select(viewSelect)
    .eq("author_profile_id", profileId)
    .order("created_at", { ascending: false });

  if (tabKey !== "all") {
    query = query.eq("status", tabKey);
  }

  const { data, error } = await query;

  if (error) {
    console.error("community profile feed load error:", error.message);
    return [];
  }

  return (data ?? []).map((row) => mapPostRow(row as any));
}

export async function getCommunityTrendingPosts(
  limit = 4,
): Promise<CommunityPostRow[]> {
  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from("community_posts_with_author")
    .select(viewSelect)
    .order("comment_count", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("community trending load error:", error.message);
    return [];
  }

  return (data ?? []).map((row) => mapPostRow(row as any));
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
  return getPostsByIdsPreserveOrder(ids);
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
  return getPostsByIdsPreserveOrder(ids);
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

  const { data, error } = await supabase
    .from("community_posts")
    .insert({
      author_profile_id: user.id,
      property_id: args.propertyId,
      status: args.status,
      title: args.title,
      body: args.body,
      like_count: 0,
      comment_count: 0,
      visited_on: args.visitedOn ?? null,
      has_consulted: args.hasConsulted ?? null,
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
