"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Cover, cx } from "@/features/briefing/briefing.ui";

export type FeaturedPostRow = {
  id: string;
  slug: string;
  title: string | null;
  content_md: string | null;
  created_at: string;
  published_at: string | null;
  cover_image_url: string | null;
  category: { key: string | null; name: string | null } | null;
};

function stripMd(md: string) {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/[*_~>#-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function excerpt(md: string | null, max = 110) {
  if (!md) return "";
  const s = stripMd(md);
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

function formatDate(iso: string) {
  // YYYY.MM.DD
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}.${mm}.${dd}`;
}

function hrefForCategory(post: FeaturedPostRow) {
  const key = post.category?.key ?? null;
  if (!key) return "/briefing/oboon-original";
  return `/briefing/oboon-original/${encodeURIComponent(key)}`;
}

export default function FeaturedHero({
  posts,
  brandTitle = "OBOON\nOriginal",
  isAdmin = false,
}: {
  posts: FeaturedPostRow[];
  brandTitle?: string;
  isAdmin?: boolean;
}) {
  const list = useMemo(() => (posts ?? []).filter(Boolean), [posts]);
  const total = list.length;

  const [idx, setIdx] = useState(0);

  const current = total > 0 ? list[Math.min(idx, total - 1)] : null;

  const onPrev = useCallback(() => {
    if (total <= 1) return;
    setIdx((v) => (v - 1 + total) % total);
  }, [total]);

  const onNext = useCallback(() => {
    if (total <= 1) return;
    setIdx((v) => (v + 1) % total);
  }, [total]);

  if (!current) return null;

  const titleLines = brandTitle.split("\n");

  return (
    <Card className="relative p-5 shadow-none">
      <div className="grid grid-cols-1 md:grid-cols-[420px_1fr] gap-5">
        {/* left: big cover */}
        <div className="relative overflow-hidden rounded-xl">
          <Cover
            mode="fill"
            imageUrl={current.cover_image_url ?? undefined}
            className="h-125 w-full md:h-125"
          />

          <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/45 via-black/15 to-transparent" />

          <div className="absolute left-5 top-5">
            <div className="text-white ob-typo-display leading-[1.05]">
              {titleLines.map((t, i) => (
                <div key={i}>{t}</div>
              ))}
            </div>
          </div>

          {/* image nav (bottom-right) */}
          {total > 1 ? (
            <div className="absolute bottom-4 right-4 z-10">
              <div
                className="
                  flex flex-nowrap items-center gap-1
                  rounded-full
                  bg-white/15 backdrop-blur-md
                  border border-white/25
                  px-1 py-0.5
                  shadow-sm
                "
              >
                {/* prev */}
                <button
                  type="button"
                  onClick={onPrev}
                  aria-label="이전 카드"
                  className="
                    flex h-9 w-9 items-center justify-center
                    rounded-full
                    text-white
                    transition
                    hover:bg-white/20
                  "
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </button>

                {/* next */}
                <button
                  type="button"
                  onClick={onNext}
                  aria-label="다음 카드"
                  className="
                    flex h-9 w-9 items-center justify-center
                    rounded-full
                    text-white
                    transition
                    hover:bg-white/20
                    "
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                </button>
              </div>
            </div>
          ) : null}
        </div>

        {/* right: content (text centered vertically, thumbnail fixed) */}
        <div className="flex min-w-0 items-center">
          <div className="flex w-full items-center gap-5">
            {/* text block (vertical center) */}
            <div className="flex min-w-0 flex-1 flex-col justify-center">
              <div className="mb-3">
                <Badge variant="status">
                  {current.category?.name ?? "오분 오리지널"}
                </Badge>
              </div>

              <div className="ob-typo-h2 text-(--oboon-text-title) line-clamp-2">
                {current.title}
              </div>

              <div className="mt-2 ob-typo-body text-(--oboon-text-muted) line-clamp-2">
                {excerpt(current.content_md, 110)}
              </div>

              {/* meta row: date left, index right */}
              <div className="mt-4 flex items-center justify-between ob-typo-caption text-(--oboon-text-muted) pl-1">
                <span>
                  {formatDate(
                    (current.published_at ?? current.created_at) as string
                  )}
                </span>
                {total > 1 ? (
                  <span className="shrink-0">
                    {idx + 1} / {total}
                  </span>
                ) : null}
              </div>
            </div>

            {/* thumbnail 140x210 */}
            <div className="shrink-0">
              <div className="h-52.5 w-35 overflow-hidden rounded-xl border border-(--oboon-border-default)">
                <Cover
                  mode="fill"
                  imageUrl={current.cover_image_url ?? undefined}
                  className="h-full w-full"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA: bottom-right (보러가기 + admin 글쓰기) */}
      <div className={cx("absolute bottom-5 right-5 flex items-center gap-5")}>
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

        <Link href={hrefForCategory(current)}>
          <Button size="sm" shape="pill" className="w-35 h-10 mb-2.5">
            보러가기
          </Button>
        </Link>
      </div>
    </Card>
  );
}
