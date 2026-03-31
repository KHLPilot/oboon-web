import PageContainer from "@/components/shared/PageContainer";
import OboonOriginalHero from "@/features/briefing/components/oboon-original/OboonOriginalHero";
import OboonOriginalFilter from "@/features/briefing/components/oboon-original/OboonOriginalFilter.client";
import { fetchOboonOriginalPageData } from "@/features/briefing/services/briefing.original";

export default async function OboonOriginalPage() {
  const { series, tags } = await fetchOboonOriginalPageData();
  const seriesCount = series.length;
  const contentCount = series.reduce((sum, item) => sum + item.count, 0);

  return (
    <main className="bg-(--oboon-bg-page)">
      <PageContainer className="pb-20">
        <div className="mb-6">
          <OboonOriginalHero
            seriesCount={seriesCount}
            contentCount={contentCount}
          />
        </div>

        <OboonOriginalFilter series={series} tags={tags} />
      </PageContainer>
    </main>
  );
}
