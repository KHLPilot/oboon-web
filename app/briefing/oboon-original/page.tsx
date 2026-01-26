// app/briefing/oboon-original/page.tsx
import Link from "next/link";

import PageContainer from "@/components/shared/PageContainer";
import { cx } from "@/features/briefing/components/briefing.ui";
import BriefingOriginalCard from "@/features/briefing/components/oboon-original/BriefingOriginalCard";

import { fetchOboonOriginalPageData } from "@/features/briefing/services/briefing.original";
import FeaturedHero, {
  type FeaturedPostRow,
} from "@/features/briefing/components/oboon-original/FeaturedHero";

type TagRow = {
  id: string;
  key: string;
  name: string;
  sort_order: number | null;
};

type CategoryRow = {
  id: string;
  key: string;
  name: string;
};

export default async function OboonOriginalPage() {
  const {
    isAdmin,
    boardId,
    categories,
    categoryCountMap,
    featuredPosts,
    tagRows,
    tagToCategoryIds,
  } = await fetchOboonOriginalPageData();

  const catData = (categories ?? []) as CategoryRow[];

  return (
    <main>
      <PageContainer>
        {/* ===== Featured Hero (캐러셀) ===== */}
        <div className="mb-6">
          <FeaturedHero posts={featuredPosts} isAdmin={isAdmin} />

          {/* ===== “태그” 칩 ===== */}
          <div className="mt-4 flex flex-wrap gap-2">
            {tagRows.slice(0, 8).map((t) => (
              <Link
                key={t.key}
                href={`/briefing/oboon-original?tag=${encodeURIComponent(
                  t.key
                )}`}
                className={cx(
                  "inline-flex items-center rounded-full border px-3 py-1 text-[12px] font-medium",
                  "border-(--oboon-border-default) bg-(--oboon-bg-surface) text-(--oboon-text-muted)",
                  "hover:bg-(--oboon-bg-subtle) transition-colors"
                )}
              >
                {t.name}
              </Link>
            ))}
          </div>
        </div>

        {/* ===== 아래 섹션: 태그별 / 카테고리별 카드 렌더 ===== */}
        <div className="flex flex-col gap-10">
          {tagRows.map((t) => {
            const set = tagToCategoryIds.get(t.id);
            if (!set || set.size === 0) return null;

            const filteredCats = catData
              .filter((c) => set.has(c.id))
              .filter((c) => Boolean(c?.key)); // URL 생성 안전장치

            if (filteredCats.length === 0) return null;

            return (
              <section key={t.id}>
                <div className="mb-3 ob-typo-h3 text-(--oboon-text-title)">
                  {t.name}
                </div>

                <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                  {filteredCats.map((c) => (
                    <BriefingOriginalCard
                      key={c.id}
                      original={{
                        key: c.key,
                        name: c.name,
                        description: null,
                        coverImageUrl: null,
                      }}
                      count={categoryCountMap.get(c.id) ?? 0}
                      href={`/briefing/oboon-original/${encodeURIComponent(
                        c.key
                      )}`}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </PageContainer>
    </main>
  );
}
