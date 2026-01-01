"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useSearchParams } from "next/navigation";

import PageContainer from "@/components/shared/PageContainer";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

import BriefingPostCard from "@/features/briefing/BriefingPostCard";
import BriefingSeriesCard from "@/features/briefing/BriefingSeriesCard";

import { POSTS, SERIES, type BriefingPost, type BriefingSeries } from "./_data";

export default function BriefingPage() {
  const sp = useSearchParams();
  const seriesId = sp.get("series"); // /briefing?series=s_region

  const latest = useMemo(() => {
    return [...POSTS].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, []);

  const seriesCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of POSTS) {
      if (!p.seriesId) continue;
      m.set(p.seriesId, (m.get(p.seriesId) ?? 0) + 1);
    }
    return m;
  }, []);

  const selectedSeries = useMemo(() => {
    if (!seriesId) return null;
    return SERIES.find((s) => s.id === seriesId) ?? null;
  }, [seriesId]);

  const filteredPosts = useMemo(() => {
    if (!seriesId) return [];
    return latest.filter((p) => p.seriesId === seriesId);
  }, [latest, seriesId]);

  return (
    <main className="bg-(--oboon-bg-page)">
      <PageContainer>
        {/* 헤더 */}
        <div className="mb-5">
          <h1 className="mb-1 text-[28px] font-semibold tracking-[-0.02em] text-(--oboon-text-title)">
            브리핑
          </h1>
          <p className="text-[14px] leading-[1.6] text-(--oboon-text-muted)">
            실시간 업데이트 소식과 시리즈로, 분양을 판단하는 기준을 정리합니다.
          </p>
        </div>

        {/* =========================
            1) 시리즈 필터 모드
           ========================= */}
        {seriesId ? (
          <section>
            <div className="mb-4 border-t border-(--oboon-border-default) pt-6">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <div className="text-[20px] font-semibold text-(--oboon-text-title)">
                    {selectedSeries ? selectedSeries.title : "시리즈"}
                  </div>
                  <div className="mt-1 text-[14px] text-(--oboon-text-muted)">
                    {selectedSeries
                      ? selectedSeries.description
                      : "선택한 시리즈의 브리핑을 모아봤어요."}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link href="/briefing">
                    <Button variant="secondary" size="sm" shape="pill">
                      전체 보기
                    </Button>
                  </Link>

                  <Link
                    href={`/briefing/series/${encodeURIComponent(seriesId)}`}
                  >
                    <Button variant="primary" size="sm" shape="pill">
                      시리즈 페이지로
                    </Button>
                  </Link>
                </div>
              </div>
            </div>

            {filteredPosts.length === 0 ? (
              <Card className="text-[14px] text-(--oboon-text-muted)">
                아직 이 시리즈에 등록된 브리핑이 없습니다.
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {filteredPosts.map((p: BriefingPost) => (
                  <BriefingPostCard key={p.id} post={p} />
                ))}
              </div>
            )}
          </section>
        ) : (
          <>
            {/* =========================
                2) 기본 모드
               ========================= */}

            {/* 섹션 1: 방금 올라온 콘텐츠 */}
            <section className="mb-14">
              <div className="mb-4 border-t border-(--oboon-border-default) pt-6">
                <div className="text-[20px] font-semibold text-(--oboon-text-title)">
                  방금 올라온 콘텐츠
                </div>
                <div className="mt-1 text-[14px] text-(--oboon-text-muted)">
                  실시간 업데이트 소식 살펴보기
                </div>
              </div>

              {/* (선택) 로딩 상태가 있다면 아래 skeleton을 조건부로 사용 */}
              {/* <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <BriefingPostCardSkeleton key={i} />
                ))}
              </div> */}

              <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {latest.slice(0, 8).map((p: BriefingPost) => (
                  <BriefingPostCard key={p.id} post={p} />
                ))}
              </div>
            </section>

            {/* 섹션 2: 오리지널 시리즈 */}
            <section>
              <div className="mb-4 border-t border-(--oboon-border-default) pt-6">
                <div className="text-[20px] font-semibold text-(--oboon-text-title)">
                  OBOON 오리지널
                </div>
                <div className="mt-1 text-[14px] text-(--oboon-text-muted)">
                  감정평가사 한줄평과 시리즈로 분양 판단 기준을 정리해요.
                </div>
              </div>

              <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {SERIES.map((s: BriefingSeries) => (
                  <BriefingSeriesCard
                    key={s.id}
                    series={s}
                    count={seriesCounts.get(s.id) ?? 0}
                  />
                ))}
              </div>
            </section>
          </>
        )}
      </PageContainer>
    </main>
  );
}
