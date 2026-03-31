import Link from "next/link";

import PageContainer from "@/components/shared/PageContainer";
import BriefingCardGrid from "@/features/briefing/components/BriefingCardGrid";
import BriefingEditorPickCard from "@/features/briefing/components/BriefingEditorPickCard";
import BriefingTopList from "@/features/briefing/components/BriefingTopList";
import BriefingOriginalSection from "@/features/briefing/components/oboon-original/BriefingOriginalSection";
import FeaturedHero from "@/features/briefing/components/oboon-original/FeaturedHero";
import { fetchBriefingHomeData } from "@/features/briefing/services/briefing.home";
import { fetchOboonOriginalPageData } from "@/features/briefing/services/briefing.original";

type CategoryRow = {
  id: string;
  key: string;
  name: string;
};

export default async function BriefingPage() {
  const [homeData, originalData] = await Promise.all([
    fetchBriefingHomeData(),
    fetchOboonOriginalPageData(),
  ]);

  const { isAdmin, topPosts, editorPicks, recentPosts, generalRecentPosts } = homeData;
  const { series } = originalData;
  const catData = series.map((item) => ({
    id: item.id,
    key: item.key,
    name: item.name,
  })) as CategoryRow[];
  const categoryCountMap = new Map(series.map((item) => [item.id, item.count]));

  return (
    <main className="bg-(--oboon-bg-page)">
      <PageContainer className="pb-0">
        {isAdmin && (
          <div className="mb-3 flex justify-end gap-2">
            <Link
              href="/briefing/editor"
              className="inline-flex items-center gap-1.5 rounded-lg border border-(--oboon-border-default) bg-(--oboon-bg-surface) px-3 py-1.5 ob-typo-caption font-semibold text-(--oboon-text-body) transition-colors hover:border-(--oboon-primary) hover:text-(--oboon-primary)"
            >
              대시보드
            </Link>
            <Link
              href="/briefing/admin/posts/new"
              className="inline-flex items-center gap-1.5 rounded-lg border border-(--oboon-border-default) bg-(--oboon-bg-surface) px-3 py-1.5 ob-typo-caption font-semibold text-(--oboon-text-body) transition-colors hover:border-(--oboon-primary) hover:text-(--oboon-primary)"
            >
              + 글쓰기
            </Link>
          </div>
        )}
        <FeaturedHero posts={recentPosts} />

        <section className="mb-6 mt-14 grid grid-cols-1 gap-12 md:grid-cols-2 md:gap-10">
          <BriefingTopList posts={topPosts} />
          <BriefingEditorPickCard posts={editorPicks} />
        </section>
      </PageContainer>

      <BriefingOriginalSection categories={catData} countMap={categoryCountMap} />

      <PageContainer className="pb-20 pt-14">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <div className="ob-typo-h2 text-(--oboon-text-title)">최신 브리핑</div>
            <div className="mt-1 ob-typo-caption text-(--oboon-text-muted)">
              새로 올라온 브리핑 글을 확인하세요
            </div>
          </div>
          <Link
            href="/briefing/general"
            className="ob-typo-caption text-(--oboon-text-muted) transition-colors hover:text-(--oboon-text-title)"
          >
            전체 보기 →
          </Link>
        </div>

        <BriefingCardGrid
          columns={4}
          posts={generalRecentPosts.map((post) => ({
            id: post.id,
            href: `/briefing/general/${encodeURIComponent(post.slug)}`,
            slug: post.slug,
            title: post.title,
            excerpt: null,
            created_at: post.created_at,
            published_at: post.published_at ?? null,
            cover_image_url: post.cover_image_url ?? null,
            badgeLabel: post.category?.name ?? null,
          }))}
        />
      </PageContainer>
    </main>
  );
}
