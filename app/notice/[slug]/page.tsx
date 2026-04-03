import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PageContainer from "@/components/shared/PageContainer";
import { Badge } from "@/components/ui/Badge";
import {
  formatNoticeDate,
  NOTICE_CATEGORY_LABEL,
} from "@/features/notice/data/notices";
import { fetchPublicNoticeBySlug } from "@/features/notice/services/notices.server";
import { seoDefaultOgImage } from "@/shared/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const notice = await fetchPublicNoticeBySlug(slug);
  if (!notice) {
    return {
      title: "공지사항",
    };
  }
  return {
    title: `${notice.title} | 공지사항`,
    description: notice.summary,
    alternates: {
      canonical: `/notice/${encodeURIComponent(notice.slug)}`,
    },
    openGraph: {
      title: `${notice.title} | 공지사항 | OBOON`,
      description: notice.summary,
      url: `/notice/${encodeURIComponent(notice.slug)}`,
      images: [seoDefaultOgImage],
    },
    twitter: {
      card: "summary_large_image",
      title: `${notice.title} | 공지사항 | OBOON`,
      description: notice.summary,
      images: [seoDefaultOgImage],
    },
  };
}

export default async function NoticeDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const notice = await fetchPublicNoticeBySlug(slug);
  if (!notice) notFound();

  return (
    <main className="flex-1 bg-(--oboon-bg-page)">
      <PageContainer className="pb-16">
        <section className="mx-auto w-full max-w-5xl">
          <header className="pt-2">
            <div className="mb-4 flex items-center gap-2">
              <span className="ob-typo-body-sm text-(--oboon-text-muted)">
                {NOTICE_CATEGORY_LABEL[notice.category]}
              </span>
              <span className="ob-typo-body-sm text-(--oboon-text-muted)">·</span>
              {notice.pinned ? <Badge variant="primary">중요</Badge> : null}
              {notice.maintenance ? <Badge variant="warning">점검</Badge> : null}
              <span className="ob-typo-body-sm text-(--oboon-text-muted)">
                {formatNoticeDate(notice.publishedAt)}
              </span>
            </div>

            <h1 className="ob-typo-h1 text-(--oboon-text-title)">{notice.title}</h1>
          </header>

          <div className="mt-6 border-t border-(--oboon-border-default)" />

          <article className="py-14">
            <div className="whitespace-pre-wrap break-words ob-typo-body leading-8 text-(--oboon-text-title)">
              {notice.content}
            </div>
          </article>

          <div className="border-t border-(--oboon-border-default) pt-10">
            <Link
              href="/notice"
              className="inline-flex items-center ob-typo-h4 text-(--oboon-text-title) hover:text-(--oboon-primary)"
            >
              ← 목록으로
            </Link>
          </div>
        </section>
      </PageContainer>
    </main>
  );
}
