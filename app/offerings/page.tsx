import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import { Suspense } from "react";
import OfferingsClient from "./OfferingsClient";
import { seoDefaultOgImage } from "@/shared/seo";
import { OfferingsPageSkeleton } from "@/features/offerings/components/OfferingsPageSkeleton";
import { fetchPropertiesForOfferings } from "@/features/offerings/services/offering.query";
import {
  mapPropertyRowToOffering,
  type PropertyRow,
} from "@/features/offerings/mappers/offering.mapper";
import { UXCopy } from "@/shared/uxCopy";
import type { Offering } from "@/types/index";

export const revalidate = 60;

function createPublicSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) return null;

  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function loadInitialOfferings(): Promise<Offering[]> {
  const supabase = createPublicSupabaseClient();
  if (!supabase) return [];

  try {
    const { data, error } = await fetchPropertiesForOfferings(supabase, {
      limit: 24,
    });

    if (error) {
      console.error("[offerings/page] initial offerings fetch failed", error);
      return [];
    }

    const fallback = {
      addressShort: UXCopy.addressShort,
      regionShort: UXCopy.regionShort,
    };

    return ((data ?? []) as PropertyRow[]).map((row) =>
      mapPropertyRowToOffering(row, fallback),
    );
  } catch (error) {
    console.error("[offerings/page] initial offerings fetch failed", error);
    return [];
  }
}

export const metadata: Metadata = {
  title: "분양 리스트",
  description:
    "OBOON 분양 플랫폼에서 분양 정보를 비교하고 분양상담사와 상담을 연결하세요.",
  keywords: [
    "OBOON",
    "oboon",
    "분양",
    "분양플랫폼",
    "분양 상담",
    "분양상담사",
    "분양 일정",
  ],
  alternates: {
    canonical: "/offerings",
  },
  openGraph: {
    title: "분양 리스트 | OBOON",
    description:
      "OBOON 분양 플랫폼에서 분양 정보를 비교하고 분양상담사와 상담을 연결하세요.",
    url: "/offerings",
    images: [seoDefaultOgImage],
  },
  twitter: {
    card: "summary_large_image",
    title: "분양 리스트 | OBOON",
    description:
      "OBOON 분양 플랫폼에서 분양 정보를 비교하고 분양상담사와 상담을 연결하세요.",
    images: [seoDefaultOgImage],
  },
};

export default async function OfferingsPage() {
  const initialOfferings = await loadInitialOfferings();

  return (
    <Suspense fallback={<OfferingsPageSkeleton />}>
      <OfferingsClient initialOfferings={initialOfferings} />
    </Suspense>
  );
}
