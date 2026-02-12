import type { Metadata } from "next";
import { Suspense } from "react";
import OfferingsClient from "./OfferingsClient";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://oboon.co.kr";
const defaultOgImage = `${siteUrl}/logo.svg`;

export const metadata: Metadata = {
  title: "분양 리스트",
  description: "전국 분양 현장을 지역, 가격, 상태별로 비교하고 확인하세요.",
  alternates: {
    canonical: "/offerings",
  },
  openGraph: {
    title: "분양 리스트 | OBOON",
    description: "전국 분양 현장을 지역, 가격, 상태별로 비교하고 확인하세요.",
    url: "/offerings",
    images: [defaultOgImage],
  },
  twitter: {
    card: "summary_large_image",
    title: "분양 리스트 | OBOON",
    description: "전국 분양 현장을 지역, 가격, 상태별로 비교하고 확인하세요.",
    images: [defaultOgImage],
  },
};

export default function OfferingsPage() {
  return (
    <Suspense fallback={null}>
      <OfferingsClient />
    </Suspense>
  );
}
