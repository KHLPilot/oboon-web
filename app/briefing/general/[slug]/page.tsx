// app/briefing/general/[slug]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { Heart, MessageCircle, Share2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import PageContainer from "@/components/shared/PageContainer";
import Card from "@/components/ui/Card";

import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  deleteGeneralBriefingPost,
  ensureGeneralBriefingAdmin,
  fetchGeneralPostPageData,
} from "@/features/briefing/services/briefing.general.post";
import { Cover, cx } from "@/features/briefing/components/briefing.ui";
import { redirect } from "next/navigation";
import AdminPostActions from "@/features/briefing/components/AdminPostActions.client";

type AuthorProfile = {
  id: string;
  name: string;
  nickname: string | null;
  role: string;
};

type PostRow = {
  id: string;
  slug: string;
  title: string;
  content_md: string | null;
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

function stripMdToText(md: string) {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/[#>*_~\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function makeBulletLines(md: string | null, maxLines = 3) {
  if (!md) return [];
  const txt = stripMdToText(md);
  if (!txt) return [];

  const rawParts = txt
    .split(/(?<=[\.\?\!])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const lines: string[] = [];
  for (const part of rawParts) {
    if (lines.length >= maxLines) break;
    const s = part.length > 42 ? part.slice(0, 42) + "…" : part;
    lines.push(s);
  }

  if (lines.length === 0) {
    const s = txt.length > 120 ? txt.slice(0, 120) + "…" : txt;
    return [s];
  }

  return lines;
}

// 관리자 체크 코드

export default async function GeneralPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug);

  const { isAdmin, post: data, relatedPosts } =
    await fetchGeneralPostPageData(slug);

  if (!data) notFound();
  const post = normalizePostRow(data);

  const author = post.author_profile;
  const authorName = author?.nickname ?? author?.name ?? "익명";
  const createdAt = (post.published_at ?? post.created_at) as string;
  const badgeLabel = "일반";
  const postId = post.id;

  const relatedData = relatedPosts;
  const relatedItems = (relatedData ?? []) as Array<{
    id: string;
    slug: string;
    title: string;
    content_md: string | null;
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
      <PageContainer className="pb-20">
        {/* ===== Hero ===== */}
        <div className="mb-8">
          <Card className="p-5 overflow-hidden shadow-none h-[500px]">
            <div className="grid grid-cols-1 md:grid-cols-2 h-full gap-5">
              {/* left */}
              <div className="relative full">
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="grid grid-cols-[1fr_auto] items-end gap-4">
                    <div className="ob-typo-h1 text-(--oboon-text-title) line-clamp-3">
                      {post.title}
                    </div>
                    <div className="shrink-0 ob-typo-caption text-(--oboon-text-muted) whitespace-nowrap">
                      {authorName} · {formatDateLong(createdAt)}
                    </div>
                  </div>
                </div>
              </div>

              {/* right image */}
              <div className="h-full">
                <div className="relative h-full w-full overflow-hidden rounded-xl border border-(--oboon-border-default)">
                  <Cover
                    mode="fill"
                    imageUrl={post.cover_image_url ?? undefined}
                    className="h-full w-full"
                  />
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* ===== 본문 + 사이드바 ===== */}
        <div className="mt-15 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_440px]">
          <div className="min-w-0">
            {/* content */}
            <div className="relative">
              {isAdmin ? (
                <div className="absolute z-10">
                  <AdminPostActions
                    editHref={`/briefing/admin/posts/${post.id}/edit`}
                    deleteAction={deletePostAction}
                    postTitle={post.title}
                  />
                </div>
              ) : null}
            </div>
            <div className={cx("ob-md", isAdmin ? "pt-14" : "")}>
              <div className="prose max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {post.content_md ?? ""}
                </ReactMarkdown>
              </div>
            </div>
          </div>

          {/* sidebar */}
          <div className="space-y-4">
            <Card className="p-5 shadow-none">
              <div className="flex items-start justify-between gap-3">
                <Badge variant="status">{badgeLabel}</Badge>
                <Link href="/briefing">
                  <Button variant="secondary" size="sm" shape="pill">
                    전체 글 보기
                  </Button>
                </Link>
              </div>

              <div className="mt-4 flex items-start gap-3">
                <div className="h-12 w-12 shrink-0 rounded-full border border-(--oboon-border-default) bg-(--oboon-bg-subtle)" />
                <div className="min-w-0">
                  <div className="ob-typo-body font-medium text-(--oboon-text-title)">
                    {authorName}
                  </div>
                  <div className="mt-1 ob-typo-caption text-(--oboon-text-muted)">
                    {author?.role === "admin" ? "오분 에디터" : "작성자"}
                  </div>
                </div>
              </div>

              <div className="mt-4 pl-1 ob-typo-caption leading-5 text-(--oboon-text-muted)">
                오분 브리핑의 일반 글입니다. 핵심만 빠르게 읽을 수 있도록
                정리합니다.
              </div>

              <div className="mt-4 flex items-center gap-2">
                <button
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-(--oboon-border-default) bg-(--oboon-bg-surface) hover:bg-(--oboon-bg-subtle)"
                  aria-label="좋아요"
                >
                  <Heart className="h-4 w-4 text-(--oboon-text-muted)" />
                </button>
                <button
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-(--oboon-border-default) bg-(--oboon-bg-surface) hover:bg-(--oboon-bg-subtle)"
                  aria-label="댓글"
                >
                  <MessageCircle className="h-4 w-4 text-(--oboon-text-muted)" />
                </button>
                <button
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-(--oboon-border-default) bg-(--oboon-bg-surface) hover:bg-(--oboon-bg-subtle)"
                  aria-label="공유"
                >
                  <Share2 className="h-4 w-4 text-(--oboon-text-muted)" />
                </button>
              </div>
            </Card>
          </div>
        </div>

        {/* ===== 관련 글 ===== */}
        <Card className="mt-40 shadow-none overflow-hidden p-0">
          <div className="grid h-[500px] grid-cols-1 lg:grid-cols-2">
            <div className="bg-(--oboon-bg-subtle)">
              <div className="h-full rounded-2xl bg-(--oboon-bg-surface) p-10">
                <div className="mb-4 grid grid-cols-[1fr_auto] items-end">
                  <div>
                    <Badge variant="status">{badgeLabel}</Badge>
                  </div>
                  <div className="shrink-0 whitespace-nowrap">
                    <Link href="/briefing" className="inline-block">
                      <Badge
                        variant="status"
                        className="inline-flex items-center gap-1.5 whitespace-nowrap px-0.5 py-0.5"
                      >
                        <span className="leading-none text-[12px] font-medium">
                          더보기
                        </span>
                        <span className="shrink-0 flex h-4 w-4 items-center justify-center rounded-full bg-(--oboon-text-title)">
                          <svg
                            width="10"
                            height="10"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-(--oboon-bg-surface)"
                            aria-hidden="true"
                          >
                            <path d="M5 12h14" />
                            <path d="m13 5 7 7-7 7" />
                          </svg>
                        </span>
                      </Badge>
                    </Link>
                  </div>
                </div>

                <div className="ob-typo-h1 text-(--oboon-text-title)">
                  일반 브리핑
                </div>
                <div className="mt-4 ob-typo-body leading-6 text-(--oboon-text-subtle)">
                  오분의 관점으로 정리한 일반 브리핑 글 모음입니다.
                </div>
              </div>
            </div>

            <div className="bg-(--oboon-bg-subtle)">
              <div className="h-full bg-(--oboon-bg-subtle) p-5">
                <div className="space-y-5">
                  {relatedItems.map((r) => {
                    const href = `/briefing/general/${encodeURIComponent(
                      r.slug
                    )}`;
                    const bullets = makeBulletLines(r.content_md ?? null, 3);

                    return (
                      <Link key={r.id} href={href} className="block">
                        <Card className="p-5 h-[140px] shadow-none bg-(--oboon-bg-surface) hover:bg-(--oboon-bg-subtle) transition-colors">
                          <div className="ob-typo-h3 text-(--oboon-text-title) line-clamp-2">
                            {r.title}
                          </div>
                          {bullets.length > 0 ? (
                            <div className="mt-4 space-y-1">
                              {bullets.map((t, i) => (
                                <div
                                  key={i}
                                  className="ob-typo-body leading-5 text-(--oboon-text-muted) line-clamp-1"
                                >
                                  {t}
                                </div>
                              ))}
                            </div>
                          ) : null}
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
