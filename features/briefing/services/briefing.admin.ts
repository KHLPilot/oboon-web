import { createSupabaseServiceError } from "@/lib/errors";
import { createSupabaseServer } from "@/lib/supabaseServer";

function throwBriefingAdminError(
  action: string,
  error: { code?: string | null; hint?: string | null; details?: string | null; message?: string | null } | null | undefined,
  defaultMessage: string,
  context?: Record<string, string>,
): never | void {
  if (!error) return;

  throw createSupabaseServiceError(error, {
    scope: "briefing.admin",
    action,
    defaultMessage,
    context,
  });
}

export async function ensureBriefingAdminUser() {
  const supabase = await createSupabaseServer();
  const { data: authData, error: authErr } = await supabase.auth.getUser();
  throwBriefingAdminError(
    "ensureBriefingAdminUser.auth",
    authErr,
    "관리자 인증 정보를 확인하지 못했습니다.",
  );

  const user = authData.user;
  if (!user) return null;

  const { data: profile, error: profErr } = await supabase
    .from("profiles")
    .select("id, role, deleted_at")
    .eq("id", user.id)
    .maybeSingle();

  throwBriefingAdminError(
    "ensureBriefingAdminUser.profile",
    profErr,
    "관리자 프로필을 확인하지 못했습니다.",
  );
  if (!profile || profile.deleted_at) return null;
  if (profile.role !== "admin") return null;

  return { userId: user.id };
}

export async function fetchBriefingAdminBootstrap() {
  const supabase = await createSupabaseServer();
  const admin = await ensureBriefingAdminUser();
  if (!admin) return null;

  const { data: boards, error: boardsErr } = await supabase
    .from("briefing_boards")
    .select("id,key,name")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  throwBriefingAdminError(
    "fetchBriefingAdminBootstrap.boards",
    boardsErr,
    "브리핑 보드 목록을 불러오지 못했습니다.",
  );

  const boardIds = (boards ?? []).map((b) => b.id);
  const { data: categories, error: catsErr } = await supabase
    .from("briefing_categories")
    .select("id,key,name,board_id")
    .in("board_id", boardIds)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  throwBriefingAdminError(
    "fetchBriefingAdminBootstrap.categories",
    catsErr,
    "브리핑 카테고리 목록을 불러오지 못했습니다.",
  );

  const { data: tags, error: tagsErr } = await supabase
    .from("briefing_tags")
    .select("id,name,sort_order,is_active")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  throwBriefingAdminError(
    "fetchBriefingAdminBootstrap.tags",
    tagsErr,
    "브리핑 태그 목록을 불러오지 못했습니다.",
  );

  return {
    userId: admin.userId,
    boards: boards ?? [],
    categories: categories ?? [],
    tags: tags ?? [],
  };
}

export async function createBriefingPostWithSeq(args: {
  boardId: string;
  categoryId: string;
  title: string;
  contentHtml: string;
  coverImageUrl: string;
  intent: "draft" | "publish";
  tagId: string | null;
  isEditorPick: boolean;
  userId: string;
}) {
  const supabase = await createSupabaseServer();
  const {
    boardId,
    categoryId,
    title,
    contentHtml,
    coverImageUrl,
    intent,
    tagId,
    isEditorPick,
    userId,
  } = args;

  const { data: cat, error: catErr } = await supabase
    .from("briefing_categories")
    .select("id, key, board_id, is_active")
    .eq("id", categoryId)
    .maybeSingle();

  throwBriefingAdminError(
    "createBriefingPostWithSeq.category",
    catErr,
    "선택한 카테고리를 확인하지 못했습니다.",
    { categoryId },
  );
  if (!cat || cat.board_id !== boardId || !cat.is_active) {
    return { ok: false as const, message: "유효하지 않은 카테고리입니다." };
  }

  const { data: rpcData, error: rpcErr } = await supabase.rpc(
    "create_briefing_post_with_seq",
    {
      p_board_id: boardId,
      p_category_id: categoryId,
      p_title: title,
      p_content_html: contentHtml,
      p_cover_image_url: coverImageUrl,
      p_intent: intent,
      p_user_id: userId,
      p_tag_id: tagId,
      p_is_editor_pick: isEditorPick,
    },
  );

  if (rpcErr) {
    return {
      ok: false as const,
      message: `저장에 실패했습니다: ${rpcErr.message}`,
    };
  }

  const inserted = Array.isArray(rpcData) ? rpcData[0] : rpcData;
  const slug = inserted?.slug ? String(inserted.slug) : "";
  if (!slug) {
    return {
      ok: false as const,
      message:
        "저장 결과에서 slug를 확인할 수 없습니다. RPC 반환 값을 확인해주세요.",
    };
  }

  return { ok: true as const, slug, categoryKey: cat.key };
}

export async function fetchBriefingPostForEdit(postId: string) {
  const supabase = await createSupabaseServer();
  const admin = await ensureBriefingAdminUser();
  if (!admin) return null;

  const { data: post, error } = await supabase
    .from("briefing_posts")
    .select(
      "id, slug, title, content_html, cover_image_url, is_editor_pick, status, board_id, category_id, post_tags:briefing_post_tags(tag_id)",
    )
    .eq("id", postId)
    .maybeSingle();

  throwBriefingAdminError(
    "fetchBriefingPostForEdit.post",
    error,
    "수정할 브리핑 글을 불러오지 못했습니다.",
    { postId },
  );
  if (!post) return null;

  const tagId =
    Array.isArray(post.post_tags) && post.post_tags.length > 0
      ? (post.post_tags[0] as { tag_id: string }).tag_id
      : null;

  return {
    id: post.id as string,
    slug: post.slug as string,
    title: post.title as string,
    contentHtml: (post.content_html as string | null) ?? "",
    coverImageUrl: (post.cover_image_url as string | null) ?? "",
    status: post.status as "draft" | "published",
    isEditorPick: Boolean(post.is_editor_pick),
    boardId: post.board_id as string,
    categoryId: post.category_id as string,
    tagId,
  };
}

export async function updateBriefingPost(args: {
  postId: string;
  title: string;
  contentHtml: string;
  coverImageUrl: string;
  intent: "draft" | "publish";
  tagId: string | null;
  isEditorPick: boolean;
  userId: string;
}) {
  const supabase = await createSupabaseServer();
  const { postId, title, contentHtml, coverImageUrl, intent, tagId, isEditorPick } = args;

  const now = new Date().toISOString();
  const status = intent === "publish" ? "published" : "draft";
  const publishedAt = intent === "publish" ? now : undefined;

  const updatePayload: Record<string, unknown> = {
    title,
    content_html: contentHtml,
    cover_image_url: coverImageUrl || null,
    is_editor_pick: isEditorPick,
    status,
    updated_at: now,
  };
  if (publishedAt) updatePayload.published_at = publishedAt;

  const { error: updateErr } = await supabase
    .from("briefing_posts")
    .update(updatePayload)
    .eq("id", postId);

  if (updateErr) {
    return { ok: false as const, message: `수정 실패: ${updateErr.message}` };
  }

  const { error: delTagErr } = await supabase
    .from("briefing_post_tags")
    .delete()
    .eq("post_id", postId);

  if (delTagErr) {
    return {
      ok: false as const,
      message: `태그 삭제 실패: ${delTagErr.message}`,
    };
  }

  if (tagId) {
    const { error: insTagErr } = await supabase
      .from("briefing_post_tags")
      .insert({ post_id: postId, tag_id: tagId });

    if (insTagErr && insTagErr.code !== "23505") {
      return {
        ok: false as const,
        message: `태그 할당 실패: ${insTagErr.message}`,
      };
    }
  }

  return { ok: true as const };
}
