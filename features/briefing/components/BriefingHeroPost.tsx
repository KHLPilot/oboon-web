// features/briefing/components/BriefingHeroPost.tsx
import Link from "next/link";
import Image from "next/image";

import { cx } from "@/features/briefing/components/briefing.ui";

type HeroPost = {
  id: string;
  slug: string;
  title: string | null;
  content_md: string | null;
  created_at: string;
  published_at: string | null;
  cover_image_url: string | null;
  board: { key: string } | { key: string }[] | null;
  category: { key: string; name: string } | { key: string; name: string }[] | null;
};

function pickFirst<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

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

function excerpt(md: string | null, max = 120) {
  if (!md) return null;
  const s = stripMd(md);
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}.${mm}.${dd}`;
}

function getHref(post: HeroPost) {
  const board = pickFirst(post.board);
  const category = pickFirst(post.category);
  if (board?.key === "oboon_original" && category?.key) {
    return `/briefing/oboon-original/${encodeURIComponent(category.key)}/${encodeURIComponent(post.slug)}`;
  }
  if (board?.key === "general") {
    return `/briefing/general/${encodeURIComponent(post.slug)}`;
  }
  return "/briefing";
}

export default function BriefingHeroPost({
  post,
  isAdmin = false,
}: {
  post: HeroPost;
  isAdmin?: boolean;
}) {
  const category = pickFirst(post.category);
  const href = getHref(post);
  const dateStr = formatDate(post.published_at ?? post.created_at);
  const ex = excerpt(post.content_md);

  return (
    <Link href={href} className="group block mb-10">
      <div className="relative w-full h-[440px] sm:h-[480px] rounded-[20px] overflow-hidden bg-(--oboon-bg-subtle)">
        {/* 커버 이미지 */}
        {post.cover_image_url ? (
          <Image
            src={post.cover_image_url}
            alt={post.title ?? ""}
            fill
            priority
            sizes="(max-width: 768px) 100vw, 1100px"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a2e] via-[#2d2d5c] to-[#4a3f7a]" />
        )}

        {/* 그라디언트 오버레이 */}
        <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/80 via-black/30 to-transparent" />

        {/* 어드민 글쓰기 버튼 */}
        {isAdmin && (
          <Link
            href="/briefing/admin/posts/new"
            onClick={(e) => e.stopPropagation()}
            className={cx(
              "absolute top-5 right-5 z-10",
              "inline-flex items-center px-4 py-2 rounded-full",
              "bg-white/20 backdrop-blur-sm border border-white/30",
              "text-white text-xs font-semibold",
              "hover:bg-white/30 transition"
            )}
          >
            글쓰기
          </Link>
        )}

        {/* 콘텐츠 */}
        <div className="absolute bottom-0 left-0 right-0 p-7 sm:p-9">
          {/* 배지 */}
          {category && (
            <div
              className={cx(
                "inline-flex items-center gap-1.5 mb-3",
                "bg-(--oboon-primary)/90 text-white",
                "text-[11px] font-semibold px-3 py-1 rounded-full",
                "backdrop-blur-sm"
              )}
            >
              <span>★</span>
              <span>OBOON Original · {category.name}</span>
            </div>
          )}

          {/* 제목 */}
          <h2
            className={cx(
              "text-white font-extrabold leading-[1.25] tracking-tight",
              "text-[22px] sm:text-[28px]",
              "line-clamp-2 mb-2.5"
            )}
          >
            {post.title}
          </h2>

          {/* 발췌 */}
          {ex && (
            <p className="text-white/70 text-sm leading-relaxed line-clamp-2 mb-5 max-w-2xl">
              {ex}
            </p>
          )}

          {/* 날짜 + CTA */}
          <div className="flex items-center justify-between">
            <span className="text-white/50 text-xs">{dateStr}</span>
            <span
              className={cx(
                "inline-flex items-center gap-1.5",
                "bg-white text-(--oboon-text-title)",
                "text-[13px] font-semibold px-5 py-2.5 rounded-full",
                "transition group-hover:bg-white/90"
              )}
            >
              읽어보기
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
