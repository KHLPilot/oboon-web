"use client";

import { Clock, Heart, MessageCircle } from "lucide-react";
import Image from "next/image";

import { Badge } from "@/components/ui/Badge";
import Card from "@/components/ui/Card";

import type { CommunityPostViewModel } from "../../domain/community";

export default function CommunityPostCard({
  post,
}: {
  post: CommunityPostViewModel;
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
            {post.authorAvatarUrl ? (
              <Image
                src={post.authorAvatarUrl}
                alt={post.authorName}
                width={28}
                height={28}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="ob-typo-caption text-(--oboon-text-body)">
                {post.authorName.slice(0, 1)}
              </span>
            )}
          </div>
          <span className="ob-typo-subtitle text-(--oboon-text-body)">
            {post.authorName}
          </span>
        </div>

        <div className="flex items-center gap-3 text-(--oboon-text-muted)">
          <span className="inline-flex items-center gap-1 ob-typo-caption">
            <Heart className="h-4 w-4" />
            {post.likes}
          </span>
          <span className="inline-flex items-center gap-1 ob-typo-caption">
            <MessageCircle className="h-4 w-4" />
            {post.comments}
          </span>
          <span className="inline-flex items-center gap-1 ob-typo-caption">
            <Clock className="h-4 w-4" />
            {post.timeLabel}
          </span>
        </div>
      </div>
    </Card>
  );
}
