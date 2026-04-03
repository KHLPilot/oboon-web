import type { Metadata } from "next";
import PageContainer from "@/components/shared/PageContainer";
import OboonOriginalHero from "@/features/briefing/components/oboon-original/OboonOriginalHero";
import OboonOriginalFilter from "@/features/briefing/components/oboon-original/OboonOriginalFilter.client";
import { fetchOboonOriginalPageData } from "@/features/briefing/services/briefing.original";
import { briefingHubDescriptions } from "@/shared/briefing-content";
import { seoDefaultOgImage } from "@/shared/seo";

export const metadata: Metadata = {
  title: "오리지널 브리핑",
  description: briefingHubDescriptions.oboonOriginal,
  alternates: {
    canonical: "/briefing/oboon-original",
  },
  openGraph: {
    title: "오리지널 브리핑 | OBOON",
    description: briefingHubDescriptions.oboonOriginal,
    url: "/briefing/oboon-original",
    images: [seoDefaultOgImage],
  },
  twitter: {
    card: "summary_large_image",
    title: "오리지널 브리핑 | OBOON",
    description: briefingHubDescriptions.oboonOriginal,
    images: [seoDefaultOgImage],
  },
};

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
