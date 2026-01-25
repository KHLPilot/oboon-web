import { createSupabaseClient } from "@/lib/supabaseClient";

import type {
  CommunityProfileRow,
  CommunityProfileStats,
  CommunityUserRole,
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

export async function getCommunityProfile(): Promise<CommunityProfileRow | null> {
  const supabase = createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, nickname, role")
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
    avatarUrl: meta.avatar_url ?? null,
    stats,
  };
}
