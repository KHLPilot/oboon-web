import { createSupabaseServer } from "@/lib/supabaseServer";
import { createSupabaseServiceError } from "@/lib/errors";

export const BRIEFING_SEARCH_PAGE_SIZE = 12;

export async function searchBriefingPosts(query: string, page = 1) {
  if (!query.trim()) return { posts: [], totalCount: 0, page, pageSize: BRIEFING_SEARCH_PAGE_SIZE };

  const supabase = await createSupabaseServer();
  const pageSize = BRIEFING_SEARCH_PAGE_SIZE;
  const offset = (Math.max(1, page) - 1) * pageSize;
  const q = `%${query.trim()}%`;

  const { data, error, count } = await supabase
    .from("briefing_posts")
    .select(
      `
      id, slug, title, content_md, created_at, published_at, cover_image_url,
      board:briefing_boards!inner(key),
      category:briefing_categories(key,name)
      `,
      { count: "exact" }
    )
    .eq("status", "published")
    .or(`title.ilike.${q},content_md.ilike.${q}`)
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (error) {
    throw createSupabaseServiceError(error, {
      scope: "briefing.search",
      action: "searchBriefingPosts",
      defaultMessage: "브리핑 검색 중 오류가 발생했습니다.",
      context: { queryLength: query.trim().length, page },
    });
  }

  return {
    posts: data ?? [],
    totalCount: count ?? 0,
    page,
    pageSize,
  };
}
