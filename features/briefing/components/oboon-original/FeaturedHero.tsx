"use client";

import Link from "next/link";
import { type MouseEvent, useCallback, useMemo, useState } from "react";

import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Cover, cx } from "@/features/briefing/components/briefing.ui";

export type FeaturedPostRow = {
  id: string;
  slug: string;
  title: string | null;
  excerpt: string | null;
  created_at: string;
  published_at: string | null;
  cover_image_url: string | null;
  boardKey?: string | null;
  category: { key: string | null; name: string | null } | null;
};

function formatDate(iso: string) {
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}.${mm}.${dd}`;
}

function hrefForPost(post: FeaturedPostRow) {
  if (post.boardKey === "general") {
    return `/briefing/general/${encodeURIComponent(post.slug)}`;
  }
  const key = post.category?.key ?? null;
  if (!key) return "/briefing/oboon-original";
  return `/briefing/oboon-original/${encodeURIComponent(key)}/${encodeURIComponent(post.slug)}`;
}

export default function FeaturedHero({
  posts,
}: {
  posts: FeaturedPostRow[];
}) {
  const list = useMemo(() => (posts ?? []).filter(Boolean), [posts]);
  const total = list.length;

  const [idx, setIdx] = useState(0);
  const current = total > 0 ? list[Math.min(idx, total - 1)] : null;

  const onPrev = useCallback((event?: MouseEvent<HTMLButtonElement>) => {
    event?.preventDefault();
    event?.stopPropagation();
    if (total <= 1) return;
    setIdx((v) => (v - 1 + total) % total);
  }, [total]);

  const onNext = useCallback((event?: MouseEvent<HTMLButtonElement>) => {
    event?.preventDefault();
    event?.stopPropagation();
    if (total <= 1) return;
    setIdx((v) => (v + 1) % total);
  }, [total]);

  if (!current) return null;

  const href = hrefForPost(current);
  const dateStr = formatDate((current.published_at ?? current.created_at) as string);

  return (
    <div
      key={current.id}
      className="relative h-[360px] overflow-hidden rounded-2xl sm:h-[420px] lg:h-[500px]"
    >
      {/* 배경 이미지 */}
      <Cover
        mode="fill"
        imageUrl={current.cover_image_url ?? undefined}
        className="h-full w-full"
        sizes="100vw"
      />

      {/* 그라디언트 오버레이 */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10" />

      {/* 좌하단 콘텐츠 */}
      <div className="absolute bottom-0 left-0 right-0 px-6 pb-7 sm:px-9 sm:pb-9 lg:pr-[20%]">
        {/* 카테고리 배지 */}
        <div className="mb-3">
          <Badge
            variant="status"
            className="bg-(--oboon-primary)/90 text-white border-transparent backdrop-blur-sm"
          >
            {current.category?.name ?? "오분 오리지널"}
          </Badge>
        </div>

        {/* 제목 */}
        <h2 className="ob-typo-h1 text-white leading-tight line-clamp-3">
          {current.title}
        </h2>

        {/* excerpt */}
        {current.excerpt && (
          <p className="mt-2 ob-typo-body text-white/70 line-clamp-2">
            {current.excerpt}
          </p>
        )}

        {/* 하단 액션 행 */}
        <div className="mt-5 flex items-center gap-4">
          <Link href={href}>
            <Button size="sm" shape="pill" className="h-9">
              자세히 읽기
            </Button>
          </Link>
          <span className="ob-typo-caption text-white/50">{dateStr}</span>
          {total > 1 && (
            <span className="ob-typo-caption text-white/40">
              {idx + 1} / {total}
            </span>
          )}
        </div>
      </div>

      {/* 우하단: 네비게이션 (포스트 2개 이상일 때) */}
      {total > 1 && (
        <div className="pointer-events-auto absolute bottom-7 right-6 z-20 sm:bottom-9 sm:right-9">
          <div className={cx(
            "flex items-center gap-1",
            "rounded-full bg-white/15 backdrop-blur-md border border-white/25",
            "px-1 py-0.5 shadow-sm"
          )}>
            <button
              type="button"
              onClick={onPrev}
              aria-label="이전"
              className="flex h-9 w-9 touch-manipulation items-center justify-center rounded-full text-white transition hover:bg-white/20"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={onNext}
              aria-label="다음"
              className="flex h-9 w-9 touch-manipulation items-center justify-center rounded-full text-white transition hover:bg-white/20"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 6l6 6-6 6" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
