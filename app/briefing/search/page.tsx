// app/briefing/search/page.tsx
import type { Metadata } from "next";
import PageContainer from "@/components/shared/PageContainer";

import { searchBriefingPosts } from "@/features/briefing/services/briefing.search";
import BriefingSearchField from "@/features/briefing/components/BriefingSearchField.client";
import BriefingCardGrid from "@/features/briefing/components/BriefingCardGrid";
import { buildBriefingSearchMetadata } from "@/shared/briefing-seo";
import { seoDefaultOgImage } from "@/shared/seo";

function pickFirst<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

function getPostHref(post: {
  slug: string;
  board: { key: string } | { key: string }[] | null;
  category: { key: string; name: string } | { key: string; name: string }[] | null;
}) {
  const board = pickFirst(post.board);
  const category = pickFirst(post.category);
  if (board?.key === "oboon_original" && category?.key) {
    return `/briefing/oboon-original/${encodeURIComponent(category.key)}/${encodeURIComponent(post.slug)}`;
  }
  return `/briefing/general/${encodeURIComponent(post.slug)}`;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}): Promise<Metadata> {
  const { q } = await searchParams;
  const seo = buildBriefingSearchMetadata(q ?? "");

  return {
    title: seo.title,
    description: seo.description,
    alternates: {
      canonical: seo.canonicalPath,
    },
    robots: seo.robots,
    openGraph: {
      title: seo.openGraphTitle,
      description: seo.description,
      url: seo.canonicalPath,
      images: [seoDefaultOgImage],
    },
    twitter: {
      card: "summary_large_image",
      title: seo.openGraphTitle,
      description: seo.description,
      images: [seoDefaultOgImage],
    },
  };
}

export default async function BriefingSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q, page: pageParam } = await searchParams;
  const query = (q ?? "").trim();
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);

  const { posts, totalCount, pageSize } = await searchBriefingPosts(query, page);

  return (
    <main className="bg-(--oboon-bg-page)">
      <PageContainer className="pb-20">
        {/* 검색 입력 */}
        <div className="mb-6 mt-2">
          <BriefingSearchField initialQuery={query} autoFocus />
        </div>

        {/* 결과 헤더 */}
        {query && (
          <div className="flex items-center gap-3 mb-5">
            <span className="inline-flex items-center px-3 py-1 rounded-lg bg-(--oboon-bg-subtle) border border-(--oboon-border-default) ob-typo-body font-semibold text-(--oboon-text-title)">
              &ldquo;{query}&rdquo;
            </span>
            <span className="ob-typo-caption text-(--oboon-text-muted)">
              검색 결과{" "}
              <strong className="text-(--oboon-text-body)">{totalCount}개</strong>
            </span>
          </div>
        )}

        {/* 결과 목록 */}
        {posts.length > 0 ? (
          <BriefingCardGrid
            posts={posts.map((p) => ({
              id: p.id,
              href: getPostHref(p),
              slug: p.slug,
              title: p.title,
              excerpt: (p as { excerpt?: string | null }).excerpt ?? null,
              created_at: p.created_at,
              published_at: p.published_at ?? null,
              cover_image_url: p.cover_image_url ?? null,
              badgeLabel: pickFirst(p.category)?.name ?? "브리핑",
            }))}
            pagination={{ currentPage: page, totalCount, pageSize }}
          />
        ) : query ? (
          /* 결과 없음 */
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <span className="text-4xl">🔍</span>
            <p className="ob-typo-h3 text-(--oboon-text-title)">검색 결과가 없습니다</p>
            <p className="ob-typo-body text-(--oboon-text-muted)">
              다른 키워드로 시도해 보세요.
            </p>
          </div>
        ) : (
          /* 쿼리 없음 */
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <span className="text-4xl">✏️</span>
            <p className="ob-typo-body text-(--oboon-text-muted)">
              검색어를 입력하세요.
            </p>
          </div>
        )}
      </PageContainer>
    </main>
  );
}
