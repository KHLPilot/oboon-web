import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import PageContainer from "@/components/shared/PageContainer";
import BriefingCardGrid from "@/features/briefing/components/BriefingCardGrid";
import { fetchAuthorPageData } from "@/features/briefing/services/briefing.author";
import { buildBriefingAuthorMetadata } from "@/shared/briefing-seo";
import { getAvatarUrlOrDefault } from "@/shared/imageUrl";
import { seoDefaultOgImage } from "@/shared/seo";
import { createSupabaseServer } from "@/lib/supabaseServer";

type Tab = "general" | "oboon-original";
type AuthorProfile = {
  id: string;
  name: string | null;
  nickname: string | null;
  role: string | null;
  avatar_url: string | null;
  bio: string | null;
};
type AuthorPostRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_image_url: string | null;
  published_at: string | null;
  created_at: string;
  category:
    | {
        key: string | null;
        name: string | null;
      }
    | {
        key: string | null;
        name: string | null;
      }[]
    | null;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ authorId: string }>;
}): Promise<Metadata> {
  const { authorId } = await params;
  const { profile } = await fetchAuthorPageData(authorId, "general");

  if (!profile) {
    return {
      robots: { index: false, follow: false },
    };
  }

  const author = profile as AuthorProfile;
  const authorName = author.nickname ?? author.name ?? "익명";
  const roleLabel = author.role === "admin" ? "오분 에디터" : "작성자";
  const seo = buildBriefingAuthorMetadata({
    authorId,
    authorName,
    roleLabel,
    bio: author.bio,
  });

  return {
    title: seo.title,
    description: seo.description,
    alternates: {
      canonical: seo.canonicalPath,
    },
    robots: seo.robots,
    openGraph: {
      title: seo.openGraphTitle,
      description: seo.description,
      url: seo.canonicalPath,
      images: [seoDefaultOgImage],
    },
    twitter: {
      card: "summary_large_image",
      title: seo.openGraphTitle,
      description: seo.description,
      images: [seoDefaultOgImage],
    },
  };
}

export default async function AuthorPage({
  params,
  searchParams,
}: {
  params: Promise<{ authorId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { authorId } = await params;
  const { tab: rawTab } = await searchParams;
  const tab: Tab = rawTab === "oboon-original" ? "oboon-original" : "general";

  const supabase = await createSupabaseServer();
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  const isOwnProfile = currentUser?.id === authorId;

  const { profile, posts } = await fetchAuthorPageData(authorId, tab);
  if (!profile) notFound();

  const author = profile as AuthorProfile;
  const authorPosts = (posts ?? []) as AuthorPostRow[];
  const authorName = author.nickname ?? author.name ?? "익명";
  const roleLabel = author.role === "admin" ? "오분 에디터" : "작성자";

  return (
    <main className="bg-(--oboon-bg-page)">
      <PageContainer className="pb-20 pt-10">
        <div className="mb-10">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border border-(--oboon-border-default) bg-(--oboon-bg-subtle)">
                <Image
                  src={getAvatarUrlOrDefault(author.avatar_url)}
                  alt={`${authorName} 아바타`}
                  fill
                  className="object-cover"
                  sizes="56px"
                />
              </div>
              <div className="min-w-0">
                <div className="ob-typo-h1 text-(--oboon-text-title)">{authorName}</div>
                <div className="mt-0.5 ob-typo-caption text-(--oboon-text-muted)">{roleLabel}</div>
              </div>
            </div>
            {isOwnProfile && (
              <Link
                href="/briefing/editor"
                className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-(--oboon-border-default) bg-(--oboon-bg-surface) px-3 py-1.5 ob-typo-caption font-medium text-(--oboon-text-muted) transition-colors hover:border-(--oboon-primary) hover:text-(--oboon-primary)"
              >
                대시보드
              </Link>
            )}
          </div>
          {author.bio ? (
            <div className="mt-4 ob-typo-body leading-6 text-(--oboon-text-subtle)">
              {author.bio}
            </div>
          ) : null}
          <div className="mt-4">
            <Link
              href="/briefing/about"
              className="inline-flex items-center gap-1.5 rounded-lg border border-(--oboon-border-default) bg-(--oboon-bg-surface) px-3 py-1.5 ob-typo-caption font-medium text-(--oboon-text-muted) transition-colors hover:border-(--oboon-primary) hover:text-(--oboon-primary)"
            >
              브리핑 소개 및 편집 원칙
            </Link>
          </div>
        </div>

        <div className="mb-6 flex gap-4 border-b border-(--oboon-border-default)">
          <Link
            href={`/briefing/author/${authorId}?tab=general`}
            className={`pb-3 ob-typo-body font-medium border-b-2 transition-colors ${
              tab === "general"
                ? "border-(--oboon-text-title) text-(--oboon-text-title)"
                : "border-transparent text-(--oboon-text-muted) hover:text-(--oboon-text-subtle)"
            }`}
          >
            일반 브리핑
          </Link>
          <Link
            href={`/briefing/author/${authorId}?tab=oboon-original`}
            className={`pb-3 ob-typo-body font-medium border-b-2 transition-colors ${
              tab === "oboon-original"
                ? "border-(--oboon-text-title) text-(--oboon-text-title)"
                : "border-transparent text-(--oboon-text-muted) hover:text-(--oboon-text-subtle)"
            }`}
          >
            오분 오리지널
          </Link>
        </div>

        {authorPosts.length === 0 ? (
          <div className="py-20 text-center ob-typo-body text-(--oboon-text-muted)">
            아직 작성한 글이 없습니다.
          </div>
        ) : (
          <BriefingCardGrid
            columns={4}
            posts={authorPosts.map((post) => {
              const category =
                post.category && !Array.isArray(post.category)
                  ? post.category
                  : Array.isArray(post.category)
                    ? (post.category[0] ?? null)
                    : null;

              const href =
                tab === "general"
                  ? `/briefing/general/${encodeURIComponent(post.slug)}`
                  : category?.key
                    ? `/briefing/oboon-original/${encodeURIComponent(category.key)}/${encodeURIComponent(post.slug)}`
                    : "/briefing/oboon-original";

              return {
                id: post.id,
                href,
                slug: post.slug,
                title: post.title,
                excerpt: null,
                created_at: post.created_at,
                published_at: post.published_at ?? null,
                cover_image_url: post.cover_image_url ?? null,
                badgeLabel:
                  category?.name ?? (tab === "general" ? "일반 브리핑" : "오분 오리지널"),
              };
            })}
          />
        )}
      </PageContainer>
    </main>
  );
}
