import { createSupabaseClient } from "@/lib/supabaseClient";

import type {
  CommunityProfileRow,
  CommunityProfileStats,
  CommunityUserRole,
  FollowStats,
} from "../domain/community";

const DEFAULT_STATS: CommunityProfileStats = {
  posts: 0,
  comments: 0,
  bookmarks: 0,
};

async function getProfileStats(
  profileId: string,
  supabase: ReturnType<typeof createSupabaseClient>,
): Promise<CommunityProfileStats> {
  const [posts, comments, bookmarks] = await Promise.all([
    supabase
      .from("community_posts")
      .select("id", { count: "exact", head: true })
      .eq("author_profile_id", profileId),
    supabase
      .from("community_comments")
      .select("id", { count: "exact", head: true })
      .eq("author_profile_id", profileId),
    supabase
      .from("community_bookmarks")
      .select("post_id", { count: "exact", head: true })
      .eq("profile_id", profileId),
  ]);

  return {
    posts: posts.count ?? 0,
    comments: comments.count ?? 0,
    bookmarks: bookmarks.count ?? 0,
  };
}

export async function getFollowStats(profileId: string): Promise<FollowStats> {
  const supabase = createSupabaseClient();
  const [{ count: followerCount }, { count: followingCount }] = await Promise.all([
    supabase
      .from("community_follows")
      .select("follower_id", { count: "exact", head: true })
      .eq("following_id", profileId),
    supabase
      .from("community_follows")
      .select("following_id", { count: "exact", head: true })
      .eq("follower_id", profileId),
  ]);
  return {
    followerCount: followerCount ?? 0,
    followingCount: followingCount ?? 0,
  };
}

export async function getIsFollowing(profileId: string): Promise<boolean> {
  const supabase = createSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from("community_follows")
    .select("follower_id")
    .eq("follower_id", user.id)
    .eq("following_id", profileId)
    .maybeSingle();

  return Boolean(data);
}

export async function getPublicProfile(userId: string): Promise<CommunityProfileRow | null> {
  const supabase = createSupabaseClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, nickname, role, avatar_url")
    .eq("id", userId)
    .maybeSingle();

  if (!profile) return null;

  const stats = await getProfileStats(userId, supabase).catch(() => DEFAULT_STATS);

  return {
    id: userId,
    email: null,
    name: (profile as { name?: string | null }).name ?? null,
    nickname: (profile as { nickname?: string | null }).nickname ?? null,
    metaName: null,
    avatarUrl: (profile as { avatar_url?: string | null }).avatar_url ?? null,
    role: ((profile as { role?: string | null }).role ?? "user") as CommunityUserRole,
    stats,
  };
}

export async function getCommunityProfile(): Promise<CommunityProfileRow | null> {
  const supabase = createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, nickname, role, avatar_url")
    .eq("id", user.id)
    .single();

  const meta = user.user_metadata || {};
  const metaName = meta.full_name || meta.name || meta.nickname || null;

  const stats = await getProfileStats(user.id, supabase).catch((error) => {
    console.error("community profile stats error:", error.message);
    return DEFAULT_STATS;
  });

  return {
    id: user.id,
    email: user.email ?? null,
    name: profile?.name ?? null,
    nickname: profile?.nickname ?? null,
    role: (profile?.role ?? "user") as CommunityUserRole,
    metaName,
    avatarUrl: profile?.avatar_url ?? meta.avatar_url ?? null,
    stats,
  };
}
