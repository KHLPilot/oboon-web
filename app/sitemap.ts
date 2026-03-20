import type { MetadataRoute } from "next";
import {
  fetchPublishedBriefingPostsForSitemap,
  type BriefingSitemapPostRow,
} from "@/features/briefing/services/briefing.home";
import {
  fetchOfferingSnapshotsForSitemap,
  type OfferingSitemapSnapshotRow,
} from "@/features/offerings/services/offering.query";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://oboon.co.kr";

const publicPaths = [
  "/",
  "/offerings",
  "/briefing",
  "/briefing/oboon-original",
  "/community",
  "/notice",
  "/support",
  "/support/faq",
  "/support/qna",
] as const;

function pickFirst<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function toDateOrNull(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function latestDateOf(values: Array<Date | null | undefined>): Date | null {
  let latest: Date | null = null;
  for (const value of values) {
    if (!value) continue;
    if (!latest || value.getTime() > latest.getTime()) latest = value;
  }
  return latest;
}

async function fetchDynamicUrls(): Promise<{
  urls: MetadataRoute.Sitemap;
  latestOfferingModified: Date | null;
  latestBriefingModified: Date | null;
}> {
  const [offeringSnapshots, briefingPosts] = await Promise.all([
    fetchOfferingSnapshotsForSitemap(500),
    fetchPublishedBriefingPostsForSitemap(500),
  ]);

  const dynamic: MetadataRoute.Sitemap = [];
  let latestOfferingModified: Date | null = null;
  let latestBriefingModified: Date | null = null;

  if (offeringSnapshots.length > 0) {
    const seenPropertyIds = new Set<number>();
    for (const row of offeringSnapshots as OfferingSitemapSnapshotRow[]) {
      const propertyId = Number(row.property_id);
      if (!Number.isFinite(propertyId) || seenPropertyIds.has(propertyId)) continue;
      seenPropertyIds.add(propertyId);
      const modifiedAt = toDateOrNull(row.published_at);
      latestOfferingModified = latestDateOf([latestOfferingModified, modifiedAt]);

      dynamic.push({
        url: `${siteUrl}/offerings/${propertyId}`,
        lastModified: modifiedAt ?? new Date(),
        changeFrequency: "daily",
        priority: 0.8,
      });
    }
  }

  if (briefingPosts.length > 0) {
    for (const row of briefingPosts as BriefingSitemapPostRow[]) {
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
      const modifiedAt = toDateOrNull(row.published_at) ?? toDateOrNull(row.created_at);
      latestBriefingModified = latestDateOf([latestBriefingModified, modifiedAt]);

      dynamic.push({
        url: `${siteUrl}${href}`,
        lastModified: modifiedAt ?? new Date(),
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
  }

  return {
    urls: dynamic,
    latestOfferingModified,
    latestBriefingModified,
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const generatedAt = new Date();
  const { urls: dynamicUrls, latestOfferingModified, latestBriefingModified } =
    await fetchDynamicUrls();
  const latestSiteModified = latestDateOf([
    latestOfferingModified,
    latestBriefingModified,
    generatedAt,
  ]) ?? generatedAt;

  const staticRouteMeta: Record<
    (typeof publicPaths)[number],
    { changeFrequency: "daily" | "weekly"; priority: number; lastModified: Date }
  > = {
    "/": {
      changeFrequency: "daily",
      priority: 1,
      lastModified: latestSiteModified,
    },
    "/offerings": {
      changeFrequency: "daily",
      priority: 0.8,
      lastModified: latestOfferingModified ?? latestSiteModified,
    },
    "/briefing": {
      changeFrequency: "weekly",
      priority: 0.7,
      lastModified: latestBriefingModified ?? latestSiteModified,
    },
    "/briefing/oboon-original": {
      changeFrequency: "weekly",
      priority: 0.7,
      lastModified: latestBriefingModified ?? latestSiteModified,
    },
    "/community": {
      changeFrequency: "weekly",
      priority: 0.7,
      lastModified: latestSiteModified,
    },
    "/notice": {
      changeFrequency: "weekly",
      priority: 0.7,
      lastModified: latestSiteModified,
    },
    "/support": {
      changeFrequency: "weekly",
      priority: 0.7,
      lastModified: latestSiteModified,
    },
    "/support/faq": {
      changeFrequency: "weekly",
      priority: 0.7,
      lastModified: latestSiteModified,
    },
    "/support/qna": {
      changeFrequency: "weekly",
      priority: 0.7,
      lastModified: latestSiteModified,
    },
  };

  const staticUrls: MetadataRoute.Sitemap = publicPaths.map((path) => ({
    url: `${siteUrl}${path}`,
    lastModified: staticRouteMeta[path].lastModified,
    changeFrequency: staticRouteMeta[path].changeFrequency,
    priority: staticRouteMeta[path].priority,
  }));

  return [...staticUrls, ...dynamicUrls];
}
