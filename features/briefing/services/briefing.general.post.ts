import { createSupabaseServer } from "@/lib/supabaseServer";
import { createSupabaseServiceError } from "@/lib/errors";

export async function fetchGeneralPostPageData(slug: string) {
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
    content_md,
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
      scope: "briefing.general.post",
      action: "fetchGeneralPostPageData.post",
      defaultMessage: "브리핑 게시글 조회 중 오류가 발생했습니다.",
      context: { slug },
    });
  }

  const { data: relatedData, error: relErr } = await supabase
    .from("briefing_posts")
    .select("id, slug, title, content_md")
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

  return {
    isAdmin,
    boardId,
    post: data,
    relatedPosts: relatedData ?? [],
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
