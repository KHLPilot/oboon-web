"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import Card from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

type Post = {
  id: string;
  slug: string;
  title: string;
  status: string;
  like_count: number | null;
  comment_count: number | null;
  view_count: number | null;
  published_at: string | null;
  created_at: string;
};

type Filter = "all" | "published" | "draft";

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "published", label: "발행" },
  { key: "draft", label: "임시저장" },
];

export default function EditorPostsTab({
  initialPosts,
  initialFilter,
}: {
  initialPosts: Post[];
  initialFilter: Filter;
}) {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [filter, setFilter] = useState<Filter>(initialFilter);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    setFilter(initialFilter);
  }, [initialFilter]);

  const filtered = posts.filter((post) => {
    if (filter === "published") return post.status === "published";
    if (filter === "draft") return post.status === "draft";
    return true;
  });

  async function handleDelete(postId: string) {
    if (!window.confirm("이 글을 삭제할까요?")) return;

    setDeletingId(postId);

    try {
      const res = await fetch(`/api/briefing/editor/posts/${postId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setPosts((prev) => prev.filter((post) => post.id !== postId));
      }
    } finally {
      setDeletingId(null);
    }
  }

  function handleFilterChange(nextFilter: Filter) {
    setFilter(nextFilter);

    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "posts");
    params.set("status", nextFilter);
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => handleFilterChange(item.key)}
              className={`rounded-full px-3 py-1.5 ob-typo-caption transition-colors ${
                filter === item.key
                  ? "bg-(--oboon-text-title) text-(--oboon-bg-surface)"
                  : "border border-(--oboon-border-default) text-(--oboon-text-muted) hover:bg-(--oboon-bg-subtle)"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <Link href="/briefing/admin/posts/new">
          <Button variant="primary" size="sm" shape="pill">
            새 글 작성
          </Button>
        </Link>
      </div>

      {filtered.length === 0 ? (
        <div className="py-16 text-center ob-typo-body text-(--oboon-text-muted)">
          글이 없습니다.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((post) => (
            <Card key={post.id} className="p-4 shadow-none">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={post.status === "published" ? "success" : "default"}>
                      {post.status === "published" ? "발행" : "임시저장"}
                    </Badge>
                    <span className="ob-typo-caption text-(--oboon-text-muted)">
                      {formatDate(post.published_at ?? post.created_at)}
                    </span>
                  </div>

                  <div className="mt-1 ob-typo-body font-medium text-(--oboon-text-title) line-clamp-1">
                    {post.title}
                  </div>

                  <div className="mt-1 flex flex-wrap gap-3 ob-typo-caption text-(--oboon-text-muted)">
                    <span>좋아요 {post.like_count ?? 0}</span>
                    <span>댓글 {post.comment_count ?? 0}</span>
                    <span>조회 {post.view_count ?? 0}</span>
                  </div>
                </div>

                <div className="flex shrink-0 gap-2">
                  <Link href={`/briefing/admin/posts/${post.id}/edit`}>
                    <Button variant="secondary" size="sm" shape="pill">
                      수정
                    </Button>
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleDelete(post.id)}
                    disabled={deletingId === post.id}
                    className="rounded-full border border-(--oboon-border-default) px-3 py-1.5 ob-typo-caption text-(--oboon-text-muted) transition-colors hover:border-red-300 hover:text-red-500 disabled:opacity-40"
                  >
                    {deletingId === post.id ? "삭제 중..." : "삭제"}
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
