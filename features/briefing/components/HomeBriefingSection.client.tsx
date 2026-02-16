"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import Card from "@/components/ui/Card";
import { createSupabaseClient } from "@/lib/supabaseClient";

import HomeBriefingCompactCard from "@/features/home/components/HomeBriefingCompactCard";
import HomeBriefingCompactOriginalCard from "@/features/home/components/HomeBriefingCompactOriginalCard";
import type {
  BriefingPostCardModel,
  BriefingOriginalCardModel,
} from "@/features/briefing/domain/briefing";

const BOARD_KEYS = {
  GENERAL_BRIEFING: "general",
  OBOON_ORIGINAL: "oboon_original",
} as const;

function pickFirst<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export default function HomeBriefingSection() {
  const supabase = useMemo(() => createSupabaseClient(), []);

  const [briefingPosts, setBriefingPosts] = useState<BriefingPostCardModel[]>(
    [],
  );
  const [briefingOriginal, setBriefingOriginal] = useState<
    Array<BriefingOriginalCardModel & { count: number }>
  >([]);
  const [briefingError, setBriefingError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data, error } = await supabase
        .from("briefing_posts")
        .select(
          `
          id,
          slug,
          title,
          created_at,
          published_at,
          cover_image_url,
          content_kind,
          external_url,
          board:briefing_boards!inner(key),
          category:briefing_categories(key,name)
          `,
        )
        .eq("status", "published")
        .order("published_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(4);

      if (!mounted) return;

      if (error) {
        console.error("[home briefing posts]", error);
        setBriefingError("브리핑을 불러오지 못했어요.");
        setBriefingPosts([]);
        return;
      }

      setBriefingError(null);

      const mapped: BriefingPostCardModel[] = (data ?? []).map((r) => {
        const board = pickFirst(r.board);
        const category = pickFirst(r.category);
        return {
          id: r.id,
          slug: r.slug,
          title: r.title,
          createdAt: (r.published_at ?? r.created_at) as string,
          coverImageUrl: r.cover_image_url,
          boardKey: board?.key ?? BOARD_KEYS.GENERAL_BRIEFING,
          categoryKey: category?.key ?? null,
          categoryName: category?.name ?? "브리핑",
          contentKind: r.content_kind === "short" ? "short" : "article",
          externalUrl: r.external_url,
        };
      });

      setBriefingPosts(mapped);
    })();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data: board, error: boardErr } = await supabase
        .from("briefing_boards")
        .select(
          `
          id,
          key,
          name,
          description,
          is_active,
          briefing_categories!briefing_categories_board_id_fkey (
            id,
            key,
            name,
            description,
            sort_order,
            is_active
          )
        `,
        )
        .eq("key", BOARD_KEYS.OBOON_ORIGINAL)
        .single();

      if (!mounted) return;

      if (boardErr) {
        console.error("[home briefing original:board]", boardErr);
        setBriefingError("브리핑 시리즈를 불러오지 못했어요.");
        setBriefingOriginal([]);
        return;
      }

      if (!board || board.is_active === false) {
        setBriefingError(null);
        setBriefingOriginal([]);
        return;
      }

      const categoriesRaw = (board.briefing_categories ?? []) as Array<{
        id: string;
        key: string;
        name: string;
        description: string | null;
        sort_order: number | null;
        is_active: boolean;
      }>;

      const categoriesTop = categoriesRaw
        .filter((c) => c?.is_active)
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .slice(0, 4);

      const categoryIds = categoriesTop.map((c) => c.id).filter(Boolean);
      const countByCategory = new Map<string, number>();

      if (categoryIds.length > 0) {
        const { data: posts, error: postsErr } = await supabase
          .from("briefing_posts")
          .select("id, category_id")
          .in("category_id", categoryIds)
          .eq("status", "published");

        if (!mounted) return;

        if (postsErr) {
          console.error("[home briefing original:counts]", postsErr);
        } else {
          for (const p of posts ?? []) {
            const k = p.category_id as string;
            countByCategory.set(k, (countByCategory.get(k) ?? 0) + 1);
          }
        }
      }

      setBriefingError(null);

      const mapped: Array<BriefingOriginalCardModel & { count: number }> =
        categoriesTop.map((c) => ({
          key: c.key,
          name: c.name,
          description: c.description ?? null,
          count: countByCategory.get(c.id) ?? 0,
        }));

      setBriefingOriginal(mapped);
    })();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  return (
    <section className="mt-8 sm:mt-10 flex flex-col gap-2">
      <SectionHeader
        title="오분 브리핑"
        caption="핵심만 빠르게, 판단에 필요한 정보만 정리합니다."
        rightLink={{ href: "/briefing", label: "전체보기" }}
      />

      {briefingError ? (
        <Card className="p-6">
          <div className="ob-typo-body text-(--oboon-text-muted)">
            {briefingError}
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* 최신 브리핑 */}
          <Card className="p-0 overflow-hidden">
            <div className="border-b border-(--oboon-border-default) px-5 py-4">
              <div className="flex items-baseline justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <h3 className="ob-typo-h3 text-(--oboon-text-title)">
                    최신 브리핑
                  </h3>
                  <p className="ob-typo-caption text-(--oboon-text-muted)">
                    최근 공개된 콘텐츠를 확인하세요.
                  </p>
                </div>

                <Link
                  href="/briefing"
                  className="shrink-0 ob-typo-caption text-(--oboon-text-muted) hover:text-(--oboon-primary)"
                >
                  더보기
                </Link>
              </div>
            </div>

            <div className="p-4">
              {briefingPosts.length === 0 ? (
                <div className="rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle) p-5">
                  <div className="ob-typo-caption text-(--oboon-text-muted)">
                    아직 공개된 브리핑이 없습니다.
                  </div>
                </div>
              ) : (
                <>
                  {/* Mobile: 2개만 */}
                  <div className="grid gap-3 sm:hidden">
                    {briefingPosts.slice(0, 2).map((post) => (
                      <HomeBriefingCompactCard key={post.id} post={post} />
                    ))}
                  </div>

                  {/* Tablet/Desktop: 기존대로(최대 4개) */}
                  <div className="hidden sm:grid gap-3 sm:grid-cols-2">
                    {briefingPosts.map((post) => (
                      <HomeBriefingCompactCard key={post.id} post={post} />
                    ))}
                  </div>
                </>
              )}
            </div>
          </Card>

          {/* 오분 오리지널 */}
          <Card className="p-0 overflow-hidden">
            <div className="border-b border-(--oboon-border-default) px-5 py-4">
              <div className="flex items-baseline justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <div className="ob-typo-h3 text-(--oboon-text-title)">
                    오분 오리지널
                  </div>
                  <p className="ob-typo-caption text-(--oboon-text-muted)">
                    주제별로 모아보는 깊이 있는 시리즈.
                  </p>
                </div>

                <Link
                  href="/briefing/oboon-original"
                  className="shrink-0 ob-typo-caption text-(--oboon-text-muted) hover:text-(--oboon-primary)"
                >
                  시리즈 보기
                </Link>
              </div>
            </div>

            <div className="p-4">
              {briefingOriginal.length === 0 ? (
                <div className="rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle) p-5">
                  <div className="ob-typo-caption text-(--oboon-text-muted)">
                    아직 공개된 시리즈가 없습니다.
                  </div>
                </div>
              ) : (
                <>
                  {/* Mobile: 2개만 */}
                  <div className="grid gap-3 sm:hidden">
                    {briefingOriginal.slice(0, 2).map((s) => (
                      <HomeBriefingCompactOriginalCard
                        key={s.key}
                        Original={s}
                        count={s.count}
                      />
                    ))}
                  </div>

                  {/* Tablet/Desktop: 기존대로(최대 4개) */}
                  <div className="hidden sm:grid gap-3 sm:grid-cols-2">
                    {briefingOriginal.map((s) => (
                      <HomeBriefingCompactOriginalCard
                        key={s.key}
                        Original={s}
                        count={s.count}
                      />
                    ))}
                  </div>
                </>
              )}{" "}
            </div>
          </Card>
        </div>
      )}
    </section>
  );
}

function SectionHeader({
  title,
  caption,
  rightLink,
}: {
  title: string;
  caption?: string;
  rightLink?: { href: string; label: string };
}) {
  return (
    <div className="mb-3 sm:mb-4 flex items-baseline justify-between gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="ob-typo-h2 text-(--oboon-text-title)">{title}</h2>
        {caption && (
          <p className="ob-typo-caption text-(--oboon-text-muted)">{caption}</p>
        )}
      </div>

      {rightLink ? (
        <Link
          href={rightLink.href}
          className="shrink-0 ob-typo-caption text-(--oboon-text-muted) hover:text-(--oboon-primary)"
        >
          {rightLink.label}
        </Link>
      ) : null}
    </div>
  );
}
