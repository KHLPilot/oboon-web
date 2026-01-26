// app/briefing/oboon-original/[categoryKey]/[slug]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { Heart, MessageCircle, Share2, Tag } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { redirect } from "next/navigation";

import PageContainer from "@/components/shared/PageContainer";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import AdminPostActions from "@/features/briefing/components/AdminPostActions.client";

import BriefingOriginalCard from "@/features/briefing/components/oboon-original/BriefingOriginalCard";
import { Cover, cx } from "@/features/briefing/components/briefing.ui";

import {
  deleteBriefingPost,
  ensureBriefingAdmin,
  fetchOboonOriginalPostPageData,
} from "@/features/briefing/services/briefing.original.post";

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

function normalizePostRow(raw: any): PostRow {
  return {
    ...raw,
    author_profile: normalizeAuthorProfile(raw?.author_profile),
    post_tags: (raw?.post_tags ?? []).map((pt: any) => ({
      tag: Array.isArray(pt?.tag) ? pt.tag[0] ?? null : pt?.tag ?? null,
    })),
  };
}

function formatDateLong(iso: string) {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}.${m}.${day}`;
}

function pickPrimaryTagName(post: PostRow): string | null {
  const items = (post.post_tags ?? []) as any[];
  const activeTags = items.map((x) => x?.tag).filter((t) => t && t.is_active);

  if (activeTags.length === 0) return null;

  activeTags.sort((a, b) => {
    const ao = typeof a.sort_order === "number" ? a.sort_order : 0;
    const bo = typeof b.sort_order === "number" ? b.sort_order : 0;
    if (ao !== bo) return ao - bo;
    return String(a.name ?? "").localeCompare(String(b.name ?? ""));
  });

  return activeTags[0]?.name ?? null;
}

export default async function OboonOriginalPostPage({
  params,
}: {
  params: { categoryKey: string; slug: string };
}) {
  const categoryKey = decodeURIComponent(params.categoryKey);
  const slug = decodeURIComponent(params.slug);

  // 관리자 체크
  const {
    isAdmin,
    boardId,
    category: cat,
    post: data,
    relatedPosts,
    recCats,
    recCounts,
  } = await fetchOboonOriginalPostPageData({ categoryKey, slug });

  if (!cat) notFound();
  if (!data) notFound();
  const post = normalizePostRow(data);

  const relatedData = relatedPosts;
  const author = post.author_profile;
  const authorName = author?.nickname ?? author?.name ?? "익명";
  const createdAt = (post.published_at ?? post.created_at) as string;
  const primaryTagName = pickPrimaryTagName(post) ?? cat.name;
  const badgeLabel = primaryTagName;
  const postId = post.id;

  async function deletePostAction() {
    "use server";

    const adminOk = await ensureBriefingAdmin();
    if (!adminOk) redirect("/briefing");

    const { error } = await deleteBriefingPost(postId);
    if (error) throw error;

    redirect(`/briefing/oboon-original/${encodeURIComponent(categoryKey)}`);
  }
  // 추천 오리지널 시리즈(카테고리 3개)
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

  // "문장/구절"을 2~3줄로 쪼개서 반환
  function makeBulletLines(md: string | null, maxLines = 3) {
    if (!md) return [];
    const txt = stripMdToText(md);
    if (!txt) return [];

    // 1) 마침표/물음표/느낌표/줄바꿈 기반으로 우선 분리
    const rawParts = txt
      .split(/(?<=[\.\?\!])\s+|\n+/)
      .map((s) => s.trim())
      .filter(Boolean);

    // 2) 너무 길면 적당히 잘라서 1줄로
    const lines: string[] = [];
    for (const part of rawParts) {
      if (lines.length >= maxLines) break;

      const s = part.length > 42 ? part.slice(0, 42) + "…" : part;
      lines.push(s);
    }

    // 3) 문장 분리가 잘 안 됐으면 fallback: 일정 길이로 슬라이스
    if (lines.length === 0) {
      const s = txt.length > 120 ? txt.slice(0, 120) + "…" : txt;
      return [s];
    }

    return lines;
  }

  return (
    <main className="bg-(--oboon-bg-page)">
      <PageContainer className="pb-20">
        {/* ===== Hero ===== */}
        <div className="mb-8">
          <Card className="p-5 overflow-hidden shadow-none h-125">
            <div className="grid grid-cols-1 md:grid-cols-2 h-full gap-5">
              {/* left */}
              <div className="relative full">
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="grid grid-cols-[1fr_auto] items-end gap-4">
                    {/* 제목 */}
                    <div className="ob-typo-h1 text-(--oboon-text-title) line-clamp-3">
                      {post.title}
                    </div>

                    {/* 작성자 · 날짜 */}
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
          {/* content */}
          <div className="min-w-0">
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

              {/* 버튼 영역만큼 본문을 아래로 내림 */}
              <div className={cx("ob-md", isAdmin ? "pt-14" : "")}>
                <div className="prose max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {post.content_md ?? ""}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          </div>

          {/* sidebar */}
          <div className="space-y-4">
            <Card className="p-5 shadow-none">
              {/* 상단: 뱃지 + 버튼 */}
              <div className="flex items-start justify-between gap-3">
                <Badge variant="status">{badgeLabel}</Badge>

                <Link
                  href={`/briefing/oboon-original/${encodeURIComponent(
                    categoryKey
                  )}`}
                >
                  <Button variant="secondary" size="sm" shape="pill">
                    전체 글 보기
                  </Button>
                </Link>
              </div>

              {/* 작성자 블록 */}
              <div className="mt-4 flex items-start gap-3">
                {/* 아바타 */}
                <div className="h-12 w-12 shrink-0 rounded-full border border-(--oboon-border-default) bg-(--oboon-bg-subtle)" />
                {/* 작성자 정보 + 설명 */}
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
                오분에서 요약/정리한 시리즈를 모아둔 곳입니다. 사용자의 판단이
                더 선명해지도록 돕는 것이 핵심입니다.
              </div>

              {/* 액션 아이콘 */}
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

        {/* ===== 관련 블록 (카테고리 카드 + 관련 글 리스트) ===== */}
        <Card className="mt-40 shadow-none overflow-hidden p-0">
          <div className="grid h-124 grid-cols-1 lg:grid-cols-2">
            <div className="bg-(--oboon-bg-subtle)">
              <div className="h-full rounded-2xl bg-(--oboon-bg-surface) p-10">
                <div className="mb-4 grid grid-cols-[1fr_auto] items-end">
                  <div>
                    <Badge variant="status">{primaryTagName}</Badge>
                  </div>

                  <div className="shrink-0 whitespace-nowrap">
                    <Link
                      href={`/briefing/oboon-original/${encodeURIComponent(
                        categoryKey
                      )}`}
                      className="inline-block"
                    >
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
                  {cat.name}
                </div>

                <div className="mt-4 ob-typo-body leading-6 text-(--oboon-text-subtle)">
                  {cat.description}
                </div>
              </div>
            </div>

            {/* ===== 우측 패널 (subtle) ===== */}
            <div className="bg-(--oboon-bg-surface)">
              <div className="h-full bg-(--oboon-bg-subtle) p-5">
                <div className="space-y-5">
                  {(relatedData ?? []).map((r: any) => {
                    const href = `/briefing/oboon-original/${encodeURIComponent(
                      categoryKey
                    )}/${encodeURIComponent(r.slug)}`;

                    const bullets = makeBulletLines(r.content_md ?? null, 3);

                    return (
                      <Link key={r.id} href={href} className="block">
                        <Card className="p-5 h-35 shadow-none bg-(--oboon-bg-surface) hover:bg-(--oboon-bg-subtle) transition-colors">
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

        {/* ===== 추천 오리지널 시리즈 ===== */}
        <div className="mt-16">
          <div className="mb-4 ob-typo-h3 text-(--oboon-text-title)">
            추천 오리지널 시리즈
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {(recCats ?? []).map((c: any) => (
              <BriefingOriginalCard
                key={c.key}
                original={{
                  key: c.key,
                  name: c.name,
                  description: "카테고리명",
                  coverImageUrl: null,
                }}
                count={recCounts.get(c.key) ?? 0}
                href={`/briefing/oboon-original/${encodeURIComponent(c.key)}`}
              />
            ))}
          </div>
        </div>
      </PageContainer>
    </main>
  );
}
