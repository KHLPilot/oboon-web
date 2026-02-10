// app/briefing/page.tsx
import Link from "next/link";

import PageContainer from "@/components/shared/PageContainer";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

import { fetchBriefingHomeData } from "@/features/briefing/services/briefing.home";
import { Cover, cx } from "@/features/briefing/components/briefing.ui";
import BriefingCardGrid from "@/features/briefing/components/BriefingCardGrid";

type PostRow = {
  id: string;
  slug: string;
  title: string;
  content_md: string | null;
  created_at: string;
  published_at?: string | null;
  cover_image_url: string | null;
  board: { key: string } | { key: string }[] | null;
  category:
    | { key: string; name: string }
    | { key: string; name: string }[]
    | null;
  post_tags?:
    | {
        tag: {
          id: string;
          name: string;
          sort_order: number | null;
          is_active: boolean;
        } | {
          id: string;
          name: string;
          sort_order: number | null;
          is_active: boolean;
        }[] | null;
      }[]
    | null;
};

function pickName(
  v: { name?: string } | { name?: string }[] | null,
): string | null {
  if (!v) return null;
  return Array.isArray(v) ? v?.[0]?.name ?? null : v?.name ?? null;
}

function pickFirst<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

function pickPrimaryTagName(post: PostRow): string | null {
  const items = post.post_tags ?? [];
  const activeTags = items
    .map((x) => pickFirst(x?.tag))
    .filter(
      (
        t,
      ): t is {
        id: string;
        name: string;
        sort_order: number | null;
        is_active: boolean;
      } => Boolean(t && t.is_active),
    );

  if (activeTags.length === 0) return null;

  activeTags.sort((a, b) => {
    const ao = typeof a.sort_order === "number" ? a.sort_order : 0;
    const bo = typeof b.sort_order === "number" ? b.sort_order : 0;
    if (ao !== bo) return ao - bo;
    return String(a.name ?? "").localeCompare(String(b.name ?? ""));
  });

  return activeTags[0]?.name ?? null;
}

export default async function BriefingPage() {
  const { isAdmin, heroPost, tagData, generalPosts } =
    await fetchBriefingHomeData();

  return (
    <main className="bg-(--oboon-bg-page)">
      <PageContainer className="pb-20">
        {/* ===== HERO (OBOON Original) ===== */}
        <div className="mb-10">
          <Card className="p-5 overflow-hidden shadow-none h-125">
            <div className="grid grid-cols-1 md:grid-cols-2 h-full gap-5">
              {/* left */}
              <div className="relative h-full">
                <div className="flex h-full flex-col">
                  {/* chips (좌상단) */}
                  <div className="flex flex-wrap gap-2">
                    {(tagData ?? []).map((t) => (
                      <span
                        key={t.key}
                        className={cx(
                          "inline-flex items-center rounded-full border px-3 py-1 ob-typo-caption",
                          "border-(--oboon-border-default) bg-(--oboon-bg-subtle) text-(--oboon-text-muted)"
                        )}
                      >
                        {t.name}
                      </span>
                    ))}
                  </div>

                  {/* 중앙 카피 (스크린샷처럼 가운데 정렬) */}
                  <div className="flex-1 flex items-center justify-end">
                    <div
                      className={cx(
                        "ob-typo-h3 text-(--oboon-text-muted)",
                        "text-right",
                        "break-keep",
                        "max-w-60"
                      )}
                    >
                      OBOON이 직접 정리한
                      <br />
                      분양을 읽는 기준.
                    </div>
                  </div>

                  {/* 하단: 타이틀  버튼 (스크린샷처럼 같은 줄) */}

                  <div className="ob-typo-display text-(--oboon-text-title)">
                    OBOON
                    <br />
                    Original
                  </div>
                  <div
                    className={cx(
                      "absolute bottom-0 right-0 flex items-center gap-2"
                    )}
                  >
                    {isAdmin ? (
                      <Link href="/briefing/admin/posts/new">
                        <Button
                          variant="secondary"
                          size="sm"
                          shape="pill"
                          className="h-10 mb-2.5"
                        >
                          글쓰기
                        </Button>
                      </Link>
                    ) : null}

                    <Link href="/briefing/oboon-original" className="shrink-0">
                      <Button
                        size="sm"
                        shape="pill"
                        className="w-35 h-10 mb-2.5"
                      >
                        보러가기
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>

              {/* right image */}
              <div className="h-full">
                <Cover
                  mode="fill"
                  imageUrl={heroPost?.cover_image_url ?? undefined}
                  className="rounded-2xl md:h-full w-full"
                />
              </div>
            </div>
          </Card>
        </div>

        {/* ===== 일반 브리핑 ===== */}
        <div className="mb-4">
          <div className="flex items-end justify-between gap-3">
            <div className="ob-typo-h2 text-(--oboon-text-title)">
              일반 브리핑
            </div>
          </div>
          <div className="mt-1 ob-typo-caption text-(--oboon-text-muted)">
            단일 주제로 정리된 최신 브리핑 글입니다.
          </div>
        </div>
        <BriefingCardGrid
          posts={generalPosts.map((p) => ({
            id: p.id,
            href: `/briefing/general/${encodeURIComponent(p.slug)}`,
            slug: p.slug,
            title: p.title,
            content_md: p.content_md ?? null,
            created_at: p.created_at,
            published_at: p.published_at ?? null,
            cover_image_url: p.cover_image_url ?? null,
            badgeLabel:
              pickPrimaryTagName(p) ?? pickName(p.category) ?? "브리핑",
          }))}
          initialCount={4}
          step={4}
        />
      </PageContainer>
    </main>
  );
}
