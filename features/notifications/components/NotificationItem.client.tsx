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
      className={`relative group w-full px-4 py-3 text-left transition-colors hover:bg-(--oboon-bg-subtle) ${
        isUnread ? "bg-(--oboon-bg-subtle)/50" : ""
      }`}
    >
      <button type="button" onClick={onClick} className="w-full text-left">
        <div className="flex items-start gap-3">
          {/* 읽지 않은 알림 표시 (오분 마크) */}
          {isUnread && (
            <span className="oboon-logo mt-1 h-4 w-4 shrink-0" aria-hidden />
          )}
          {!isUnread && <span className="w-4 shrink-0" />}

          <div className="flex-1 min-w-0 pr-6">
            <p
              className="ob-typo-body2 truncate"
              style={{ color: "var(--oboon-text-title)" }}
            >
              {notification.title}
            </p>
            {notification.message && (
              <p
                className="ob-typo-caption truncate mt-0.5"
                style={{ color: "var(--oboon-text-muted)" }}
              >
                {notification.message}
              </p>
            )}
            <p
              className="ob-typo-caption mt-1"
              style={{ color: "var(--oboon-text-muted)" }}
            >
              {timeAgo}
            </p>
          </div>
        </div>
      </button>
      {/* 삭제 버튼 - 항상 표시 */}
      <button
        type="button"
        onClick={onDelete}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md transition-colors hover:bg-red-100 active:bg-red-200"
        style={{ color: "var(--oboon-danger, #ef4444)" }}
        aria-label="알림 삭제"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
