import { createSupabaseServer } from "@/lib/supabaseServer";

export async function fetchBriefingHomeData() {
  const supabase = createSupabaseServer();

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

  const { data: ob, error: obErr } = await supabase
    .from("briefing_boards")
    .select("id")
    .eq("key", "oboon_original")
    .single();
  if (obErr) throw obErr;

  const { data: heroData, error: heroErr } = await supabase
    .from("briefing_posts")
    .select(
      `
      id, slug, title, content_md, created_at, published_at, cover_image_url,
      board:briefing_boards!inner(key),
      category:briefing_categories(key,name)
    `,
    )
    .eq("status", "published")
    .eq("board.key", "oboon_original")
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (heroErr) throw heroErr;

  const { data: tagData, error: tagErr } = await supabase
    .from("briefing_tags")
    .select("key,name")
    .eq("is_active", true)
    .order("sort_order");
  if (tagErr) throw tagErr;

  const { data: generalData, error: generalErr } = await supabase
    .from("briefing_posts")
    .select(
      `
      id, slug, title, content_md, created_at, published_at, cover_image_url,
      board:briefing_boards!inner(key),
      category:briefing_categories(key,name),
      post_tags:briefing_post_tags(
        tag:briefing_tags(id,key,name,sort_order,is_active)
      )
      `,
    )
    .eq("status", "published")
    .eq("board.key", "general")
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(20);
  if (generalErr) throw generalErr;

  return {
    isAdmin,
    oboonOriginalBoardId: ob.id as string,
    heroPost: heroData ?? null,
    tagData: tagData ?? [],
    generalPosts: generalData ?? [],
  };
}
