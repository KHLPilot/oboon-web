import { notFound } from "next/navigation";

import PageContainer from "@/components/shared/PageContainer";
import BriefingCardGrid from "@/features/briefing/components/BriefingCardGrid";
import OboonOriginalCategoryHero from "@/features/briefing/components/oboon-original/OboonOriginalCategoryHero";
import { fetchOboonOriginalCategoryPageData } from "@/features/briefing/services/briefing.original.category";

export default async function OboonOriginalCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ categoryKey: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { categoryKey: rawKey } = await params;
  const { page: pageParam } = await searchParams;

  const categoryKey = decodeURIComponent(rawKey);
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);

  const { category, posts, totalCount, pageSize } =
    await fetchOboonOriginalCategoryPageData(categoryKey, page);

  if (!category) notFound();

  const postItems = (posts ?? []) as Array<{
    id: string;
    slug: string;
    title: string;
    excerpt: string | null;
    created_at: string;
    published_at: string | null;
    cover_image_url: string | null;
  }>;

  return (
    <main className="bg-(--oboon-bg-page)">
      <PageContainer className="pb-20">
        <div className="mb-10">
          <OboonOriginalCategoryHero
            name={category.name}
            description={category.description ?? null}
            color={(category as { color?: string | null }).color ?? null}
            coverImageUrl={(category as { cover_image_url?: string | null }).cover_image_url ?? null}
            categoryKey={categoryKey}
            postCount={totalCount}
          />
        </div>

        <BriefingCardGrid
          columns={4}
          posts={postItems.map((p) => ({
            id: p.id,
            href: `/briefing/oboon-original/${encodeURIComponent(
              categoryKey,
            )}/${encodeURIComponent(p.slug)}`,
            slug: p.slug,
            title: p.title,
            excerpt: p.excerpt ?? null,
            created_at: p.created_at,
            published_at: p.published_at ?? null,
            cover_image_url: p.cover_image_url ?? null,
            badgeLabel: category.name,
          }))}
          pagination={{ currentPage: page, totalCount, pageSize }}
        />
      </PageContainer>
    </main>
  );
}
