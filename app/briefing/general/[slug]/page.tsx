// app/briefing/general/[slug]/page.tsx
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import PageContainer from "@/components/shared/PageContainer";
import Card from "@/components/ui/Card";

import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import BriefingCommentSection from "@/features/briefing/components/BriefingCommentSection.client";
import {
  deleteGeneralBriefingPost,
  ensureGeneralBriefingAdmin,
  fetchGeneralPostPageData,
} from "@/features/briefing/services/briefing.general.post";
import BriefingHtmlRenderer from "@/features/briefing/components/BriefingHtmlRenderer.client";
import BriefingLikeShareBar from "@/features/briefing/components/BriefingLikeShareBar.client";
import BriefingViewTracker from "@/features/briefing/components/BriefingViewTracker.client";
import { cx } from "@/features/briefing/components/briefing.ui";
import AdminPostActions from "@/features/briefing/components/AdminPostActions.client";
import { getAvatarUrlOrDefault } from "@/shared/imageUrl";
import {
  buildArticleJsonLd,
  buildBreadcrumbJsonLd,
  seoDefaultOgImage,
} from "@/shared/seo";

type AuthorProfile = {
  id: string;
  name: string;
  nickname: string | null;
  role: string;
  avatar_url: string | null;
  bio: string | null;
};

type PostRow = {
  id: string;
  slug: string;
  title: string;
  content_html: string | null;
  like_count?: number | null;
  comment_count?: number | null;
  created_at: string;
  published_at?: string | null;
  cover_image_url: string | null;
  author_profile: AuthorProfile | null;
  post_tags?:
    | {
        tag: {
          id: string;
          name: string;
          sort_order: number | null;
          is_active: boolean;
        } | null;
      }[]
    | null;
};

function normalizeAuthorProfile(
  author: AuthorProfile | AuthorProfile[] | null | undefined,
) {
  if (Array.isArray(author)) return author[0] ?? null;
  return author ?? null;
}

function normalizePostRow(raw: unknown): PostRow {
  const record = (raw ?? {}) as Record<string, unknown>;
  const postTags = Array.isArray(record.post_tags) ? record.post_tags : [];

  return {
    ...(record as PostRow),
    author_profile: normalizeAuthorProfile(
      record.author_profile as AuthorProfile | AuthorProfile[] | null | undefined,
    ),
    post_tags: postTags.map((pt) => {
      const item = (pt ?? {}) as { tag?: unknown };
      const tagValue = item.tag;
      return {
        tag: (Array.isArray(tagValue)
          ? (tagValue[0] ?? null)
          : (tagValue ?? null)) as
          | {
              id: string;
              name: string;
              sort_order: number | null;
              is_active: boolean;
            }
          | null,
      };
    }),
  };
}

function formatDateLong(iso: string) {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}.${m}.${day}`;
}

function stripHtmlToText(html: string | null | undefined) {
  if (!html) return "";
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug);
  const { post: data } = await fetchGeneralPostPageData(slug);

  if (!data) {
    return {
      robots: { index: false, follow: false },
    };
  }

  const post = normalizePostRow(data);
  const description =
    stripHtmlToText(post.content_html).slice(0, 160) ||
    `${post.title} 브리핑 글을 OBOON에서 확인하세요.`;
  const canonicalPath = `/briefing/general/${encodeURIComponent(post.slug)}`;
  const ogImage = post.cover_image_url || seoDefaultOgImage;

  return {
    title: post.title,
    description,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title: `${post.title} | OBOON`,
      description,
      url: canonicalPath,
      type: "article",
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image",
      title: `${post.title} | OBOON`,
      description,
      images: [ogImage],
    },
  };
}

// 관리자 체크 코드

export default async function GeneralPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const nonce =
    process.env.NODE_ENV === "production"
      ? ((await headers()).get("x-nonce") ?? undefined)
      : undefined;
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug);

  const {
    isAdmin,
    post: data,
    relatedPosts,
    initialComments,
    initialNextCursor,
    currentUserId,
    currentUserAvatarUrl,
    currentUserNickname,
  } =
    await fetchGeneralPostPageData(slug);

  if (!data) notFound();
  const post = normalizePostRow(data);

  const author = post.author_profile;
  const authorName = author?.nickname ?? author?.name ?? "익명";
  const createdAt = (post.published_at ?? post.created_at) as string;
  const leftPanelImage = post.cover_image_url ?? null;
  const postId = post.id;
  const canonicalPath = `/briefing/general/${encodeURIComponent(post.slug)}`;
  const description =
    stripHtmlToText(post.content_html).slice(0, 160) ||
    `${post.title} 브리핑 글을 OBOON에서 확인하세요.`;
  const articleStructuredData = buildArticleJsonLd({
    headline: post.title,
    description,
    path: canonicalPath,
    image: post.cover_image_url || seoDefaultOgImage,
    datePublished: createdAt,
    dateModified: createdAt,
    authorName,
  });
  const breadcrumbStructuredData = buildBreadcrumbJsonLd([
    { name: "홈", path: "/" },
    { name: "브리핑", path: "/briefing" },
    { name: "일반 브리핑", path: "/briefing/general" },
    { name: post.title, path: canonicalPath },
  ]);

  const relatedData = relatedPosts;
  const relatedItems = (relatedData ?? []) as Array<{
    id: string;
    slug: string;
    title: string;
    excerpt: string | null;
    content_html: string | null;
    cover_image_url: string | null;
  }>;

  async function deletePostAction() {
    "use server";

    const adminOk = await ensureGeneralBriefingAdmin();
    if (!adminOk) redirect("/briefing");

    const { error } = await deleteGeneralBriefingPost(postId);
    if (error) throw error;

    redirect("/briefing");
  }

  return (
    <main className="bg-(--oboon-bg-page)">
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(articleStructuredData).replace(/</g, "\\u003c"),
        }}
      />
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbStructuredData).replace(/</g, "\\u003c"),
        }}
      />
      <BriefingViewTracker postId={post.id} />
      <PageContainer className="pb-20">
        {/* ===== Hero ===== */}
        <div className="relative mb-8 h-[320px] overflow-hidden rounded-2xl sm:h-[400px] lg:h-[500px]">
          {post.cover_image_url ? (
            <Image
              src={post.cover_image_url}
              alt={post.title}
              fill
              className="object-cover"
              priority
            />
          ) : (
            <div className="absolute inset-0 bg-(--oboon-bg-subtle)" />
          )}

          {post.cover_image_url && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
          )}

          <div className="absolute bottom-8 left-8 right-8">
            <div
              className={`ob-typo-h1 line-clamp-3 ${
                post.cover_image_url ? "text-white" : "text-(--oboon-text-title)"
              }`}
            >
              {post.title}
            </div>
            <div
              className={`mt-2 ob-typo-caption ${
                post.cover_image_url ? "text-white/70" : "text-(--oboon-text-muted)"
              }`}
            >
              {authorName} · {formatDateLong(createdAt)}
            </div>
          </div>

          {isAdmin ? (
            <div className="absolute bottom-8 right-8 z-10">
              <AdminPostActions
                editHref={`/briefing/admin/posts/${post.id}/edit`}
                deleteAction={deletePostAction}
                postTitle={post.title}
              />
            </div>
          ) : null}
        </div>

        {/* ===== 본문 + 사이드바 ===== */}
        <div className="mt-15 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_440px]">
          <div className="min-w-0">
            <div className={cx("ob-md")}>
              <BriefingHtmlRenderer
                html={post.content_html ?? ""}
                className="prose max-w-none"
              />
            </div>
          </div>

          {/* sidebar */}
          <div className="space-y-4">
            <Card className="p-5 shadow-none">
              <div className="flex items-start justify-between gap-3">
                <Badge variant="status">
                  {author?.role === "admin" ? "오분 에디터" : "작성자"}
                </Badge>
                <Link href={author?.id ? `/briefing/author/${author.id}` : "/briefing"}>
                  <Button variant="secondary" size="sm" shape="pill">
                    에디터 글 더보기
                  </Button>
                </Link>
              </div>

              <div className="mt-4 flex items-center gap-3">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border border-(--oboon-border-default) bg-(--oboon-bg-subtle)">
                  <Image
                    src={getAvatarUrlOrDefault(author?.avatar_url)}
                    alt={`${authorName} 아바타`}
                    fill
                    className="object-cover"
                    sizes="56px"
                  />
                </div>
                <div className="min-w-0">
                  <div className="ob-typo-h3 text-(--oboon-text-title)">
                    {authorName}
                  </div>
                  <div className="mt-0.5 ob-typo-caption text-(--oboon-text-muted)">
                    {author?.role === "admin" ? "오분 에디터" : "작성자"}
                  </div>
                </div>
              </div>

              {author?.bio ? (
                <div className="mt-3 ob-typo-caption leading-5 text-(--oboon-text-muted)">
                  {author.bio}
                </div>
              ) : null}

              {isAdmin ? (
                <div className="mt-4 border-t border-(--oboon-border-default) pt-4">
                  <Link
                    href="/briefing/editor"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-(--oboon-border-default) bg-(--oboon-bg-subtle) px-3 py-1.5 ob-typo-caption font-medium text-(--oboon-text-muted) transition-colors hover:border-(--oboon-primary) hover:text-(--oboon-primary)"
                  >
                    대시보드
                  </Link>
                </div>
              ) : null}

            </Card>
          </div>
        </div>

        <BriefingLikeShareBar
          postId={post.id}
          initialLikeCount={post.like_count ?? 0}
        />

        <BriefingCommentSection
          postId={post.id}
          initialComments={initialComments}
          initialNextCursor={initialNextCursor}
          currentUserId={currentUserId}
          currentUserAvatarUrl={currentUserAvatarUrl}
          currentUserNickname={currentUserNickname}
        />

        {/* ===== 관련 글 ===== */}
        <Card className="mt-16 sm:mt-24 lg:mt-40 shadow-none overflow-hidden p-0">
          <div className="grid h-[380px] grid-cols-1 lg:grid-cols-2">
            <div className="bg-(--oboon-bg-subtle)">
              <div className="relative overflow-hidden rounded-2xl">
                {leftPanelImage ? (
                  <Image
                    src={leftPanelImage}
                    alt="배경"
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 bg-(--oboon-bg-subtle)" />
                )}

                {leftPanelImage ? (
                  <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-black/75" />
                ) : null}

                <div className="relative flex h-full min-h-[380px] flex-col justify-between p-5 md:p-6 lg:p-8">
                  <div className="flex justify-end">
                    <Link href="/briefing" className="inline-block">
                      <Badge
                        variant="status"
                        className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full pl-3 pr-1.5 py-1.5 ${
                          leftPanelImage ? "border-white/30 bg-white/10 text-white" : ""
                        }`}
                      >
                        <span className="text-[13px] font-medium leading-none">
                          더보기
                        </span>
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                            leftPanelImage ? "bg-white" : "bg-(--oboon-text-title)"
                          }`}
                        >
                          <svg
                            width="10"
                            height="10"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-(--oboon-arrow-color)"
                            aria-hidden="true"
                          >
                            <path d="M5 12h14" />
                            <path d="m13 5 7 7-7 7" />
                          </svg>
                        </span>
                      </Badge>
                    </Link>
                  </div>

                  <div>
                    <div className={`ob-typo-h1 ${leftPanelImage ? "text-white" : "text-(--oboon-text-title)"}`}>
                      일반 브리핑
                    </div>
                    <div
                      className={`mt-3 ob-typo-body leading-6 ${
                        leftPanelImage ? "text-white/70" : "text-(--oboon-text-subtle)"
                      }`}
                    >
                      오분의 관점으로 정리한 일반 브리핑 글 모음입니다.
                    </div>

                    {(post.post_tags ?? []).length > 0 ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {(post.post_tags ?? [])
                          .map((pt) => pt?.tag)
                          .filter(
                            (
                              tag,
                            ): tag is {
                              id: string;
                              name: string;
                              sort_order: number | null;
                              is_active: boolean;
                            } => tag != null && tag.is_active === true,
                          )
                          .slice(0, 4)
                          .map((tag) => (
                            <span
                              key={tag.id}
                              className={`rounded-full border px-2.5 py-0.5 ob-typo-caption ${
                                leftPanelImage
                                  ? "border-white/30 text-white/80"
                                  : "border-(--oboon-border-default) text-(--oboon-text-muted)"
                              }`}
                            >
                              {tag.name}
                            </span>
                          ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-(--oboon-bg-subtle)">
              <div className="h-full bg-(--oboon-bg-subtle) p-3 md:p-4 lg:p-5">
                <div className="space-y-3">
                  {relatedItems.map((r) => {
                    const href = `/briefing/general/${encodeURIComponent(
                      r.slug
                    )}`;

                    return (
                      <Link key={r.id} href={href} className="block">
                        <Card className="overflow-hidden p-0 shadow-none bg-(--oboon-bg-surface) hover:bg-(--oboon-bg-subtle) transition-colors">
                          <div className="flex min-h-[104px] items-stretch">
                            <div className="relative w-28 shrink-0 overflow-hidden">
                              {r.cover_image_url ? (
                                <Image
                                  src={r.cover_image_url}
                                  alt={r.title}
                                  fill
                                  className="object-cover"
                                />
                              ) : (
                                <div className="h-full w-full bg-(--oboon-bg-subtle)" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1 p-3 md:p-4">
                              <div className="ob-typo-h4 text-(--oboon-text-title) line-clamp-2">
                                {r.title}
                              </div>
                              {r.excerpt ? (
                                <div className="mt-1 ob-typo-caption text-(--oboon-text-muted) line-clamp-2">
                                  {r.excerpt}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </Card>
      </PageContainer>
    </main>
  );
}
