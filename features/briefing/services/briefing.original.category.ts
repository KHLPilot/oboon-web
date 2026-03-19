import { createSupabaseServer } from "@/lib/supabaseServer";

export const BRIEFING_CATEGORY_PAGE_SIZE = 8;

export async function fetchOboonOriginalCategoryPageData(categoryKey: string, page = 1) {
  const supabase = await createSupabaseServer();
  const pageSize = BRIEFING_CATEGORY_PAGE_SIZE;
  const offset = (Math.max(1, page) - 1) * pageSize;

  const { data: board, error: boardErr } = await supabase
    .from("briefing_boards")
    .select("id,key")
    .eq("key", "oboon_original")
    .maybeSingle();

  if (boardErr) throw boardErr;
  if (!board?.id) {
    throw new Error(
      'briefing_boards에서 key="oboon_original" 보드를 찾지 못했습니다',
    );
  }

  const { data: cat, error: catErr } = await supabase
    .from("briefing_categories")
    .select("id,key,name,description")
    .eq("board_id", board.id)
    .eq("key", categoryKey)
    .maybeSingle();

  if (catErr) throw catErr;

  const { data: postsData, error: postsErr, count: postsCount } = await supabase
    .from("briefing_posts")
    .select(
      `
      id, slug, title, content_md, created_at, published_at, cover_image_url,
      category:briefing_categories(key,name)
    `,
      { count: "exact" }
    )
    .eq("status", "published")
    .eq("board_id", board.id)
    .eq("category_id", cat?.id ?? "")
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (postsErr) throw postsErr;

  const { data: tagData, error: tagErr } = await supabase
    .from("briefing_tags")
    .select("key,name")
    .eq("is_active", true)
    .order("sort_order");

  if (tagErr) throw tagErr;

  return {
    board,
    category: cat,
    posts: postsData ?? [],
    tags: tagData ?? [],
    totalCount: postsCount ?? 0,
    page,
    pageSize,
  };
}
