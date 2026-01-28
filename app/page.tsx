"use client";

// app/page.tsx
import Link from "next/link";

import PageContainer from "@/components/shared/PageContainer";
import Button from "@/components/ui/Button";
import HomeOfferingsSection from "@/features/offerings/components/HomeOfferingsSection.client";
import HomeBriefingSection from "@/features/briefing/components/HomeBriefingSection.client";

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

          <HomeBriefingSection />
        </div>
      </PageContainer>
    </main>
  );
}

/* ---------- Hero ---------- */
function HeroSection() {
  return (
    <section className="pt-20 pb-10 sm:pt-20 flex flex-col items-center gap-6 sm:gap-7 text-center">
      <div className="space-y-5">
        <div className="ob-typo-display text-(--oboon-text-title)">
          오늘의 분양
          <br />
          데이터를 투명하게
        </div>

        <p className="ob-typo-body text-(--oboon-text-body)">
          복잡한 공고문 대신 핵심만 간단하게 정리해 드립니다.
          <br />
          빅데이터 기반의 객관적인 분양 정보를 만나보세요.
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
