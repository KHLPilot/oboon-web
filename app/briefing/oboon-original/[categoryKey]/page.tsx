// app/briefing/oboon-original/[categoryKey]/page.tsx
import { notFound } from "next/navigation";

import PageContainer from "@/components/shared/PageContainer";
import Card from "@/components/ui/Card";

import { fetchOboonOriginalCategoryPageData } from "@/features/briefing/services/briefing.original.category";
import { Cover, cx } from "@/features/briefing/components/briefing.ui";
import BriefingCardGrid from "@/features/briefing/components/BriefingCardGrid";

type PostRow = {
  id: string;
  slug: string;
  title: string;
  content_md: string | null;
  created_at: string;
  published_at: string | null;
  cover_image_url: string | null;
  category:
    | { key: string; name: string }
    | { key: string; name: string }[]
    | null;
};

type CategoryRow = {
  id: string;
  key: string;
  name: string;
  description: string | null;
};

type TagRow = {
  id: string;
  key: string;
  name: string;
};

function pickPrimaryTagName(post: any): string | null {
  const items = (post?.post_tags ?? []) as any[];
  const activeTags = items.map((x) => x?.tag).filter((t) => t && t.is_active);

  if (activeTags.length === 0) return null;

  activeTags.sort((a, b) => {
    const ao = typeof a.sort_order === "number" ? a.sort_order : 0;
    const bo = typeof b.sort_order === "number" ? b.sort_order : 0;
    if (ao !== bo) return ao - bo;
    return String(a.name ?? "").localeCompare(String(b.name ?? ""));
  });

  return activeTags[0]?.name ?? null;
}

function stripMd(md: string) {
  return md
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]*`/g, "")
    .replace(/!\[[^\]]*]\([^)]*\)/g, "")
    .replace(/\[[^\]]*]\([^)]*\)/g, "")
    .replace(/[#>*_~\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export default async function OboonOriginalCategoryPage({
  params,
}: {
  params: { categoryKey: string };
}) {
  const categoryKey = decodeURIComponent(params.categoryKey);

  // board_id 확보 (DB key: oboon_original)
  const { board, category, posts, tags } =
    await fetchOboonOriginalCategoryPageData(categoryKey);

  if (!category) notFound();

  const boardId = board.id;
  const postsData = posts;
  const tagData = tags;

  const tagMap = new Map<string, TagRow>();
  (tagData ?? []).forEach((r: any) => {
    const t = r?.tag;
    if (!t?.id) return;
    tagMap.set(t.id, { id: t.id, key: t.key, name: t.name });
  });

  const tagList = Array.from(tagMap.values()).slice(0, 8);

  const heroDesc = category.description ?? "";
  const heroCover = null;

  return (
    <main className="bg-(--oboon-bg-page)">
      <PageContainer className="pb-20">
        {/* ===== HERO (OBOON Original) ===== */}
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
                    imageUrl={heroCover ?? undefined}
                    className="h-full w-full"
                  />
                </div>
              </div>
            </div>
          </Card>
        </div>

        <BriefingCardGrid
          posts={posts.map((p: any) => ({
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
            badgeLabel: pickPrimaryTagName(p) ?? category.name,
          }))}
          initialCount={4}
          step={4}
        />
      </PageContainer>
    </main>
  );
}
