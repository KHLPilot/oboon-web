import { createClient } from "@supabase/supabase-js";
import {
  NOTICE_ITEMS,
  type NoticeCategory,
  type NoticeItem,
} from "@/features/notice/data/notices";

function createAnonSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function mapRowToNoticeItem(row: Record<string, unknown>): NoticeItem {
  return {
    id: Number(row.id ?? 0),
    slug: String(row.slug ?? ""),
    title: String(row.title ?? ""),
    summary: String(row.summary ?? ""),
    content: String(row.content ?? ""),
    category: row.category as NoticeItem["category"],
    publishedAt: String(row.published_at ?? ""),
    pinned: row.is_pinned === true,
    maintenance: row.is_maintenance === true,
  };
}

function sortNotices(items: NoticeItem[]) {
  return items
    .slice()
    .sort(
      (a, b) =>
        Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) ||
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    );
}

function getFallbackNotices(category: NoticeCategory) {
  const base =
    category === "all"
      ? NOTICE_ITEMS
      : NOTICE_ITEMS.filter((item) => item.category === category);
  return sortNotices(base);
}

export async function fetchPublicNotices(category: NoticeCategory) {
  const supabase = createAnonSupabase();
  if (!supabase) return getFallbackNotices(category);

  let query = supabase
    .from("notices")
    .select(
      "id, slug, title, summary, content, category, published_at, is_pinned, is_maintenance",
    )
    .eq("is_published", true)
    .order("is_pinned", { ascending: false })
    .order("published_at", { ascending: false });

  if (category !== "all") {
    query = query.eq("category", category);
  }

  const { data, error } = await query;
  if (error || !data || data.length === 0) return getFallbackNotices(category);

  const mapped = data.map((row) => mapRowToNoticeItem(row as Record<string, unknown>));
  return sortNotices(mapped);
}

export async function fetchPublicNoticeBySlug(slug: string) {
  const supabase = createAnonSupabase();
  if (!supabase) return NOTICE_ITEMS.find((item) => item.slug === slug) ?? null;

  const { data, error } = await supabase
    .from("notices")
    .select(
      "id, slug, title, summary, content, category, published_at, is_pinned, is_maintenance",
    )
    .eq("is_published", true)
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) {
    return NOTICE_ITEMS.find((item) => item.slug === slug) ?? null;
  }
  return mapRowToNoticeItem(data as Record<string, unknown>);
}
