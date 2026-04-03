import type { Metadata } from "next";
import PageContainer from "@/components/shared/PageContainer";
import HeroSection from "@/features/home/components/HeroSection";
import HomeOfferingsSection from "@/features/offerings/components/HomeOfferingsSection.client";
import { seoDefaultOgImage } from "@/shared/seo";
// import HomeBriefingSection from "@/features/briefing/components/HomeBriefingSection.client";

export const metadata: Metadata = {
  title: {
    absolute: "OBOON 분양 플랫폼",
  },
  description:
    "분양 정보 탐색부터 상담 연결까지 한 번에 진행하는 OBOON 분양 플랫폼.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "OBOON 분양 플랫폼",
    description:
      "분양 정보 탐색부터 상담 연결까지 한 번에 진행하는 OBOON 분양 플랫폼.",
    url: "/",
    images: [seoDefaultOgImage],
  },
  twitter: {
    card: "summary_large_image",
    title: "OBOON 분양 플랫폼",
    description:
      "분양 정보 탐색부터 상담 연결까지 한 번에 진행하는 OBOON 분양 플랫폼.",
    images: [seoDefaultOgImage],
  },
};

/* ================================
 * Page
 * ================================ */
export default function HomePage() {
  return (
    <main className="bg-(--oboon-bg-page)">
      <PageContainer>
        <div className="flex flex-col gap-5">
          <HeroSection />
          <HomeOfferingsSection />
          {/* <HomeBriefingSection /> */}
        </div>
      </PageContainer>
    </main>
  );
}
