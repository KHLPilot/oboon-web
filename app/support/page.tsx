import type { Metadata } from "next";
import SupportPageClient from "./SupportPageClient";
import { seoDefaultOgImage } from "@/shared/seo";

export const metadata: Metadata = {
  title: "고객센터",
  description: "자주 묻는 질문과 1:1 문의를 확인할 수 있는 OBOON 고객센터입니다.",
  alternates: {
    canonical: "/support",
  },
  openGraph: {
    title: "고객센터 | OBOON",
    description: "자주 묻는 질문과 1:1 문의를 확인할 수 있는 OBOON 고객센터입니다.",
    url: "/support",
    images: [seoDefaultOgImage],
  },
  twitter: {
    card: "summary_large_image",
    title: "고객센터 | OBOON",
    description: "자주 묻는 질문과 1:1 문의를 확인할 수 있는 OBOON 고객센터입니다.",
    images: [seoDefaultOgImage],
  },
};

export default function SupportFAQPage() {
  return <SupportPageClient />;
}
