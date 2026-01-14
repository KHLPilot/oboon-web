// features/briefing/BriefingCardGrid.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import Card from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { Cover, cx } from "@/features/briefing/briefing.ui";

export type BriefingCardGridItem = {
  id: string;
  href: string; // ✅ Server에서 만들어 내려보냄
  slug: string;
  title: string;
  content_md: string | null;
  created_at: string;
  published_at?: string | null;
  cover_image_url: string | null;
  badgeLabel?: string | null;
};

function formatDate(iso: string) {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}.${m}.${day}`;
}

function stripMd(md: string) {
  return md
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]*`/g, "")
    .replace(/!\[[^\]]*]\([^)]*\)/g, "")
    .replace(/\[[^\]]*]\([^)]*\)/g, "")
    .replace(/[#>*_~\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function excerpt(md: string | null, max = 70) {
  if (!md) return "";
  const s = stripMd(md);
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

export default function BriefingCardGrid({
  posts,
  className,
  initialCount = 4,
  step = 4,
  loadMoreLabel = "더보기",
}: {
  posts: BriefingCardGridItem[];
  className?: string;
  initialCount?: number;
  step?: number;
  loadMoreLabel?: string;
}) {
  const [visible, setVisible] = useState(initialCount);
  const pendingScrollIndexRef = useRef<number | null>(null);
  const prevVisibleRef = useRef<number>(initialCount);

  const visiblePosts = useMemo(() => {
    return posts.slice(0, Math.max(0, visible));
  }, [posts, visible]);

  const hasMore = visible < posts.length;

  useEffect(() => {
    const prev = prevVisibleRef.current;
    if (visible > prev && pendingScrollIndexRef.current != null) {
      const idx = pendingScrollIndexRef.current;
      pendingScrollIndexRef.current = null;
      requestAnimationFrame(() => {
        const el = document.querySelector(
          `[data-briefing-card-index="${idx}"]`
        ) as HTMLElement | null;
        if (!el) return;
        const top = el.getBoundingClientRect().top + window.scrollY - 16;
        window.scrollTo({ top, behavior: "smooth" });
      });
    }
    prevVisibleRef.current = visible;
  }, [visible]);

  const handleLoadMore = () => {
    if (!hasMore) return;
    pendingScrollIndexRef.current = visible;
    setVisible((v) => Math.min(posts.length, v + step));
  };

  return (
    <div className={cx("space-y-8", className)}>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {visiblePosts.map((p, idx) => {
          const createdAt = (p.published_at ?? p.created_at) as string;
          const badge = p.badgeLabel ?? "브리핑";
          const href = p.href;

          return (
            <Link
              key={p.id}
              href={href}
              className="group block"
              data-briefing-card-index={idx}
            >
              <Card
                className={cx(
                  "p-5 overflow-hidden shadow-none",
                  "hover:bg-(--oboon-bg-subtle) transition-colors"
                )}
              >
                <div className="flex min-h-50">
                  <div className="flex-1 flex flex-col pr-4 min-w-0">
                    <div className="mb-3">
                      <Badge variant="status">{badge}</Badge>
                    </div>

                    <div className="ob-typo-h3 text-(--oboon-text-title) line-clamp-2">
                      {p.title}
                    </div>

                    <div className="mt-2 ob-typo-body text-(--oboon-text-muted) line-clamp-2">
                      {excerpt(p.content_md, 90)}
                    </div>

                    <div className="mt-auto ob-typo-caption text-(--oboon-text-muted)">
                      {formatDate(createdAt)}
                    </div>
                  </div>

                  <div className="w-37.5 shrink-0">
                    <div className="h-full w-full overflow-hidden rounded-2xl border border-(--oboon-border-default)">
                      <Cover
                        mode="fill"
                        imageUrl={p.cover_image_url ?? undefined}
                        className="h-full w-full"
                        imgClassName="group-hover:scale-[1.03]"
                      />
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>

      {hasMore ? (
        <div className="flex justify-center">
          <Button
            variant="secondary"
            size="sm"
            shape="pill"
            onClick={handleLoadMore}
            disabled={!hasMore}
          >
            {loadMoreLabel}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
