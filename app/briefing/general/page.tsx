import type { Metadata } from "next";
import Link from "next/link";

import PageContainer from "@/components/shared/PageContainer";
import BriefingCardGrid from "@/features/briefing/components/BriefingCardGrid";
import BriefingSearchInput from "@/features/briefing/components/BriefingSearchInput";
import OboonOriginalCategoryHero from "@/features/briefing/components/oboon-original/OboonOriginalCategoryHero";
import { briefingGeneralMetadata } from "@/shared/briefing-content";
import { seoDefaultOgImage } from "@/shared/seo";
import { fetchGeneralBriefingPageData } from "@/features/briefing/services/briefing.general";

export const metadata: Metadata = {
  title: briefingGeneralMetadata.title,
  description: briefingGeneralMetadata.description,
  alternates: {
    canonical: briefingGeneralMetadata.canonicalPath,
  },
  openGraph: {
    title: briefingGeneralMetadata.openGraphTitle,
    description: briefingGeneralMetadata.description,
    url: briefingGeneralMetadata.canonicalPath,
    images: [seoDefaultOgImage],
  },
  twitter: {
    card: "summary_large_image",
    title: briefingGeneralMetadata.openGraphTitle,
    description: briefingGeneralMetadata.description,
    images: [seoDefaultOgImage],
  },
};

function pickFirst<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function pickPrimaryTagName(post: {
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
}) {
  const items = post.post_tags ?? [];
  const activeTags = items
    .map((item) => pickFirst(item?.tag))
    .filter(
      (
        tag,
      ): tag is {
        id: string;
        name: string;
        sort_order: number | null;
        is_active: boolean;
      } => Boolean(tag && tag.is_active),
    );

  if (activeTags.length === 0) return null;

  activeTags.sort((left, right) => {
    const leftOrder = typeof left.sort_order === "number" ? left.sort_order : 0;
    const rightOrder =
      typeof right.sort_order === "number" ? right.sort_order : 0;

    if (leftOrder !== rightOrder) return leftOrder - rightOrder;
    return left.name.localeCompare(right.name);
  });

  return activeTags[0]?.name ?? null;
}

function pickCategoryName(
  value: { name?: string } | { name?: string }[] | null,
): string | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0]?.name ?? null) : (value.name ?? null);
}

export default async function BriefingGeneralPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);

  const { isAdmin, posts, totalCount, pageSize, heroCoverImageUrl } =
    await fetchGeneralBriefingPageData(page);

  return (
    <main className="bg-(--oboon-bg-page)">
      <PageContainer className="pb-20">
        {isAdmin && (
          <div className="mb-3 flex justify-end">
            <Link
              href="/briefing/admin/posts/new"
              className="inline-flex items-center gap-1.5 rounded-lg border border-(--oboon-border-default) bg-(--oboon-bg-surface) px-3 py-1.5 ob-typo-caption font-semibold text-(--oboon-text-body) transition-colors hover:border-(--oboon-primary) hover:text-(--oboon-primary)"
            >
              + 글쓰기
            </Link>
          </div>
        )}

        <div className="mb-10">
          <OboonOriginalCategoryHero
            name="일반 브리핑"
            description={briefingGeneralMetadata.description}
            color={null}
            categoryKey="general"
            postCount={totalCount}
            coverImageUrl={heroCoverImageUrl}
            eyebrowLabel="브리핑"
            countLabel="브리핑"
          />
        </div>

        <div className="mb-5 flex items-center justify-between gap-3 rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) px-4 py-3">
          <div className="min-w-0">
            <div className="ob-typo-caption font-semibold text-(--oboon-text-title)">
              브리핑 소개
            </div>
            <div className="mt-1 ob-typo-caption text-(--oboon-text-muted)">
              저자 표기 방식, 편집 원칙, 출처 기준을 확인할 수 있습니다.
            </div>
          </div>
          <Link
            href="/briefing/about"
            className="shrink-0 ob-typo-caption font-medium text-(--oboon-primary) transition-colors hover:text-(--oboon-primary-strong)"
          >
            자세히 보기
          </Link>
        </div>

        <div className="mb-8">
          <BriefingSearchInput />
        </div>

        <BriefingCardGrid
          columns={4}
          posts={posts.map((post) => ({
            id: post.id,
            href: `/briefing/general/${encodeURIComponent(post.slug)}`,
            slug: post.slug,
            title: post.title,
            excerpt: post.excerpt ?? null,
            created_at: post.created_at,
            published_at: post.published_at ?? null,
            cover_image_url: post.cover_image_url ?? null,
            badgeLabel:
              pickPrimaryTagName(post) ?? pickCategoryName(post.category) ?? "브리핑",
          }))}
          pagination={{ currentPage: page, totalCount, pageSize }}
        />
      </PageContainer>
    </main>
  );
}
