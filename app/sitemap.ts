import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://oboon.co.kr";

const publicPaths = [
  "/",
  "/offerings",
  "/briefing",
  "/briefing/oboon-original",
  "/map",
  "/community",
  "/support",
  "/support/faq",
  "/support/qna",
] as const;

type BoardRow = { key?: string } | { key?: string }[] | null;
type CategoryRow = { key?: string } | { key?: string }[] | null;

function pickFirst<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

async function fetchDynamicUrls(): Promise<MetadataRoute.Sitemap> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return [];

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const [offeringsRes, briefingRes] = await Promise.all([
    supabase
      .from("property_public_snapshots")
      .select("property_id, published_at")
      .order("published_at", { ascending: false })
      .limit(500),
    supabase
      .from("briefing_posts")
      .select(
        `
          slug, created_at, published_at,
          board:briefing_boards!inner(key),
          category:briefing_categories(key)
        `,
      )
      .eq("status", "published")
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  const dynamic: MetadataRoute.Sitemap = [];

  if (!offeringsRes.error && offeringsRes.data) {
    const seenPropertyIds = new Set<number>();
    for (const row of offeringsRes.data) {
      const propertyId = Number(row.property_id);
      if (!Number.isFinite(propertyId) || seenPropertyIds.has(propertyId)) continue;
      seenPropertyIds.add(propertyId);

      dynamic.push({
        url: `${siteUrl}/offerings/${propertyId}`,
        lastModified: row.published_at ? new Date(row.published_at) : new Date(),
        changeFrequency: "daily",
        priority: 0.8,
      });
    }
  }

  if (!briefingRes.error && briefingRes.data) {
    for (const row of briefingRes.data as Array<{
      slug: string | null;
      created_at: string | null;
      published_at: string | null;
      board: BoardRow;
      category: CategoryRow;
    }>) {
      const slug = row.slug ? String(row.slug).trim() : "";
      if (!slug) continue;

      const board = pickFirst(row.board);
      const boardKey = board?.key ? String(board.key) : "";
      const category = pickFirst(row.category);
      const categoryKey = category?.key ? String(category.key) : "";

      let href: string | null = null;
      if (boardKey === "general") {
        href = `/briefing/general/${encodeURIComponent(slug)}`;
      } else if (boardKey === "oboon_original" && categoryKey) {
        href = `/briefing/oboon-original/${encodeURIComponent(categoryKey)}/${encodeURIComponent(slug)}`;
      }

      if (!href) continue;

      dynamic.push({
        url: `${siteUrl}${href}`,
        lastModified: row.published_at
          ? new Date(row.published_at)
          : row.created_at
            ? new Date(row.created_at)
            : new Date(),
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
  }

  return dynamic;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const dynamicUrls = await fetchDynamicUrls();

  const staticUrls: MetadataRoute.Sitemap = publicPaths.map((path) => ({
    url: `${siteUrl}${path}`,
    lastModified: now,
    changeFrequency: path === "/" ? "daily" : "weekly",
    priority: path === "/" ? 1 : 0.7,
  }));

  return [...staticUrls, ...dynamicUrls];
}
