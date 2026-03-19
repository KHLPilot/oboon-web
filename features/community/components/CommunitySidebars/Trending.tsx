"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import Card from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

import { mapCommunityPost } from "../../mappers/community.mapper";
import { getCommunityTrendingPosts } from "../../services/community.posts";

function TrendingItemSkeleton() {
  return (
    <div className="flex gap-3 py-2">
      <Skeleton className="h-4 w-4 flex-shrink-0 mt-0.5" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-full" />
        <div className="flex gap-2">
          <Skeleton className="h-3 w-14 rounded-full" />
          <Skeleton className="h-3 w-10" />
        </div>
      </div>
    </div>
  );
}

export default function Trending() {
  const [items, setItems] = useState<ReturnType<typeof mapCommunityPost>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    getCommunityTrendingPosts()
      .then((rows) => {
        if (!isMounted) return;
        setItems(rows.map(mapCommunityPost));
      })
      .catch((error) => {
        console.error("community trending error:", error?.message || error);
      })
      .finally(() => {
        if (!isMounted) return;
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <Card className="p-4">
      <div className="ob-typo-h3 font-semibold text-(--oboon-text-title) mb-3">
        인기 기록
      </div>

      <div className="space-y-0.5">
        {loading && (
          <>
            <TrendingItemSkeleton />
            <TrendingItemSkeleton />
            <TrendingItemSkeleton />
          </>
        )}

        {!loading && items.length === 0 && (
          <p className="ob-typo-caption text-(--oboon-text-muted) py-2">
            아직 인기 기록이 없습니다.
          </p>
        )}

        {!loading &&
          items.map((item, index) => (
            <Link
              key={item.id}
              href="/community"
              className="flex gap-3 rounded-xl px-1 py-2 hover:bg-(--oboon-bg-subtle) transition-colors group"
            >
              {/* 랭킹 번호 */}
              <span
                className={[
                  "ob-typo-h3 font-bold flex-shrink-0 w-4 mt-0.5",
                  index < 3
                    ? "text-(--oboon-primary)"
                    : "text-(--oboon-text-muted)",
                ].join(" ")}
              >
                {index + 1}
              </span>

              {/* 제목 + 메타 */}
              <div className="flex-1 min-w-0 space-y-1">
                <p className="ob-typo-body2 text-(--oboon-text-title) line-clamp-1 group-hover:text-(--oboon-primary) transition-colors">
                  {item.title}
                </p>
                <div className="flex items-center gap-2">
                  {item.propertyName?.trim() ? (
                    <span className="ob-typo-caption px-1.5 py-0.5 rounded bg-(--oboon-bg-subtle) text-(--oboon-text-muted) truncate max-w-[80px]">
                      {item.propertyName}
                    </span>
                  ) : null}
                  <span className="ob-typo-caption text-(--oboon-text-muted) shrink-0">
                    댓글 {item.comments}
                  </span>
                </div>
              </div>
            </Link>
          ))}
      </div>
    </Card>
  );
}
