"use client";

import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { Trash2 } from "lucide-react";
import type { Notification } from "../domain/notification.types";

type Props = {
  notification: Notification;
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
};

export default function NotificationItem({
  notification,
  onClick,
  onDelete,
}: Props) {
  const isUnread = !notification.read_at;
  const timeAgo = formatDistanceToNow(new Date(notification.created_at), {
    addSuffix: true,
    locale: ko,
  });

  return (
    <div
      className={[
        "relative w-full px-3 py-2.5 transition-colors hover:bg-(--oboon-bg-subtle)",
        isUnread ? "bg-(--oboon-bg-subtle)" : "bg-(--oboon-bg-surface)",
      ].join(" ")}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={onClick}
          className="min-w-0 flex-1 pr-10 text-left"
        >
          <div className="flex items-center gap-2">
            {isUnread ? (
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full bg-(--oboon-danger)"
                aria-hidden
              />
            ) : null}
            <p className="ob-typo-subtitle truncate text-(--oboon-text-title)">
              {notification.title}
            </p>
          </div>
          {notification.message ? (
            <p className="mt-0.5 ob-typo-body truncate text-(--oboon-text-muted)">
              {notification.message}
            </p>
          ) : null}
          <p className="mt-0.5 ob-typo-body text-(--oboon-text-muted)">
            {timeAgo}
          </p>
        </button>
      </div>
      <button
        type="button"
        onClick={onDelete}
        className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex h-8 w-8 items-center justify-center rounded-full border border-(--oboon-border-default) bg-(--oboon-bg-subtle) text-(--oboon-text-muted) transition-colors hover:bg-(--oboon-bg-default)"
        aria-label="알림 삭제"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
