import type { Metadata } from "next";
import { Suspense } from "react";
import OfferingsClient from "./OfferingsClient";

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
  },
};

export default function OfferingsPage() {
  return (
    <Suspense fallback={null}>
      <OfferingsClient />
    </Suspense>
  );
}
