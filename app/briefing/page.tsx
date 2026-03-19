// app/briefing/page.tsx
import PageContainer from "@/components/shared/PageContainer";

import { fetchBriefingHomeData } from "@/features/briefing/services/briefing.home";
import BriefingHeroPost from "@/features/briefing/components/BriefingHeroPost";
import BriefingSearchInput from "@/features/briefing/components/BriefingSearchInput";
import BriefingCardGrid from "@/features/briefing/components/BriefingCardGrid";

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

export default async function BriefingPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);

  const { isAdmin, heroPost, generalPosts, generalTotalCount, pageSize } =
    await fetchBriefingHomeData(page);

  return (
    <main className="bg-(--oboon-bg-page)">
      <PageContainer className="pb-20">
        {/* ===== HERO ===== */}
        {heroPost && page === 1 && (
          <BriefingHeroPost post={heroPost} isAdmin={isAdmin} />
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
