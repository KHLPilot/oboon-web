// features/briefing/BriefingCardGrid.tsx
import Link from "next/link";

import Card from "@/components/ui/Card";
import { Cover, cx } from "@/features/briefing/components/briefing.ui";

export type BriefingCardGridItem = {
  id: string;
  href: string;
  slug: string;
  title: string;
  excerpt: string | null;
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

type PaginationProps = {
  currentPage: number;
  totalCount: number;
  pageSize: number;
};

function Pagination({ currentPage, totalCount, pageSize }: PaginationProps) {
  const totalPages = Math.ceil(totalCount / pageSize);
  if (totalPages <= 1) return null;

  const delta = 2;
  const start = Math.max(1, currentPage - delta);
  const end = Math.min(totalPages, currentPage + delta);
  const pages: (number | "…")[] = [];

  if (start > 1) {
    pages.push(1);
    if (start > 2) pages.push("…");
  }
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < totalPages) {
    if (end < totalPages - 1) pages.push("…");
    pages.push(totalPages);
  }

  const btnBase = cx(
    "inline-flex items-center justify-center",
    "h-9 w-9 rounded-lg border border-(--oboon-border-default)",
    "bg-(--oboon-bg-surface) ob-typo-caption text-(--oboon-text-body)",
    "transition-colors"
  );
  const btnActive = "!bg-(--oboon-primary) !text-white !border-(--oboon-primary) font-semibold";
  const btnHover = "hover:border-(--oboon-primary) hover:text-(--oboon-primary)";
  const btnDisabled = "opacity-40 pointer-events-none";

  return (
    <div className="mt-8 flex items-center justify-center gap-1">
      {currentPage > 1 ? (
        <Link href={`?page=${currentPage - 1}`} className={cx(btnBase, btnHover)}>‹</Link>
      ) : (
        <span className={cx(btnBase, btnDisabled)}>‹</span>
      )}

      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`ellipsis-${i}`} className="px-1 ob-typo-caption text-(--oboon-text-muted)">…</span>
        ) : (
          <Link
            key={p}
            href={`?page=${p}`}
            className={cx(btnBase, btnHover, p === currentPage ? btnActive : "")}
          >
            {p}
          </Link>
        )
      )}

      {currentPage < totalPages ? (
        <Link href={`?page=${currentPage + 1}`} className={cx(btnBase, btnHover)}>›</Link>
      ) : (
        <span className={cx(btnBase, btnDisabled)}>›</span>
      )}
    </div>
  );
}

export default function BriefingCardGrid({
  posts,
  className,
  pagination,
  columns = 3,
}: {
  posts: BriefingCardGridItem[];
  className?: string;
  pagination?: PaginationProps;
  columns?: 3 | 4;
}) {
  const gridClassName =
    columns === 4
      ? "grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-4"
      : "grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3";

  return (
    <div className={cx("space-y-8", className)}>
      <div className={gridClassName}>
        {posts.map((p) => {
          const createdAt = (p.published_at ?? p.created_at) as string;

          return (
            <Link key={p.id} href={p.href} className="group block">
              <Card className="p-0 overflow-hidden shadow-none bg-transparent border-none">
                {/* 상단 이미지 — aspect-video (16:9) */}
                <div className="aspect-video w-full overflow-hidden rounded-2xl border border-(--oboon-border-default)">
                  <Cover
                    mode="fill"
                    imageUrl={p.cover_image_url ?? undefined}
                    className="h-full w-full"
                    imgClassName="transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                </div>

                {/* 하단 텍스트 */}
                <div className="pt-3 px-0.5">
                  {/* 카테고리 + 날짜 */}
                  <div className="flex items-center gap-2 ob-typo-caption text-(--oboon-text-muted) mb-2">
                    {p.badgeLabel && (
                      <>
                        <span className="font-semibold text-(--oboon-text-subtle) uppercase tracking-wide">
                          {p.badgeLabel}
                        </span>
                        <span>·</span>
                      </>
                    )}
                    <span>{formatDate(createdAt)}</span>
                  </div>

                  {/* 제목 */}
                  <div className="ob-typo-h3 text-(--oboon-text-title) line-clamp-2 group-hover:text-(--oboon-primary) transition-colors">
                    {p.title}
                  </div>

                  {/* excerpt */}
                  {p.excerpt && (
                    <div className="mt-1.5 ob-typo-body text-(--oboon-text-muted) line-clamp-2">
                      {p.excerpt}
                    </div>
                  )}
                </div>
              </Card>
            </Link>
          );
        })}
      </div>

      {pagination && <Pagination {...pagination} />}
    </div>
  );
}
