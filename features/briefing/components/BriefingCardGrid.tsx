// features/briefing/BriefingCardGrid.tsx
import Link from "next/link";

import Card from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Cover, cx } from "@/features/briefing/components/briefing.ui";

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

type PaginationProps = {
  currentPage: number;
  totalCount: number;
  pageSize: number;
};

function Pagination({ currentPage, totalCount, pageSize }: PaginationProps) {
  const totalPages = Math.ceil(totalCount / pageSize);
  if (totalPages <= 1) return null;

  // 최대 5개 페이지 번호 노출
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
      {/* prev */}
      {currentPage > 1 ? (
        <Link href={`?page=${currentPage - 1}`} className={cx(btnBase, btnHover)}>
          ‹
        </Link>
      ) : (
        <span className={cx(btnBase, btnDisabled)}>‹</span>
      )}

      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`ellipsis-${i}`} className="px-1 ob-typo-caption text-(--oboon-text-muted)">
            …
          </span>
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

      {/* next */}
      {currentPage < totalPages ? (
        <Link href={`?page=${currentPage + 1}`} className={cx(btnBase, btnHover)}>
          ›
        </Link>
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
}: {
  posts: BriefingCardGridItem[];
  className?: string;
  pagination?: PaginationProps;
}) {
  return (
    <div className={cx("space-y-8", className)}>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {posts.map((p) => {
          const createdAt = (p.published_at ?? p.created_at) as string;
          const badge = p.badgeLabel ?? "브리핑";

          return (
            <Link key={p.id} href={p.href} className="group block">
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

      {pagination && <Pagination {...pagination} />}
    </div>
  );
}
