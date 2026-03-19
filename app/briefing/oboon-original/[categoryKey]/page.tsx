// app/briefing/oboon-original/[categoryKey]/page.tsx
import { notFound } from "next/navigation";

import PageContainer from "@/components/shared/PageContainer";
import Card from "@/components/ui/Card";

import { fetchOboonOriginalCategoryPageData } from "@/features/briefing/services/briefing.original.category";
import { Cover, cx } from "@/features/briefing/components/briefing.ui";
import BriefingCardGrid from "@/features/briefing/components/BriefingCardGrid";

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

  const heroDesc = category.description ?? "";
  const postItems = (posts ?? []) as Array<{
    id: string;
    slug: string;
    title: string;
    content_md: string | null;
    created_at: string;
    published_at: string | null;
    cover_image_url: string | null;
  }>;

  return (
    <main className="bg-(--oboon-bg-page)">
      <PageContainer className="pb-20">
        {/* ===== HERO ===== */}
        <div className="mb-10">
          <Card className="p-5 overflow-hidden shadow-none h-125">
            <div className="grid grid-cols-1 md:grid-cols-2 h-full gap-5">
              {/* left */}
              <div className="relative h-full">
                <div className="flex h-full flex-col">
                  {/* 중앙 카피 */}
                  <div className="flex-1 flex items-center justify-end">
                    <div
                      className={cx(
                        "ob-typo-h3 text-(--oboon-text-muted)",
                        "text-right",
                        "break-keep",
                        "max-w-60",
                      )}
                    >
                      {heroDesc}
                    </div>
                  </div>

                  {/* 하단: 타이틀 */}
                  <div className="flex items-end justify-between gap-5">
                    <div className="ob-typo-display text-(--oboon-text-title)">
                      {category.name}
                    </div>
                  </div>
                </div>
              </div>

              {/* right image */}
              <div className="h-full">
                <div className="relative h-full w-full overflow-hidden rounded-2xl border border-(--oboon-border-default)">
                  <Cover
                    mode="fill"
                    imageUrl={undefined}
                    className="h-full w-full"
                  />
                </div>
              </div>
            </div>
          </Card>
        </div>

        <BriefingCardGrid
          posts={postItems.map((p) => ({
            id: p.id,
            href: `/briefing/oboon-original/${encodeURIComponent(
              categoryKey,
            )}/${encodeURIComponent(p.slug)}`,
            slug: p.slug,
            title: p.title,
            content_md: p.content_md ?? null,
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
