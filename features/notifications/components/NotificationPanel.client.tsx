"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, BellOff, Trash2, Bell } from "lucide-react";
import { useNotifications } from "./NotificationProvider.client";
import NotificationItem from "./NotificationItem.client";
import Button from "@/components/ui/Button";
import type { Notification } from "../domain/notification.types";
import { getNotificationHrefForRole } from "../domain/notification.constants";
import { createSupabaseClient } from "@/lib/supabaseClient";

type Props = {
  onClose: () => void;
};

export default function NotificationPanel({ onClose }: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseClient(), []);
  const [userRole, setUserRole] = useState<string | null>(null);
  const {
    notifications,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
    unreadCount,
  } = useNotifications();

  useEffect(() => {
    let mounted = true;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || !mounted) return;
      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      if (mounted) {
        setUserRole(data?.role ?? null);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [supabase]);

  const handleItemClick = async (notification: Notification) => {
    // 읽음 처리
    if (!notification.read_at) {
      await markAsRead(notification.id);
    }

    // 해당 페이지로 이동
    const href = getNotificationHrefForRole(notification, userRole);
    if (href) {
      router.push(href);
    }

    onClose();
  };

  const handleDelete = async (
    e: React.MouseEvent,
    notificationId: string
  ) => {
    e.stopPropagation();
    await deleteNotification(notificationId);
  };

  const handleDeleteAll = async () => {
    if (window.confirm("모든 알림을 삭제하시겠습니까?")) {
      await deleteAllNotifications();
    }
  };

  return (
    <div className="max-h-96 overflow-hidden flex flex-col rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) shadow-lg">
      {/* 헤더 */}
      <div className="flex items-center justify-between gap-3 pl-4 pr-3 py-3.5 border-b border-(--oboon-border-default) bg-(--oboon-bg-subtle)">
        <div className="flex items-center gap-2 text-(--oboon-text-title)">
          <Bell className="h-5 w-5" />
          <span className="ob-typo-subtitle">알림</span>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => markAllAsRead()}
              className="h-8 rounded-full px-3 ob-typo-body"
            >
              모두 읽음
            </Button>
          )}
          {notifications.length > 0 && (
            <Button
              size="sm"
              variant="secondary"
              shape="pill"
              onClick={handleDeleteAll}
              className="h-8 w-8 rounded-full p-0"
              aria-label="전체 삭제"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* 콘텐츠 */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-(--oboon-primary)" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <BellOff className="h-8 w-8 mb-2 text-(--oboon-text-muted)" />
            <p className="ob-typo-body text-(--oboon-text-muted)">
              알림이 없습니다
            </p>
          </div>
        ) : (
          <div className="divide-y divide-(--oboon-border-default)">
            {notifications.slice(0, 20).map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onClick={() => handleItemClick(notification)}
                onDelete={(e) => handleDelete(e, notification.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
