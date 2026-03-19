// app/briefing/search/page.tsx
import PageContainer from "@/components/shared/PageContainer";

import { searchBriefingPosts } from "@/features/briefing/services/briefing.search";
import BriefingSearchInput from "@/features/briefing/components/BriefingSearchInput";
import BriefingCardGrid from "@/features/briefing/components/BriefingCardGrid";

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
          <BriefingSearchInput initialQuery={query} />
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
              content_md: p.content_md ?? null,
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
