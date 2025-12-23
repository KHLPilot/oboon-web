"use client";

import BriefingPostCard from "@/features/briefing/BriefingPostCard";
import BriefingSeriesCard from "@/features/briefing/BriefingSeriesCard";

import Link from "next/link";
import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import {
  POSTS,
  SERIES,
  formatDate,
  typeLabel,
  type BriefingPost,
  type BriefingSeries,
} from "./_data";

import BriefingPostCardSkeleton from "@/features/briefing/BriefingPostCardSkeleton";

<div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
  {Array.from({ length: 8 }).map((_, i) => (
    <BriefingPostCardSkeleton key={i} />
  ))}
</div>;

function cx(...v: (string | false | null | undefined)[]) {
  return v.filter(Boolean).join(" ");
}

function Cover({
  imageUrl,
  className,
}: {
  imageUrl?: string;
  className?: string;
}) {
  if (!imageUrl) {
    return (
      <div
        className={[
          "aspect-[16/9] w-full",
          "bg-(--oboon-bg-subtle)",
          className ?? "",
        ].join(" ")}
      />
    );
  }

  return (
    <div
      className={["aspect-[16/9] w-full overflow-hidden", className ?? ""].join(
        " "
      )}
    >
      <img
        src={imageUrl}
        alt=""
        className="h-full w-full object-cover"
        loading="lazy"
      />
    </div>
  );
}

function PostCard({ post }: { post: BriefingPost }) {
  return (
    <Link href={`/briefing/${post.id}`} className="group block">
      <Cover imageUrl={post.coverImageUrl} />
      <div className="mt-3">
        <div className="mb-1 text-[12px] font-medium text-(--oboon-text-muted)">
          {typeLabel(post.type)}
        </div>
        <div
          className={cx(
            "text-[16px] font-semibold leading-[1.45] text-(--oboon-text-title)",
            "line-clamp-2",
            "group-hover:underline"
          )}
        >
          {post.title}
        </div>
        <div className="mt-2 text-[13px] text-(--oboon-text-muted)">
          {formatDate(post.createdAt)}
        </div>
      </div>
    </Link>
  );
}

function SeriesCard({ s, count }: { s: BriefingSeries; count: number }) {
  return (
    <div
      className={cx(
        "overflow-hidden rounded-[16px]",
        "bg-(--oboon-bg-surface)",
        "border border-(--oboon-border-default)",
        "shadow-[0_10px_20px_rgba(0,0,0,0.04)]"
      )}
    >
      {/* 상단 통이미지 (full-bleed) */}
      <Cover
        imageUrl={s.coverImageUrl}
        className={cx(
          "rounded-t-[16px]",
          "border-b border-(--oboon-border-default)"
        )}
      />

      {/* 하단 콘텐츠 */}
      <div className="p-5">
        <div className="text-[18px] font-semibold text-(--oboon-text-title)">
          {s.title}
        </div>

        <p className="mt-2 text-[14px] leading-[1.6] text-(--oboon-text-muted) line-clamp-3">
          {s.description}
        </p>

        {/* (이미 정리한대로) CTA는 시리즈 페이지 하나만 */}
        <div className="mt-4 space-y-2">
          <div>
            <span
              className={cx(
                "inline-flex items-center rounded-full px-2.5 py-1",
                "text-[12px] font-medium",
                "bg-(--oboon-bg-subtle) text-(--oboon-text-muted)",
                "border border-(--oboon-border-default)"
              )}
            >
              브리핑 {count}개
            </span>
          </div>

          <Link
            href={`/briefing/series/${encodeURIComponent(s.id)}`}
            className={cx(
              "h-9 inline-flex w-full items-center justify-center rounded-[10px] px-3",
              "text-[13px] font-medium",
              "bg-(--oboon-bg-surface) text-(--oboon-text-body)",
              "border border-(--oboon-border-default)",
              "hover:bg-(--oboon-bg-subtle)",
              "transition-colors",
              "whitespace-nowrap"
            )}
          >
            시리즈 페이지 →
          </Link>
        </div>
      </div>
    </div>
  );
}

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

  // ---------- UI ----------
  return (
    <main className="bg-(--oboon-bg-page)">
      <div className="mx-auto w-full max-w-[1200px] px-5 pt-10 pb-10">
        {/* 헤더 */}
        <div className="mb-5">
          <h1 className="mb-1 text-[28px] font-semibold tracking-[-0.02em] text-(--oboon-text-title)">
            브리핑
          </h1>
          <p className="text-[14px] leading-[1.6] text-(--oboon-text-muted)">
            실시간 업데이트 소식과 시리즈로, 분양을 판단하는 기준을 정리합니다.
          </p>
        </div>

        {/* -------------------------
            1) 시리즈 필터 모드
           ------------------------- */}
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
                  <Link
                    href="/briefing"
                    className={cx(
                      "h-9 inline-flex items-center rounded-[10px] px-4",
                      "text-[14px] font-medium",
                      "bg-(--oboon-bg-surface) text-(--oboon-text-body)",
                      "border border-(--oboon-border-default)",
                      "hover:bg-(--oboon-bg-subtle)",
                      "transition-colors"
                    )}
                  >
                    전체 보기
                  </Link>

                  <Link
                    href={`/briefing/series/${encodeURIComponent(seriesId)}`}
                    className={cx(
                      "h-9 inline-flex items-center rounded-[10px] px-4",
                      "text-[14px] font-medium",
                      "bg-(--oboon-primary) text-white",
                      "hover:opacity-90 transition-opacity"
                    )}
                  >
                    시리즈 페이지로
                  </Link>
                </div>
              </div>
            </div>

            {filteredPosts.length === 0 ? (
              <div
                className={cx(
                  "rounded-[16px] p-6",
                  "bg-(--oboon-bg-surface)",
                  "border border-(--oboon-border-default)",
                  "text-[14px] text-(--oboon-text-muted)"
                )}
              >
                아직 이 시리즈에 등록된 브리핑이 없습니다.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {filteredPosts.map((p) => (
                  <BriefingPostCard key={p.id} post={p} />
                ))}
              </div>
            )}
          </section>
        ) : (
          <>
            {/* -------------------------
                2) 기본 모드 (토스 스타일)
               ------------------------- */}

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

              <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {latest.slice(0, 8).map((p) => (
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
                {SERIES.map((s) => (
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
      </div>
    </main>
  );
}
