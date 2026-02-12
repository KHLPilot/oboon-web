import type { Metadata } from "next";
import { Suspense } from "react";
import OfferingsClient from "./OfferingsClient";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://oboon.co.kr";
const defaultOgImage = `${siteUrl}/logo.svg`;

export const metadata: Metadata = {
  title: "오분 분양 리스트",
  description:
    "오분 분양 플랫폼에서 분양 정보를 비교하고 분양상담사와 상담을 연결하세요.",
  keywords: [
    "오분",
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
    title: "오분 분양 리스트 | OBOON",
    description:
      "오분 분양 플랫폼에서 분양 정보를 비교하고 분양상담사와 상담을 연결하세요.",
    url: "/offerings",
    images: [defaultOgImage],
  },
  twitter: {
    card: "summary_large_image",
    title: "오분 분양 리스트 | OBOON",
    description:
      "오분 분양 플랫폼에서 분양 정보를 비교하고 분양상담사와 상담을 연결하세요.",
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
