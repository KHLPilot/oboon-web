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
    []
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

  /* ---------- Briefing posts fetch (latest 3) ---------- */
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
        `
        )
        .eq("status", "published")
        .order("published_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(3);

      if (!mounted) return;

      if (error) {
        console.error("[home briefing posts]", error);
        setBriefingError("브리핑을 불러오지 못했어요.");
        setBriefingPosts([]);
        return;
      }

      setBriefingError(null);

      const mapped: BriefingPostCardModel[] = (data ?? []).map((r: any) => ({
        id: r.id,
        slug: r.slug,
        title: r.title,
        createdAt: (r.published_at ?? r.created_at) as string,
        coverImageUrl: r.cover_image_url,
        boardKey: r.board?.[0]?.key ?? "general",
        categoryKey: r.category?.[0]?.key ?? null,
        categoryName: r.category?.[0]?.name ?? "브리핑",
        contentKind: r.content_kind === "short" ? "short" : "article",
        externalUrl: r.external_url,
      }));

      setBriefingPosts(mapped);
    })();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  /* ---------- Briefing Original fetch (top 3) ---------- */
  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data, error } = await supabase
        .from("briefing_categories")
        .select(
          `
          key,
          name,
          description,
          posts:briefing_posts(count)
        `
        )
        .eq("board_key", "oboon_Original")
        .eq("is_active", true)
        .limit(3);

      if (!mounted) return;

      if (error) {
        console.error("[home briefing Original]", error);
        setBriefingError("브리핑 시리즈를 불러오지 못했어요.");
        setBriefingOriginal([]);
        return;
      }

      setBriefingError(null);

      const mapped: Array<BriefingOriginalCardModel & { count: number }> = (
        data ?? []
      ).map((s: any) => ({
        key: s.key,
        name: s.name,
        description: s.description ?? null,
        count: s.posts?.[0]?.count ?? 0,
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
    []
  );

  const offerings: Offering[] = useMemo(
    () => rows.map((row) => mapPropertyRowToOffering(row, fallback)),
    [rows, fallback]
  );

  const reviewOfferings: Offering[] = useMemo(() => {
    return rows
      .filter(hasAppraiserComment)
      .map((row) => mapPropertyRowToOffering(row, fallback));
  }, [rows, fallback]);

  const reviewIds = useMemo(
    () => new Set(reviewOfferings.map((o) => o.id)),
    [reviewOfferings]
  );

  const popularOfferings: Offering[] = useMemo(() => {
    const base =
      selectedRegion === "전체"
        ? offerings
        : offerings.filter((o) => o.region === selectedRegion);

    return base.filter((o) => !reviewIds.has(o.id));
  }, [offerings, selectedRegion, reviewIds]);

  return (
    <main className="min-h-screen bg-(--oboon-bg-page)">
      <PageContainer className="pt-16 pb-20">
        <div className="flex flex-col gap-10">
          <HeroSection />

          {/* 감정평가사 한줄평 */}
          <section className="mt-10 flex flex-col gap-2">
            <SectionHeader
              title="감정평가사 한줄평"
              caption="전문가들이 직접 남긴 솔직한 평가를 확인해보세요."
              rightLink={{ href: "/offerings", label: "전체보기" }}
            />

            {loadError && (
              <div className="text-[12px] text-red-500">
                데이터를 불러오지 못했어요. ({loadError})
              </div>
            )}

            {reviewOfferings.length === 0 ? (
              <Card className="p-6 text-sm text-(--oboon-text-muted)">
                아직 등록된 감정평가사 한줄평이 없어요.
              </Card>
            ) : (
              <ProjectRow>
                {reviewOfferings.map((offering) => (
                  <OfferingCard key={offering.id} offering={offering} />
                ))}
              </ProjectRow>
            )}
          </section>

          {/* 지역별 인기 분양 */}
          <section className="mt-10 flex flex-col gap-2">
            <SectionHeader title="지역별 인기 분양" />
            <div className="mt-2">
              <RegionFilterRow
                value={selectedRegion}
                onChange={setSelectedRegion}
              />
            </div>

            <div className="mt-3">
              {popularOfferings.length === 0 ? (
                <Card className="p-6 text-sm text-(--oboon-text-muted)">
                  선택한 지역에서 보여줄 분양이 아직 없어요.
                </Card>
              ) : (
                <ProjectRow>
                  {popularOfferings.map((offering) => (
                    <OfferingCard key={offering.id} offering={offering} />
                  ))}
                </ProjectRow>
              )}
            </div>
          </section>

          {/* 오분 브리핑 */}
          <section className="flex flex-col gap-2">
            <SectionHeader
              title="오분 브리핑"
              rightLink={{ href: "/briefing", label: "전체보기" }}
            />

            {briefingError ? (
              <Card className="p-6 text-sm text-(--oboon-text-muted)">
                {briefingError}
              </Card>
            ) : (
              <Card>
                <div className="-m-5 rounded-2xl bg-(--oboon-bg-subtle) p-3">
                  <div className="grid gap-4 lg:grid-cols-4">
                    {briefingPosts.length === 0 ? (
                      <div className="text-[13px] text-(--oboon-text-muted)">
                        아직 공개된 브리핑이 없습니다.
                      </div>
                    ) : (
                      briefingPosts.map((post) => (
                        <HomeBriefingCompactCard key={post.id} post={post} />
                      ))
                    )}
                  </div>

                  <div className="mt-4 grid gap-4 lg:grid-cols-4">
                    {briefingOriginal.length === 0 ? (
                      <div className="text-[13px] text-(--oboon-text-muted)">
                        아직 공개된 시리즈가 없습니다.
                      </div>
                    ) : (
                      briefingOriginal.map((s) => (
                        <HomeBriefingCompactOriginalCard
                          key={s.key}
                          Original={s}
                          count={s.count}
                        />
                      ))
                    )}
                  </div>
                </div>
              </Card>
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
    <section className="flex flex-col items-center gap-7 text-center">
      <div className="space-y-5">
        <h1 className="text-4xl font-bold leading-tight text-(--oboon-text-title) md:text-5xl">
          오늘의 분양
          <br />
          데이터를 투명하게
        </h1>

        <p className="text-base leading-relaxed text-(--oboon-text-body) md:text-lg">
          복잡한 공고문 대신 핵심만 간단하게 정리해 드립니다.
          <br />
          빅데이터 기반의 객관적인 분양 정보를 만나보세요.
        </p>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-4">
        <Button size="lg" variant="primary">
          내 청약조건 분석하기
        </Button>
        <Link href="/offerings">
          <Button size="lg" variant="secondary">
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
    <div className="mb-4 flex items-baseline justify-between gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold tracking-tight text-(--oboon-text-title) md:text-2xl">
          {title}
        </h2>
        {caption && (
          <p className="text-sm text-(--oboon-text-muted) md:text-base">
            {caption}
          </p>
        )}
      </div>

      {rightLink ? (
        <Link
          href={rightLink.href}
          className="shrink-0 text-sm font-medium text-(--oboon-text-muted) hover:text-(--oboon-primary)"
        >
          {rightLink.label}
        </Link>
      ) : null}
    </div>
  );
}

function ProjectRow({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 md:grid-cols-4">{children}</div>;
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
    <div className="flex flex-wrap gap-2">
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
  );
}
