"use client";

// app/page.tsx
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import PageContainer from "@/components/shared/PageContainer";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { UXCopy } from "@/shared/uxCopy";

import OfferingCard from "@/features/offerings/OfferingCard";
import { fetchPropertiesForOfferings } from "@/features/offerings/services/offering.query";
import {
  mapPropertyRowToOffering,
  hasAppraiserComment,
  type PropertyRow,
} from "@/features/offerings/mappers/offering.mapper";
import { OFFERING_REGION_TABS } from "@/features/offerings/domain/offering.constants";
import type { OfferingRegionTab } from "@/features/offerings/domain/offering.types";

import HomeBriefingCompactCard from "@/features/home/HomeBriefingCompactCard";
import HomeBriefingCompactOriginalCard from "@/features/home/HomeBriefingCompactOriginalCard";

import { createSupabaseClient } from "@/lib/supabaseClient";

import type { Offering } from "@/types/index";
import type {
  BriefingPostCardModel,
  BriefingOriginalCardModel,
} from "@/features/briefing/types";

const BOARD_KEYS = {
  GENERAL_BRIEFING: "general",
  OBOON_ORIGINAL: "oboon_original",
} as const;

/* ================================
 * Page
 * ================================ */
export default function HomePage() {
  const supabase = useMemo(() => createSupabaseClient(), []);

  /* ---------- Offerings state ---------- */
  const [rows, setRows] = useState<PropertyRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] =
    useState<OfferingRegionTab>("전체");

  /* ---------- Briefing state ---------- */
  const [briefingPosts, setBriefingPosts] = useState<BriefingPostCardModel[]>(
    [],
  );
  const [briefingOriginal, setBriefingOriginal] = useState<
    Array<BriefingOriginalCardModel & { count: number }>
  >([]);
  const [briefingError, setBriefingError] = useState<string | null>(null);

  /* ---------- Offerings fetch ---------- */
  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data, error } = await fetchPropertiesForOfferings(supabase, {
        limit: 24,
      });

      if (!mounted) return;

      if (error) {
        setLoadError(error.message ?? "데이터를 불러오지 못했어요.");
        setRows([]);
        return;
      }

      setLoadError(null);
      setRows((data ?? []) as PropertyRow[]);
    })();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  /* ---------- Briefing posts fetch (latest 4) ---------- */
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

      // Supabase join alias는 기본적으로 객체(또는 null)로 내려오는 형태가 정상입니다.
      const mapped: BriefingPostCardModel[] = (data ?? []).map((r: any) => ({
        id: r.id,
        slug: r.slug,
        title: r.title,
        createdAt: (r.published_at ?? r.created_at) as string,
        coverImageUrl: r.cover_image_url,
        boardKey: r.board?.key ?? BOARD_KEYS.GENERAL_BRIEFING,
        categoryKey: r.category?.key ?? null,
        categoryName: r.category?.name ?? "브리핑",
        contentKind: r.content_kind === "short" ? "short" : "article",
        externalUrl: r.external_url,
      }));

      setBriefingPosts(mapped);
    })();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  /* ---------- Briefing Original fetch (top 4 categories + counts) ---------- */
  useEffect(() => {
    let mounted = true;

    (async () => {
      // 1) 오분 오리지널 보드에서 카테고리를 FK 기반으로 중첩 조회
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

      const categoriesRaw: any[] = (board.briefing_categories ?? []) as any[];

      const categoriesTop = categoriesRaw
        .filter((c) => c?.is_active)
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .slice(0, 4);

      // 2) 카테고리별 게시글 수 집계(발행된 글만)
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
          // 카운트 실패는 치명적이지 않으니 0으로 렌더링
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

  /* ---------- Mappers ---------- */
  const fallback = useMemo(
    () => ({
      addressShort: UXCopy.addressShort,
      regionShort: UXCopy.regionShort,
    }),
    [],
  );

  const offerings: Offering[] = useMemo(
    () => rows.map((row) => mapPropertyRowToOffering(row, fallback)),
    [rows, fallback],
  );

  const reviewOfferings: Offering[] = useMemo(() => {
    return rows
      .filter(hasAppraiserComment)
      .map((row) => mapPropertyRowToOffering(row, fallback));
  }, [rows, fallback]);

  const reviewIds = useMemo(
    () => new Set(reviewOfferings.map((o) => o.id)),
    [reviewOfferings],
  );

  const popularOfferings: Offering[] = useMemo(() => {
    const base =
      selectedRegion === "전체"
        ? offerings
        : offerings.filter((o) => o.region === selectedRegion);

    return base;
  }, [offerings, selectedRegion, reviewIds]);

  return (
    <main className="min-h-screen bg-(--oboon-bg-page)">
      <PageContainer>
        <div className="flex flex-col gap-10">
          <HeroSection />

          {/* 감정평가사 한줄평 */}
          <section className="mt-8 sm:mt-10 flex flex-col gap-2">
            <SectionHeader
              title="감정평가사 한줄평"
              caption="전문가들이 직접 남긴 솔직한 평가를 확인해보세요."
              rightLink={{ href: "/offerings", label: "전체보기" }}
            />

            {loadError && (
              <div className="ob-typo-caption text-(--oboon-danger)">
                데이터를 불러오지 못했어요. ({loadError})
              </div>
            )}

            {reviewOfferings.length === 0 ? (
              <Card className="p-6 ob-typo-body text-(--oboon-text-muted)">
                아직 등록된 감정평가사 한줄평이 없어요.
              </Card>
            ) : (
              <ResponsiveOfferingRow items={reviewOfferings} />
            )}
          </section>

          {/* 지역별 인기 분양 */}
          <section className="mt-8 sm:mt-10 flex flex-col gap-2">
            <SectionHeader
              title="지역별 인기 분양"
              caption="지역별로 인기있는 분양 현장을 확인해보세요."
            />
            <div>
              <RegionFilterRow
                value={selectedRegion}
                onChange={setSelectedRegion}
              />
            </div>

            <div className="mt-3">
              {popularOfferings.length === 0 ? (
                <Card className="p-6 ob-typo-body text-(--oboon-text-muted)">
                  선택한 지역에서 보여줄 분양이 아직 없어요.
                </Card>
              ) : (
                <ResponsiveOfferingRow items={popularOfferings} />
              )}
            </div>
          </section>

          {/* 오분 브리핑 */}
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
                            <HomeBriefingCompactCard
                              key={post.id}
                              post={post}
                            />
                          ))}
                        </div>

                        {/* Tablet/Desktop: 기존대로(최대 4개) */}
                        <div className="hidden sm:grid gap-3 sm:grid-cols-2">
                          {briefingPosts.map((post) => (
                            <HomeBriefingCompactCard
                              key={post.id}
                              post={post}
                            />
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
        </div>
      </PageContainer>
    </main>
  );
}

/* ---------- Hero ---------- */
function HeroSection() {
  return (
    <section className="pt-20 pb-10 sm:pt-20 flex flex-col items-center gap-6 sm:gap-7 text-center">
      <div className="space-y-5">
        <div className="ob-typo-display text-(--oboon-text-title)">
          오늘의 분양
          <br />
          데이터를 투명하게
        </div>

        <p className="ob-typo-body text-(--oboon-text-body)">
          복잡한 공고문 대신 핵심만 간단하게 정리해 드립니다.
          <br />
          빅데이터 기반의 객관적인 분양 정보를 만나보세요.
        </p>
      </div>

      <div className="mt-4 flex w-full max-w-18 flex-row justify-center gap-3">
        {/* 내 청약조건 분석하기 → 분양 리스트 */}
        <Link href="/offerings" className="flex-1 sm:flex-none">
          <Button size="lg" variant="primary" className="w-full sm:min-w-55">
            내 청약조건 분석하기
          </Button>
        </Link>

        {/* 지도에서 보기 → 지도 페이지 */}
        <Link href="/map" className="flex-1 sm:flex-none">
          <Button size="lg" variant="secondary" className="w-full sm:min-w-55">
            지도에서 보기
          </Button>
        </Link>
      </div>
    </section>
  );
}

/* ---------- Header ---------- */
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

function ProjectRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
  );
}

/**
 * Home 전용: 모바일에서는 가로 스크롤(슬라이드), sm 이상에서는 기존 그리드
 * - 카드 컴포넌트(OfferingCard)는 그대로 사용
 * - 모바일에서만 카드 폭을 고정(shrink-0)해서 좌우 스크롤이 자연스럽게 되도록 처리
 */

function ResponsiveOfferingRow({ items }: { items: Offering[] }) {
  return (
    <>
      {/* Mobile */}
      <div className="sm:hidden">
        {/* PageContainer(px-4) 밖으로 빼서 스크롤이 화면 끝까지 자연스럽게 */}
        <div className="-mx-4">
          <div className="relative">
            <div
              className={[
                "flex gap-3 overflow-x-auto pb-3 px-4",
                "snap-x snap-mandatory",
                "[-webkit-overflow-scrolling:touch]",
                "scrollbar-none",
                "scroll-pl-4 scroll-pr-4",
              ].join(" ")}
            >
              {items.map((offering) => (
                <div key={offering.id} className="w-70 shrink-0 snap-start">
                  <OfferingCard offering={offering} />
                </div>
              ))}

              <div className="shrink-0 w-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Desktop/Tablets: grid */}
      <div className="hidden sm:block">
        <ProjectRow>
          {items.map((offering) => (
            <OfferingCard key={offering.id} offering={offering} />
          ))}
        </ProjectRow>
      </div>
    </>
  );
}

/* ---------- Region Filter ---------- */
function RegionFilterRow({
  value,
  onChange,
}: {
  value: OfferingRegionTab;
  onChange: (v: OfferingRegionTab) => void;
}) {
  return (
    <>
      {/* Mobile: horizontal scroll chips */}
      <div className="sm:hidden -mx-4 pl-4">
        <div className="flex gap-2 overflow-x-auto pb-2 pr-4 [-webkit-overflow-scrolling:touch] scrollbar-none">

          {OFFERING_REGION_TABS.map((region) => {
            const isActive = value === region;
            return (
              <Button
                key={region}
                type="button"
                size="sm"
                shape="pill"
                variant={isActive ? "primary" : "secondary"}
                onClick={() => onChange(region)}
                className="shrink-0"
                aria-pressed={isActive}
              >
                {region}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Tablet/Desktop: 기존 버튼 UI 유지 */}
      <div className="hidden sm:flex flex-wrap gap-2">
        {OFFERING_REGION_TABS.map((region) => {
          const isActive = value === region;
          return (
            <Button
              key={region}
              type="button"
              size="sm"
              shape="pill"
              variant={isActive ? "primary" : "secondary"}
              onClick={() => onChange(region)}
            >
              {region}
            </Button>
          );
        })}
      </div>
    </>
  );
}
