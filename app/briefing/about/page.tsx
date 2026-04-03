import type { Metadata } from "next";
import Link from "next/link";

import PageContainer from "@/components/shared/PageContainer";
import {
  briefingAboutHighlights,
  briefingAboutMetadata,
  briefingAboutSections,
} from "@/shared/briefing-content";
import { seoDefaultOgImage } from "@/shared/seo";

export const metadata: Metadata = {
  title: briefingAboutMetadata.title,
  description: briefingAboutMetadata.description,
  alternates: {
    canonical: briefingAboutMetadata.canonicalPath,
  },
  openGraph: {
    title: briefingAboutMetadata.openGraphTitle,
    description: briefingAboutMetadata.description,
    url: briefingAboutMetadata.canonicalPath,
    images: [seoDefaultOgImage],
  },
  twitter: {
    card: "summary_large_image",
    title: briefingAboutMetadata.openGraphTitle,
    description: briefingAboutMetadata.description,
    images: [seoDefaultOgImage],
  },
};

export default function BriefingAboutPage() {
  return (
    <main className="bg-(--oboon-bg-page)">
      <PageContainer className="pb-20 pt-10">
        <section className="overflow-hidden rounded-3xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) px-6 py-7 md:px-8 md:py-9">
          <div className="max-w-3xl">
            <div className="ob-typo-caption font-semibold tracking-[0.08em] text-(--oboon-primary)">
              BRIEFING GUIDE
            </div>
            <h1 className="mt-3 ob-typo-h1 text-(--oboon-text-title)">
              OBOON 브리핑은 이렇게 작성하고 검수합니다.
            </h1>
            <p className="mt-4 ob-typo-body leading-7 text-(--oboon-text-subtle)">
              브리핑 페이지의 저자 표기 방식, 편집 원칙, 정보 출처 기준을 정리한
              안내 페이지입니다. 검색 유입용 문구보다 실제 탐색과 의사결정에 필요한
              문맥을 먼저 제공하는 것을 기본 원칙으로 삼습니다.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-3 md:grid-cols-3">
            {briefingAboutHighlights.map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-page) px-4 py-4"
              >
                <div className="ob-typo-caption text-(--oboon-text-muted)">
                  {item.label}
                </div>
                <div className="mt-2 ob-typo-body font-semibold text-(--oboon-text-title)">
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {briefingAboutSections.map((section) => (
            <article
              key={section.title}
              className="rounded-3xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-6"
            >
              <h2 className="ob-typo-h3 text-(--oboon-text-title)">
                {section.title}
              </h2>
              <p className="mt-3 ob-typo-body leading-7 text-(--oboon-text-subtle)">
                {section.body}
              </p>
              <ul className="mt-4 space-y-2">
                {section.bullets.map((bullet) => (
                  <li
                    key={bullet}
                    className="flex items-start gap-2 ob-typo-caption leading-6 text-(--oboon-text-muted)"
                  >
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-(--oboon-primary)" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </section>

        <section className="mt-8 rounded-3xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-6">
          <h2 className="ob-typo-h3 text-(--oboon-text-title)">바로가기</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/briefing"
              className="inline-flex items-center rounded-lg border border-(--oboon-border-default) px-4 py-2 ob-typo-caption font-medium text-(--oboon-text-body) transition-colors hover:border-(--oboon-primary) hover:text-(--oboon-primary)"
            >
              브리핑 홈
            </Link>
            <Link
              href="/briefing/general"
              className="inline-flex items-center rounded-lg border border-(--oboon-border-default) px-4 py-2 ob-typo-caption font-medium text-(--oboon-text-body) transition-colors hover:border-(--oboon-primary) hover:text-(--oboon-primary)"
            >
              일반 브리핑
            </Link>
            <Link
              href="/briefing/oboon-original"
              className="inline-flex items-center rounded-lg border border-(--oboon-border-default) px-4 py-2 ob-typo-caption font-medium text-(--oboon-text-body) transition-colors hover:border-(--oboon-primary) hover:text-(--oboon-primary)"
            >
              오리지널 브리핑
            </Link>
            <Link
              href="/support"
              className="inline-flex items-center rounded-lg border border-(--oboon-border-default) px-4 py-2 ob-typo-caption font-medium text-(--oboon-text-body) transition-colors hover:border-(--oboon-primary) hover:text-(--oboon-primary)"
            >
              고객센터
            </Link>
          </div>
        </section>
      </PageContainer>
    </main>
  );
}
