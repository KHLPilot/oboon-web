import type { Metadata } from "next";
import { Suspense } from "react";
import OfferingsClient from "./OfferingsClient";
import { seoDefaultOgImage } from "@/shared/seo";

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

export default function OfferingsPage() {
  return (
    <Suspense fallback={null}>
      <OfferingsClient />
    </Suspense>
  );
}
