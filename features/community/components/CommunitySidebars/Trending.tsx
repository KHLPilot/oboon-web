"use client";

import { useEffect, useState } from "react";

import Card from "@/components/ui/Card";

import { mapCommunityPost } from "../../mappers/community.mapper";
import { getCommunityTrendingPosts } from "../../services/community.posts";

export default function Trending() {
  const [items, setItems] = useState<ReturnType<typeof mapCommunityPost>[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

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
      <div className="ob-typo-h3 font-semibold text-(--oboon-text-title)">
        최근 댓글 많은 현장
      </div>
      <div className="mt-3 space-y-3">
        {loading && (
          <div className="ob-typo-caption text-(--oboon-text-muted)">
            불러오는 중...
          </div>
        )}
        {!loading && items.length === 0 && (
          <div className="ob-typo-caption text-(--oboon-text-muted)">
            아직 인기 글이 없습니다.
          </div>
        )}
        {items.map((item) => (
          <div key={item.id} className="space-y-1">
            <p className="ob-typo-body text-(--oboon-text-title) line-clamp-1">
              {item.title}
            </p>
            <div className="ob-typo-caption text-(--oboon-text-muted)">
              좋아요 {item.likes} · 댓글 {item.comments} · {item.timeLabel}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
