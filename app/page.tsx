"use client";

// app/page.tsx
import Link from "next/link";

import PageContainer from "@/components/shared/PageContainer";
import Button from "@/components/ui/Button";
import HomeOfferingsSection from "@/features/offerings/components/HomeOfferingsSection.client";
// import HomeBriefingSection from "@/features/briefing/components/HomeBriefingSection.client";

/* ================================
 * Page
 * ================================ */
export default function HomePage() {
  return (
    <main className="min-h-screen bg-(--oboon-bg-page)">
      <PageContainer>
        <div className="flex flex-col gap-10">
          <HeroSection />

          <HomeOfferingsSection />

          {/* <HomeBriefingSection /> */}
        </div>
      </PageContainer>
    </main>
  );
}

/* ---------- Hero ---------- */
function HeroSection() {
  return (
    <section className="pt-20 pb-10 sm:pt-20 flex flex-col items-center gap-6 sm:gap-7 text-center">
      <div>
        <div className="ob-typo-display text-(--oboon-text-title)">
          오늘의 분양
          <br/>
          분양 정보부터 상담 연결까지 한 번에.
        </div>

        <p className="ob-typo-h1 text-(--oboon-text-body)">
        </p>

        <p className="ob-typo-h4 text-(--oboon-text-body)">
          <br />
          현장을 비교하고
          <br />
          원하는 상담사를 직접 선택하세요.
        </p>
      </div>

      <div className="mt-4 flex w-full max-w-18 flex-row justify-center gap-3">
        {/* 리스트로 보기 → 분양 리스트 */}
        <Link href="/offerings" className="flex-1 sm:flex-none">
          <Button
            size="lg"
            variant="primary"
            className="w-full sm:min-w-55 cursor-pointer"
          >
            리스트로 보기
          </Button>
        </Link>

        {/* 지도로 보기 → 지도 페이지 */}
        <Link href="/map" className="flex-1 sm:flex-none">
          <Button
            size="lg"
            variant="secondary"
            className="w-full sm:min-w-55 cursor-pointer"
          >
            지도로 보기
          </Button>
        </Link>
      </div>
    </section>
  );
}

/* ---------- Header ---------- */
