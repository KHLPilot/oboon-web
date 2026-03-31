import Link from "next/link";

import { Cover } from "@/features/briefing/components/briefing.ui";
import type { FeaturedPostRow } from "@/features/briefing/components/oboon-original/FeaturedHero";

export type BriefingEditorPickPost = Omit<FeaturedPostRow, "title"> & {
  title: string;
};

function hrefForPost(post: BriefingEditorPickPost) {
  return post.boardKey === "general"
    ? `/briefing/general/${encodeURIComponent(post.slug)}`
    : `/briefing/oboon-original/${encodeURIComponent(post.category?.key ?? "")}/${encodeURIComponent(post.slug)}`;
}

export default function BriefingEditorPickCard({
  posts,
}: {
  posts: BriefingEditorPickPost[];
}) {
  return (
    <section className="flex h-full flex-col">
      <div className="ob-typo-h3 text-(--oboon-text-title)">에디터 픽</div>
      <div className="mt-1 ob-typo-caption text-(--oboon-text-muted)">
        오분이 고른 시리즈 글
      </div>

      <div className="mt-6 grid flex-1 grid-rows-3">
        {posts.map((post) => (
          <Link
            key={post.id}
            href={hrefForPost(post)}
            className="group flex h-full items-center gap-4 rounded-xl border-b border-(--oboon-border-default) px-3 py-4 transition-colors hover:bg-(--oboon-bg-surface)"
          >
            <div className="min-w-0 flex-1">
              <div className="ob-typo-body line-clamp-2 font-semibold text-(--oboon-text-title) transition-colors group-hover:text-(--oboon-primary)">
                {post.title}
              </div>
              {post.excerpt && (
                <div className="mt-2 ob-typo-caption line-clamp-2 text-(--oboon-text-muted)">
                  {post.excerpt}
                </div>
              )}
            </div>

            <div className="aspect-video w-32 shrink-0 overflow-hidden rounded-xl border border-(--oboon-border-default)">
              <Cover
                mode="fill"
                imageUrl={post.cover_image_url ?? undefined}
                className="h-full w-full"
                imgClassName="group-hover:scale-[1.03]"
                sizes="128px"
              />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
