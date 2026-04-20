"use client";

import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { X } from "lucide-react";
import type { Notification } from "../domain/notification.types";
import IconButton from "@/components/ui/IconButton";
import ListRow from "@/components/ui/ListRow";

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
    <ListRow
      withTouchEffect
      border="indented"
      onClick={onClick}
      left={
        isUnread ? (
          <span
            className="mt-1.5 h-1.5 w-1.5 rounded-full bg-(--oboon-danger)"
            aria-hidden
          />
        ) : (
          <span className="w-1.5" aria-hidden />
        )
      }
      leftAlignment="top"
      contents={
        <div className="min-w-0">
          <p className="ob-typo-subtitle overflow-hidden text-(--oboon-text-title) [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
            {notification.title}
          </p>
          {notification.message ? (
            <p className="mt-0.5 ob-typo-body overflow-hidden text-(--oboon-text-muted) [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
              {notification.message}
            </p>
          ) : null}
          <p className="mt-0.5 ob-typo-body text-(--oboon-text-muted)">
            {timeAgo}
          </p>
        </div>
      }
      right={
        <IconButton
          icon={<X className="h-4 w-4 text-(--oboon-danger)" />}
          aria-label="알림 삭제"
          variant="clear"
          size="sm"
          shape="circle"
          onClick={(event) => {
            event.stopPropagation();
            onDelete(event);
          }}
        />
      }
      rightAlignment="top"
      className={isUnread ? "bg-(--oboon-bg-subtle)" : "bg-(--oboon-bg-surface)"}
    />
  );
}
