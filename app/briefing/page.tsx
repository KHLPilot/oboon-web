import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import PageContainer from "@/components/shared/PageContainer";
import BriefingCardGrid from "@/features/briefing/components/BriefingCardGrid";
import BriefingEditorPickCard from "@/features/briefing/components/BriefingEditorPickCard";
import BriefingTopList from "@/features/briefing/components/BriefingTopList";
import BriefingOriginalSection from "@/features/briefing/components/oboon-original/BriefingOriginalSection";
import FeaturedHero from "@/features/briefing/components/oboon-original/FeaturedHero";
import { Skeleton } from "@/components/ui/Skeleton";
import { fetchBriefingHomeData } from "@/features/briefing/services/briefing.home";
import { fetchOboonOriginalPageData } from "@/features/briefing/services/briefing.original";
import { briefingHubDescriptions } from "@/shared/briefing-content";
import { seoDefaultOgImage } from "@/shared/seo";

type CategoryRow = {
  id: string;
  key: string;
  name: string;
  coverImageUrl: string | null;
};

export const metadata: Metadata = {
  title: "브리핑",
  description: briefingHubDescriptions.root,
  alternates: {
    canonical: "/briefing",
  },
  openGraph: {
    title: "브리핑 | OBOON",
    description: briefingHubDescriptions.root,
    url: "/briefing",
    images: [seoDefaultOgImage],
  },
  twitter: {
    card: "summary_large_image",
    title: "브리핑 | OBOON",
    description: briefingHubDescriptions.root,
    images: [seoDefaultOgImage],
  },
};

export default async function BriefingPage() {
  const [homeData, originalData] = await Promise.all([
    fetchBriefingHomeData(),
    fetchOboonOriginalPageData(),
  ]);
  const originalDataPromise = Promise.resolve(originalData);

  const { isAdmin, topPosts, editorPicks, recentPosts, generalRecentPosts } = homeData;

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
        <div className="relative">
          <div className="pointer-events-none absolute right-4 top-4 z-20 sm:right-6 sm:top-6">
            <Link
              href="/briefing/about"
              className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/35 px-3 py-1.5 ob-typo-caption font-medium text-white backdrop-blur-md transition-colors hover:border-white/35 hover:bg-black/45"
            >
              브리핑 소개
            </Link>
          </div>
          <FeaturedHero posts={recentPosts} />
        </div>

        <section className="mb-6 mt-14 grid grid-cols-1 gap-12 md:grid-cols-2 md:gap-10">
          <BriefingTopList posts={topPosts} />
          <BriefingEditorPickCard posts={editorPicks} />
        </section>
      </PageContainer>

      <Suspense fallback={<BriefingOriginalSectionSkeleton />}>
        <BriefingOriginalSectionAsync promise={originalDataPromise} />
      </Suspense>

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

async function BriefingOriginalSectionAsync({
  promise,
}: {
  promise: ReturnType<typeof fetchOboonOriginalPageData>;
}) {
  const originalData = await promise;
  const { series } = originalData;
  const catData = series.map((item) => ({
    id: item.id,
    key: item.key,
    name: item.name,
    coverImageUrl: item.coverImageUrl,
  })) as CategoryRow[];
  const categoryCountMap = new Map(series.map((item) => [item.id, item.count]));

  return <BriefingOriginalSection categories={catData} countMap={categoryCountMap} />;
}

function BriefingOriginalSectionSkeleton() {
  return (
    <section className="bg-(--oboon-bg-inverse)">
      <div className="mx-auto w-full max-w-240 px-4 pb-10 pt-6 sm:px-5 lg:max-w-300">
        <div>
          <Skeleton className="h-8 w-40 rounded-lg bg-white/12" animated={false} />
          <Skeleton className="mt-3 h-5 w-56 rounded-lg bg-white/8" animated={false} />
        </div>

        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={`original-skeleton-${index}`}
              className="rounded-[16px] border border-white/10 bg-white/5 p-0 overflow-hidden"
            >
              <Skeleton className="aspect-[4/3] w-full rounded-none bg-white/10" animated={false} />
              <div className="p-4 space-y-2">
                <Skeleton className="h-5 w-4/5 rounded-lg bg-white/10" animated={false} />
                <Skeleton className="h-4 w-16 rounded-lg bg-white/8" animated={false} />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 flex justify-center">
          <Skeleton className="h-12 w-36 rounded-full bg-white/10" animated={false} />
        </div>
      </div>
    </section>
  );
}
