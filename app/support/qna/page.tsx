import type { Metadata } from "next";
import { Suspense } from "react";
import QnAPageClient from "@/features/support/components/qna/QnAPage.client";
import { QnAListSkeleton } from "@/features/support/components/qna/QnAListSkeleton";
import { seoDefaultOgImage } from "@/shared/seo";

export const metadata: Metadata = {
  title: "1:1 문의",
  description: "OBOON 고객센터에 1:1 문의를 남기고 답변 상태를 확인할 수 있습니다.",
  alternates: {
    canonical: "/support/qna",
  },
  openGraph: {
    title: "1:1 문의 | OBOON",
    description: "OBOON 고객센터에 1:1 문의를 남기고 답변 상태를 확인할 수 있습니다.",
    url: "/support/qna",
    images: [seoDefaultOgImage],
  },
  twitter: {
    card: "summary_large_image",
    title: "1:1 문의 | OBOON",
    description: "OBOON 고객센터에 1:1 문의를 남기고 답변 상태를 확인할 수 있습니다.",
    images: [seoDefaultOgImage],
  },
};

export default function SupportQnAPage() {
  return (
    <Suspense fallback={<QnAListSkeleton />}>
      <QnAPageClient />
    </Suspense>
  );
}
