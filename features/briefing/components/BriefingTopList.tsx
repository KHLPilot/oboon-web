import Link from "next/link";

type BriefingTopListPost = {
  id: string;
  slug: string;
  title: string;
  published_at: string | null;
  created_at: string;
  boardKey?: string | null;
  category: { key: string | null; name: string | null } | null;
};

function formatDate(iso: string) {
  const date = new Date(iso);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}.${month}.${day}`;
}

export default function BriefingTopList({
  posts,
}: {
  posts: BriefingTopListPost[];
}) {
  return (
    <section>
      <div className="ob-typo-h3 text-(--oboon-text-title)">지금 많이 보는 브리핑</div>
      <div className="mt-1 ob-typo-caption text-(--oboon-text-muted)">
        분양 시장의 최신 이슈
      </div>

      <ol className="mt-6">
        {posts.map((post, index) => {
          const href =
            post.boardKey === "general"
              ? `/briefing/general/${encodeURIComponent(post.slug)}`
              : post.category?.key
                ? `/briefing/oboon-original/${encodeURIComponent(post.category.key)}/${encodeURIComponent(post.slug)}`
                : "/briefing/oboon-original";

          return (
            <li key={post.id} className="border-b border-(--oboon-border-default)">
              <Link
                href={href}
                className="group flex items-start gap-4 rounded-xl px-3 py-4 transition-colors hover:bg-(--oboon-bg-surface)"
              >
                <span className="ob-typo-h3 min-w-7 font-bold text-(--oboon-primary)">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="ob-typo-body font-semibold text-(--oboon-text-title) transition-colors group-hover:text-(--oboon-primary)">
                    {post.title}
                  </div>
                  <div className="mt-2 ob-typo-caption text-(--oboon-text-muted)">
                    {formatDate(post.published_at ?? post.created_at)}
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
