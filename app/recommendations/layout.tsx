import type { Metadata } from "next";
import type { ReactNode } from "react";
import { seoDefaultOgImage } from "@/shared/seo";

export const metadata: Metadata = {
  title: "맞춤 현장",
  description:
    "조건에 맞는 분양 현장을 빠르게 탐색하고 비교할 수 있는 OBOON 맞춤 추천 페이지입니다.",
  alternates: {
    canonical: "/recommendations",
  },
  openGraph: {
    title: "맞춤 현장 | OBOON",
    description:
      "조건에 맞는 분양 현장을 빠르게 탐색하고 비교할 수 있는 OBOON 맞춤 추천 페이지입니다.",
    url: "/recommendations",
    images: [seoDefaultOgImage],
  },
  twitter: {
    card: "summary_large_image",
    title: "맞춤 현장 | OBOON",
    description:
      "조건에 맞는 분양 현장을 빠르게 탐색하고 비교할 수 있는 OBOON 맞춤 추천 페이지입니다.",
    images: [seoDefaultOgImage],
  },
};

export default function RecommendationsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
