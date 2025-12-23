import Link from "next/link";
import {
  POSTS,
  SERIES,
  formatDate,
  typeLabel,
  type BriefingPost,
} from "../../_data";

import BriefingPostCard from "@/features/briefing/BriefingPostCard";

function cx(...v: (string | false | null | undefined)[]) {
  return v.filter(Boolean).join(" ");
}

function Cover({ imageUrl }: { imageUrl?: string }) {
  if (!imageUrl) {
    return (
      <div
        className={cx(
          "aspect-[16/9] w-full overflow-hidden rounded-[16px]",
          "bg-(--oboon-bg-subtle)",
          "border border-(--oboon-border-default)"
        )}
      />
    );
  }

  return (
    <div
      className={cx(
        "aspect-[16/9] w-full overflow-hidden rounded-[16px]",
        "bg-(--oboon-bg-subtle)",
        "border border-(--oboon-border-default)"
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

export default function SeriesPage({ params }: { params: { id: string } }) {
  const id = params.id;
  const series = SERIES.find((s) => s.id === id);

  const posts = [...POSTS]
    .filter((p) => p.seriesId === id)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  return (
    <main className="bg-(--oboon-bg-page)">
      <div className="mx-auto w-full max-w-[1200px] px-5 py-10">
        <div className="mb-8">
          <Link
            href="/briefing"
            className="mb-4 inline-flex text-[14px] font-medium text-(--oboon-primary)"
          >
            ← 브리핑으로
          </Link>

          <h1 className="mb-2 text-[28px] font-semibold tracking-[-0.02em] text-(--oboon-text-title)">
            {series?.title ?? "시리즈"}
          </h1>
          <p className="text-[15px] leading-[1.6] text-(--oboon-text-muted)">
            {series?.description ??
              "선택한 시리즈의 브리핑을 모아볼 수 있습니다."}
          </p>

          <div className="mt-5 flex items-center gap-2">
            <Link
              href={`/briefing?series=${encodeURIComponent(id)}`}
              className={cx(
                "h-9 inline-flex items-center rounded-[10px] px-4",
                "text-[14px] font-medium",
                "bg-(--oboon-bg-surface) text-(--oboon-text-body)",
                "border border-(--oboon-border-default)",
                "hover:bg-(--oboon-bg-subtle)",
                "transition-colors"
              )}
            >
              이 시리즈 모아보기
            </Link>

            <Link
              href="/offerings"
              className={cx(
                "h-9 inline-flex items-center rounded-[10px] px-4",
                "text-[14px] font-medium",
                "bg-(--oboon-primary) text-white",
                "hover:opacity-90 transition-opacity"
              )}
            >
              분양 리스트로
            </Link>
          </div>
        </div>

        <div className="border-t border-(--oboon-border-default) pt-6">
          <div className="mb-4 text-[16px] font-semibold text-(--oboon-text-title)">
            브리핑 {posts.length}개
          </div>

          {posts.length === 0 ? (
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
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {posts.map((p) => (
                <BriefingPostCard key={p.id} post={p} />
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
