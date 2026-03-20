"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageCircle, PenLine } from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { mapCommunityPost } from "../mappers/community.mapper";
import { getCommunityPostsByPropertyId } from "../services/community.posts";

type Post = ReturnType<typeof mapCommunityPost>;

export default function PropertyCommunityWidget({
  propertyId,
  propertyName,
}: {
  propertyId: number;
  propertyName?: string | null;
}) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    getCommunityPostsByPropertyId(propertyId, 3)
      .then(({ posts: rows, total: count }) => {
        if (!isMounted) return;
        setPosts(rows.map(mapCommunityPost));
        setTotal(count);
      })
      .finally(() => {
        if (!isMounted) return;
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [propertyId]);

  if (loading) return null;

  const writeUrl = "/community?write=1";

  // 글이 없을 때: 첫 기록 유도 CTA
  if (posts.length === 0) {
    return (
      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-1.5 ob-typo-h4 text-(--oboon-text-title)">
          <MessageCircle className="h-4 w-4 text-(--oboon-primary)" />
          이 현장 커뮤니티
        </div>

        <div className="rounded-xl bg-(--oboon-bg-subtle) border border-(--oboon-border-default) p-4 space-y-3 text-center">
          <div className="flex justify-center">
            <div className="h-10 w-10 rounded-full bg-(--oboon-primary)/10 flex items-center justify-center">
              <PenLine className="h-5 w-5 text-(--oboon-primary)" />
            </div>
          </div>
          <div>
            <p className="ob-typo-body2 font-semibold text-(--oboon-text-title)">
              아직 기록이 없어요
            </p>
            <p className="mt-0.5 ob-typo-caption text-(--oboon-text-muted)">
              {propertyName
                ? `"${propertyName}" 현장의 첫 번째 목소리를 남겨보세요.`
                : "이 현장의 첫 번째 목소리를 남겨보세요."}
            </p>
          </div>
          <Link href={writeUrl}>
            <Button variant="primary" size="sm" shape="pill" className="w-full justify-center">
              첫 기록 남기기
            </Button>
          </Link>
        </div>
      </Card>
    );
  }

  // 글이 있을 때: 미리보기 + 글 수 + 더보기
  const moreLabel = total > 3 ? `${total}개 글 보기 →` : "더보기 →";

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 ob-typo-h4 text-(--oboon-text-title)">
          <MessageCircle className="h-4 w-4 text-(--oboon-primary)" />
          이 현장 커뮤니티
        </div>
        <Link
          href="/community"
          className="ob-typo-caption text-(--oboon-primary) hover:underline shrink-0"
        >
          {moreLabel}
        </Link>
      </div>

      <div className="space-y-2">
        {posts.map((post) => (
          <div
            key={post.id}
            className="rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle) px-3 py-2.5 space-y-0.5"
          >
            <p className="ob-typo-body2 text-(--oboon-text-title) line-clamp-1 font-medium">
              {post.displayTitle}
            </p>
            <div className="ob-typo-caption text-(--oboon-text-muted) flex items-center gap-1.5">
              <span>{post.authorName}</span>
              <span>·</span>
              <span>{post.timeLabel}</span>
              {post.comments > 0 ? (
                <>
                  <span>·</span>
                  <span>댓글 {post.comments}</span>
                </>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      <Link href={writeUrl}>
        <Button
          variant="secondary"
          size="sm"
          shape="pill"
          className="w-full justify-center mt-1"
        >
          이 현장 기록 남기기
        </Button>
      </Link>
    </Card>
  );
}
