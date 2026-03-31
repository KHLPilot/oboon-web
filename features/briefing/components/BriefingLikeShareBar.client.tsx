"use client";

import { useEffect, useState } from "react";
import { Heart, MessageCircle, Share2 } from "lucide-react";

const LS_KEY = "briefing_liked_posts";

function getLikedPosts(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(LS_KEY) ?? "[]");
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string")
      : [];
  } catch {
    return [];
  }
}

function setLikedPosts(postIds: string[]) {
  localStorage.setItem(LS_KEY, JSON.stringify([...new Set(postIds)]));
}

export default function BriefingLikeShareBar({
  postId,
  initialLikeCount,
}: {
  postId: string;
  initialLikeCount: number;
}) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [copied, setCopied] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setLiked(getLikedPosts().includes(postId));
  }, [postId]);

  async function handleLike() {
    if (pending) return;

    const previousLiked = liked;
    const previousCount = likeCount;
    const nextLiked = !previousLiked;
    const action = nextLiked ? "like" : "unlike";
    const nextCount = Math.max(0, previousCount + (nextLiked ? 1 : -1));
    const previousPosts = getLikedPosts();
    const nextPosts = nextLiked
      ? [...previousPosts, postId]
      : previousPosts.filter((id) => id !== postId);

    setPending(true);
    setLiked(nextLiked);
    setLikeCount(nextCount);
    setLikedPosts(nextPosts);

    try {
      const res = await fetch(`/api/briefing/${postId}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (!res.ok) {
        throw new Error("좋아요 요청 실패");
      }

      const { like_count } = (await res.json()) as { like_count?: number };
      setLikeCount(typeof like_count === "number" ? like_count : nextCount);
    } catch {
      setLiked(previousLiked);
      setLikeCount(previousCount);
      setLikedPosts(previousPosts);
    } finally {
      setPending(false);
    }
  }

  function handleCommentScroll() {
    document
      .getElementById("briefing-comments")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function handleShare() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="mt-4 flex items-center gap-2">
      <button
        type="button"
        onClick={handleLike}
        disabled={pending}
        className={`inline-flex h-9 w-9 items-center justify-center rounded-full border transition-colors disabled:opacity-60 ${
          liked
            ? "border-red-300 bg-red-50 text-red-500"
            : "border-(--oboon-border-default) bg-(--oboon-bg-surface) text-(--oboon-text-muted) hover:bg-(--oboon-bg-subtle)"
        }`}
        aria-label={`좋아요${likeCount > 0 ? ` ${likeCount}` : ""}`}
        aria-pressed={liked}
        title={likeCount > 0 ? `좋아요 ${likeCount}` : "좋아요"}
      >
        <Heart className={`h-4 w-4 ${liked ? "fill-red-500" : ""}`} />
      </button>

      <button
        type="button"
        onClick={handleCommentScroll}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-(--oboon-border-default) bg-(--oboon-bg-surface) text-(--oboon-text-muted) transition-colors hover:bg-(--oboon-bg-subtle)"
        aria-label="댓글"
      >
        <MessageCircle className="h-4 w-4" />
      </button>

      <button
        type="button"
        onClick={handleShare}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-(--oboon-border-default) bg-(--oboon-bg-surface) text-(--oboon-text-muted) transition-colors hover:bg-(--oboon-bg-subtle)"
        aria-label={copied ? "링크 복사됨" : "공유"}
        title={copied ? "복사됐습니다" : "공유"}
      >
        <Share2 className="h-4 w-4" />
      </button>
    </div>
  );
}
