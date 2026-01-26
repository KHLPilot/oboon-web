import { createSupabaseServer } from "@/lib/supabaseServer";

export async function ensureBriefingAdminUser() {
  const supabase = createSupabaseServer();
  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr) throw authErr;

  const user = authData.user;
  if (!user) return null;

  const { data: profile, error: profErr } = await supabase
    .from("profiles")
    .select("id, role, deleted_at")
    .eq("id", user.id)
    .maybeSingle();

  if (profErr) throw profErr;
  if (!profile || profile.deleted_at) return null;
  if (profile.role !== "admin") return null;

  return { userId: user.id };
}

export async function fetchBriefingAdminBootstrap() {
  const supabase = createSupabaseServer();
  const admin = await ensureBriefingAdminUser();
  if (!admin) return null;

  const { data: boards, error: boardsErr } = await supabase
    .from("briefing_boards")
    .select("id,key,name")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (boardsErr) throw boardsErr;

  const boardIds = (boards ?? []).map((b: any) => b.id);
  const { data: categories, error: catsErr } = await supabase
    .from("briefing_categories")
    .select("id,key,name,board_id")
    .in("board_id", boardIds)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (catsErr) throw catsErr;

  const { data: tags, error: tagsErr } = await supabase
    .from("briefing_tags")
    .select("id,name,sort_order,is_active")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (tagsErr) throw tagsErr;

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
  contentMd: string;
  coverImageUrl: string;
  intent: "draft" | "publish";
  tagId: string | null;
  userId: string;
}) {
  const supabase = createSupabaseServer();
  const {
    boardId,
    categoryId,
    title,
    contentMd,
    coverImageUrl,
    intent,
    tagId,
    userId,
  } = args;

  const { data: cat, error: catErr } = await supabase
    .from("briefing_categories")
    .select("id, key, board_id, is_active")
    .eq("id", categoryId)
    .maybeSingle();

  if (catErr) throw catErr;
  if (!cat || cat.board_id !== boardId || !cat.is_active) {
    return { ok: false as const, message: "유효하지 않은 카테고리입니다." };
  }

  const { data: rpcData, error: rpcErr } = await supabase.rpc(
    "create_briefing_post_with_seq",
    {
      p_board_id: boardId,
      p_category_id: categoryId,
      p_title: title,
      p_content_md: contentMd,
      p_cover_image_url: coverImageUrl,
      p_intent: intent,
      p_author_profile_id: userId,
      p_tag_id: tagId,
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
