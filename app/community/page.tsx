import type { Metadata } from "next";
import { Suspense } from "react";
import PageContainer from "@/components/shared/PageContainer";
import { CommunityShell } from "@/features/community";
import { seoDefaultOgImage } from "@/shared/seo";

export const metadata: Metadata = {
  title: "커뮤니티",
  description:
    "분양 관심 현장에 대한 경험과 질문을 공유하는 OBOON 커뮤니티입니다.",
  alternates: {
    canonical: "/community",
  },
  openGraph: {
    title: "커뮤니티 | OBOON",
    description:
      "분양 관심 현장에 대한 경험과 질문을 공유하는 OBOON 커뮤니티입니다.",
    url: "/community",
    images: [seoDefaultOgImage],
  },
  twitter: {
    card: "summary_large_image",
    title: "커뮤니티 | OBOON",
    description:
      "분양 관심 현장에 대한 경험과 질문을 공유하는 OBOON 커뮤니티입니다.",
    images: [seoDefaultOgImage],
  },
};

export default function CommunityPage() {
  return (
    <main className="bg-(--oboon-bg-page)">
      <PageContainer className="pb-10">
        <Suspense fallback={null}>
          <CommunityShell />
        </Suspense>
      </PageContainer>
    </main>
  );
}
