"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Bookmark,
  Heart,
  MapPin,
  MessageCircle,
  MoreVertical,
  Repeat2,
} from "lucide-react";
import Image from "next/image";

import Link from "next/link";

import { Badge } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { getAvatarUrlOrDefault } from "@/shared/imageUrl";

import type { CommunityPostViewModel } from "../../domain/community";

const STATUS_ICON = {
  visited: MapPin,
  thinking: MessageCircle,
  agent_only: MessageCircle,
} satisfies Record<CommunityPostViewModel["status"], typeof MapPin>;

export default function CommunityPostCard({
  post,
  canEdit = false,
  canDelete = false,
  onEdit,
  onDelete,
  onToggleLike,
  onToggleBookmark,
  onToggleComments,
  onRepost,
  likeLoading = false,
  bookmarkLoading = false,
  commentsExpanded = false,
  commentsPanel,
}: {
  post: CommunityPostViewModel;
  canEdit?: boolean;
  canDelete?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onToggleLike?: () => void;
  onToggleBookmark?: () => void;
  onToggleComments?: () => void;
  onRepost?: () => void;
  likeLoading?: boolean;
  bookmarkLoading?: boolean;
  commentsExpanded?: boolean;
  commentsPanel?: ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuOpen]);

  const StatusIcon = STATUS_ICON[post.status];

  return (
    <Card className="p-4 space-y-3">
      {/* 상단: 뱃지 + 메뉴 버튼 */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          <Badge variant="status" className="inline-flex items-center gap-1">
            <StatusIcon className="h-3 w-3" />
            {post.statusLabel}
          </Badge>
          {post.propertyName?.trim() ? (
            <Badge variant="status">{post.propertyName}</Badge>
          ) : null}
        </div>
        {canEdit || canDelete ? (
          <div ref={menuRef} className="relative shrink-0">
            <Button
              variant="ghost"
              size="sm"
              shape="pill"
              aria-label="게시글 메뉴"
              onClick={() => setMenuOpen((prev) => !prev)}
              className="h-9 w-9 border border-(--oboon-border-default) p-0 text-(--oboon-text-muted) hover:text-(--oboon-text-title)"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
            {menuOpen ? (
              <div className="absolute right-0 top-10 z-10 w-24 overflow-hidden rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) shadow-lg">
                {canEdit ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 w-full justify-start rounded-none px-3 ob-typo-caption text-(--oboon-text-body)"
                    onClick={() => {
                      setMenuOpen(false);
                      onEdit?.();
                    }}
                  >
                    수정
                  </Button>
                ) : null}
                {canDelete ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 w-full justify-start rounded-none px-3 ob-typo-caption !text-(--oboon-danger) hover:bg-(--oboon-danger-bg)"
                    onClick={() => {
                      setMenuOpen(false);
                      onDelete?.();
                    }}
                  >
                    삭제
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* 리포스트 배지 */}
      {post.isRepost && (
        <div className="flex items-center gap-1 ob-typo-caption text-(--oboon-text-muted)">
          <Repeat2 className="h-3.5 w-3.5" />
          <span>리포스트</span>
        </div>
      )}

      {/* 제목: line-clamp-2 */}
      <h3 className="ob-typo-h3 text-(--oboon-text-title) line-clamp-2">
        {post.title}
      </h3>

      {/* 본문: line-clamp-3, text-body */}
      {post.body ? (
        <p className="ob-typo-body text-(--oboon-text-body) line-clamp-3">
          {post.body}
        </p>
      ) : null}

      {/* 원본 글 인용 박스 */}
      {post.isRepost && post.originalPost ? (
        <div className="rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle) p-3 space-y-1">
          <div className="ob-typo-caption text-(--oboon-text-muted)">
            {post.originalPost.authorName}님의 글
            {post.originalPost.propertyName ? ` · ${post.originalPost.propertyName}` : ""}
          </div>
          <p className="ob-typo-body2 text-(--oboon-text-title) line-clamp-2 font-medium">
            {post.originalPost.title}
          </p>
          {post.originalPost.body ? (
            <p className="ob-typo-caption text-(--oboon-text-body) line-clamp-2">
              {post.originalPost.body}
            </p>
          ) : null}
        </div>
      ) : null}

      {/* 푸터: 아바타+이름+시간+팔로우 / 좋아요+댓글+북마크+리포스트 */}
      <div className="flex items-center justify-between gap-2 pt-0.5">
        <div className="flex items-center gap-1.5 min-w-0">
          {post.authorId ? (
            <Link
              href={`/community/profile/${post.authorId}`}
              className="flex items-center gap-1.5 min-w-0 hover:opacity-80 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="h-6 w-6 rounded-full border border-(--oboon-border-default) bg-(--oboon-bg-subtle) overflow-hidden flex-shrink-0 flex items-center justify-center">
                <Image
                  src={getAvatarUrlOrDefault(post.authorAvatarUrl)}
                  alt={post.authorName}
                  width={24}
                  height={24}
                  className="h-full w-full object-cover"
                />
              </div>
              <span className="ob-typo-caption text-(--oboon-text-body) truncate">
                {post.authorName}
              </span>
            </Link>
          ) : (
            <>
              <div className="h-6 w-6 rounded-full border border-(--oboon-border-default) bg-(--oboon-bg-subtle) overflow-hidden flex-shrink-0 flex items-center justify-center">
                <Image
                  src={getAvatarUrlOrDefault(post.authorAvatarUrl)}
                  alt={post.authorName}
                  width={24}
                  height={24}
                  className="h-full w-full object-cover"
                />
              </div>
              <span className="ob-typo-caption text-(--oboon-text-body) truncate">
                {post.authorName}
              </span>
            </>
          )}
          <span className="ob-typo-caption text-(--oboon-text-muted) shrink-0">
            · {post.timeLabel}
          </span>
        </div>

        <div className="flex items-center gap-3 text-(--oboon-text-muted) shrink-0">
          {/* 좋아요 */}
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
                  post.isLiked
                    ? "fill-(--oboon-primary) text-(--oboon-primary)"
                    : "",
                ].join(" ")}
              />
              {post.likes}
            </button>
          ) : (
            <span className="inline-flex items-center gap-1 ob-typo-caption">
              <Heart
                className={[
                  "h-4 w-4",
                  post.isLiked
                    ? "fill-(--oboon-primary) text-(--oboon-primary)"
                    : "",
                ].join(" ")}
              />
              {post.likes}
            </span>
          )}

          {/* 댓글 */}
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

          {/* 북마크 */}
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

          {/* 리포스트 */}
          {onRepost && !post.isMine && !post.isRepost ? (
            <button
              type="button"
              onClick={onRepost}
              className="inline-flex items-center gap-1 ob-typo-caption"
              aria-label="리포스트"
            >
              <Repeat2 className="h-4 w-4" />
              {post.repostCount > 0 ? post.repostCount : null}
            </button>
          ) : post.repostCount > 0 ? (
            <span className="inline-flex items-center gap-1 ob-typo-caption">
              <Repeat2 className="h-4 w-4" />
              {post.repostCount}
            </span>
          ) : null}
        </div>
      </div>

      {/* 댓글 패널 */}
      {commentsExpanded && commentsPanel ? (
        <div className="border-t border-(--oboon-border-default) pt-3">
          {commentsPanel}
        </div>
      ) : null}
    </Card>
  );
}
