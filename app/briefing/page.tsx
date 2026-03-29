// app/briefing/page.tsx
import Link from "next/link";

import PageContainer from "@/components/shared/PageContainer";

import { fetchBriefingHomeData } from "@/features/briefing/services/briefing.home";
import { fetchOboonOriginalPageData } from "@/features/briefing/services/briefing.original";
import BriefingSearchInput from "@/features/briefing/components/BriefingSearchInput";
import BriefingCardGrid from "@/features/briefing/components/BriefingCardGrid";
import FeaturedHero from "@/features/briefing/components/oboon-original/FeaturedHero";
import BriefingOriginalCard from "@/features/briefing/components/oboon-original/BriefingOriginalCard";

type PostRow = {
  id: string;
  slug: string;
  title: string;
  content_md: string | null;
  created_at: string;
  published_at?: string | null;
  cover_image_url: string | null;
  board: { key: string } | { key: string }[] | null;
  category:
    | { key: string; name: string }
    | { key: string; name: string }[]
    | null;
  post_tags?:
    | {
        tag:
          | {
              id: string;
              name: string;
              sort_order: number | null;
              is_active: boolean;
            }
          | {
              id: string;
              name: string;
              sort_order: number | null;
              is_active: boolean;
            }[]
          | null;
      }[]
    | null;
};

function pickFirst<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

function pickPrimaryTagName(post: PostRow): string | null {
  const items = post.post_tags ?? [];
  const activeTags = items
    .map((x) => pickFirst(x?.tag))
    .filter(
      (
        t,
      ): t is {
        id: string;
        name: string;
        sort_order: number | null;
        is_active: boolean;
      } => Boolean(t && t.is_active),
    );

  if (activeTags.length === 0) return null;

  activeTags.sort((a, b) => {
    const ao = typeof a.sort_order === "number" ? a.sort_order : 0;
    const bo = typeof b.sort_order === "number" ? b.sort_order : 0;
    if (ao !== bo) return ao - bo;
    return String(a.name ?? "").localeCompare(String(b.name ?? ""));
  });

  return activeTags[0]?.name ?? null;
}

function pickName(
  v: { name?: string } | { name?: string }[] | null,
): string | null {
  if (!v) return null;
  return Array.isArray(v) ? (v?.[0]?.name ?? null) : (v?.name ?? null);
}

type CategoryRow = {
  id: string;
  key: string;
  name: string;
};

export default async function BriefingPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);

  const [homeData, originalData] = await Promise.all([
    fetchBriefingHomeData(page),
    fetchOboonOriginalPageData(),
  ]);

  const { isAdmin, generalPosts, generalTotalCount, pageSize } = homeData;
  const { featuredPosts, categories, categoryCountMap } = originalData;

  const catData = (categories ?? []) as CategoryRow[];

  return (
    <main className="bg-(--oboon-bg-page)">
      <PageContainer className="pb-20">
        {/* ===== OBOON Original Featured Hero ===== */}
        {page === 1 && featuredPosts.length > 0 && (
          <div className="mb-6">
            <FeaturedHero posts={featuredPosts} isAdmin={isAdmin} />
          </div>
        )}

        {/* ===== 카테고리 카드 (시리즈 탐색) ===== */}
        {page === 1 && catData.length > 0 && (
          <div className="mb-10">
            <div className="mb-3 flex items-end justify-between">
              <div className="ob-typo-h3 text-(--oboon-text-title)">
                오리지널 시리즈
              </div>
              <Link
                href="/briefing/oboon-original"
                className="ob-typo-caption text-(--oboon-text-muted) transition-colors hover:text-(--oboon-text-title)"
              >
                전체 보기 →
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {catData.slice(0, 8).map((c) => (
                <BriefingOriginalCard
                  key={c.id}
                  original={{
                    key: c.key,
                    name: c.name,
                    description: null,
                    coverImageUrl: null,
                  }}
                  count={categoryCountMap.get(c.id) ?? 0}
                  href={`/briefing/oboon-original/${encodeURIComponent(c.key)}`}
                />
              ))}
            </div>
          </div>
        )}

        {/* ===== 구분선 ===== */}
        {page === 1 && (
          <hr className="mb-10 border-(--oboon-border-default)" />
        )}

        {/* ===== 검색바 ===== */}
        <div className="mb-8">
          <BriefingSearchInput />
        </div>

        {/* ===== 일반 브리핑 ===== */}
        <div className="mb-4">
          <div className="flex items-end justify-between gap-3">
            <div className="ob-typo-h2 text-(--oboon-text-title)">
              일반 브리핑
            </div>
          </div>
          <div className="mt-1 ob-typo-caption text-(--oboon-text-muted)">
            단일 주제로 정리된 최신 브리핑 글입니다.
          </div>
        </div>
        <BriefingCardGrid
          posts={generalPosts.map((p) => ({
            id: p.id,
            href: `/briefing/general/${encodeURIComponent(p.slug)}`,
            slug: p.slug,
            title: p.title,
            content_md: p.content_md ?? null,
            created_at: p.created_at,
            published_at: p.published_at ?? null,
            cover_image_url: p.cover_image_url ?? null,
            badgeLabel:
              pickPrimaryTagName(p) ?? pickName(p.category) ?? "브리핑",
          }))}
          pagination={{ currentPage: page, totalCount: generalTotalCount, pageSize }}
        />
      </PageContainer>
    </main>
  );
}
