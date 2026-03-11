"use client";

import PageContainer from "@/components/shared/PageContainer";
import HeroSection from "@/features/home/components/HeroSection";
import HomeOfferingsSection from "@/features/offerings/components/HomeOfferingsSection.client";
// import HomeBriefingSection from "@/features/briefing/components/HomeBriefingSection.client";

/* ================================
 * Page
 * ================================ */
export default function HomePage() {
  return (
    <main className="min-h-screen bg-(--oboon-bg-page)">
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
