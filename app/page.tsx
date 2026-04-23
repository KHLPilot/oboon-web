import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import PageContainer from "@/components/shared/PageContainer";
import HeroSection from "@/features/home/components/HeroSection";
import HomeOfferingsSection from "@/features/offerings/components/HomeOfferingsSectionDeferred.client";
import { fetchPropertiesForOfferings } from "@/features/offerings/services/offering.query";
import type { PropertyRow } from "@/features/offerings/mappers/offering.mapper";
import { seoDefaultOgImage } from "@/shared/seo";
// import HomeBriefingSection from "@/features/briefing/components/HomeBriefingSection.client";

export const revalidate = 60;

function createPublicSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) return null;

  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

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
async function loadHomeOfferingsRows(): Promise<PropertyRow[]> {
  const supabase = createPublicSupabaseClient();
  if (!supabase) return [];

  try {
    const { data, error } = await fetchPropertiesForOfferings(supabase, {
      limit: 120,
    });

    if (error) {
      console.error("[home/page] initial offerings fetch failed", error);
      return [];
    }

    return (data ?? []) as PropertyRow[];
  } catch (error) {
    console.error("[home/page] initial offerings fetch failed", error);
    return [];
  }
}

export default async function HomePage() {
  const initialRows = await loadHomeOfferingsRows();

  return (
    <main className="bg-(--oboon-bg-page)">
      <PageContainer>
        <div className="flex flex-col gap-5">
          <HeroSection />
          <HomeOfferingsSection initialRows={initialRows} />
          {/* <HomeBriefingSection /> */}
        </div>
      </PageContainer>
    </main>
  );
}
