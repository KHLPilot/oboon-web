"use client";

import type { ReactNode } from "react";
import { Bookmark, Clock, Heart, MessageCircle } from "lucide-react";
import Image from "next/image";

import { Badge } from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import { getAvatarUrlOrDefault } from "@/shared/imageUrl";

import type { CommunityPostViewModel } from "../../domain/community";

export default function CommunityPostCard({
  post,
  onToggleLike,
  onToggleBookmark,
  onToggleComments,
  likeLoading = false,
  bookmarkLoading = false,
  commentsExpanded = false,
  commentsPanel,
}: {
  post: CommunityPostViewModel;
  onToggleLike?: () => void;
  onToggleBookmark?: () => void;
  onToggleComments?: () => void;
  likeLoading?: boolean;
  bookmarkLoading?: boolean;
  commentsExpanded?: boolean;
  commentsPanel?: ReactNode;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="status">{post.propertyName}</Badge>
            <Badge variant="status">{post.statusLabel}</Badge>
          </div>
          <div className="mt-3 ob-typo-h3 text-(--oboon-text-title) truncate">
            {post.title}
          </div>
        </div>
      </div>

      <p className="mt-2 ob-typo-body text-(--oboon-text-muted) line-clamp-2">
        {post.body}
      </p>

      <div className="mt-4 h-px bg-(--oboon-border-default)" />

      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full border border-(--oboon-border-default) bg-(--oboon-bg-subtle) overflow-hidden flex items-center justify-center">
            <Image
              src={getAvatarUrlOrDefault(post.authorAvatarUrl)}
              alt={post.authorName}
              width={28}
              height={28}
              className="h-full w-full object-cover"
            />
          </div>
          <span className="ob-typo-subtitle text-(--oboon-text-body)">
            {post.authorName}
          </span>
        </div>

        <div className="flex items-center gap-3 text-(--oboon-text-muted)">
          {onToggleLike ? (
            <button
              type="button"
              disabled={likeLoading}
              onClick={onToggleLike}
              className="inline-flex items-center gap-1 ob-typo-caption disabled:opacity-50"
              aria-label="좋아요"
            >
              <Heart
                className={[
                  "h-4 w-4",
                  post.isLiked ? "fill-(--oboon-primary) text-(--oboon-primary)" : "",
                ].join(" ")}
              />
              {post.likes}
            </button>
          ) : (
            <span className="inline-flex items-center gap-1 ob-typo-caption">
              <Heart
                className={[
                  "h-4 w-4",
                  post.isLiked ? "fill-(--oboon-primary) text-(--oboon-primary)" : "",
                ].join(" ")}
              />
              {post.likes}
            </span>
          )}
          {onToggleBookmark ? (
            <button
              type="button"
              disabled={bookmarkLoading}
              onClick={onToggleBookmark}
              className="inline-flex items-center gap-1 ob-typo-caption disabled:opacity-50"
              aria-label="북마크"
            >
              <Bookmark
                className={[
                  "h-4 w-4",
                  post.isBookmarked
                    ? "fill-(--oboon-primary) text-(--oboon-primary)"
                    : "",
                ].join(" ")}
              />
            </button>
          ) : (
            <span className="inline-flex items-center gap-1 ob-typo-caption">
              <Bookmark
                className={[
                  "h-4 w-4",
                  post.isBookmarked
                    ? "fill-(--oboon-primary) text-(--oboon-primary)"
                    : "",
                ].join(" ")}
              />
            </span>
          )}
          {onToggleComments ? (
            <button
              type="button"
              onClick={onToggleComments}
              className="inline-flex items-center gap-1 ob-typo-caption"
              aria-expanded={commentsExpanded}
              aria-label="댓글 펼치기"
            >
              <MessageCircle className="h-4 w-4" />
              {post.comments}
            </button>
          ) : (
            <span className="inline-flex items-center gap-1 ob-typo-caption">
              <MessageCircle className="h-4 w-4" />
              {post.comments}
            </span>
          )}
          <span className="inline-flex items-center gap-1 ob-typo-caption">
            <Clock className="h-4 w-4" />
            {post.timeLabel}
          </span>
        </div>
      </div>

      {commentsExpanded && commentsPanel ? (
        <div className="mt-3 border-t border-(--oboon-border-default) pt-3">
          {commentsPanel}
        </div>
      ) : null}
    </Card>
  );
}
