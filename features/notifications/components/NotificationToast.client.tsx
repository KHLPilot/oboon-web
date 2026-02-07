"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { X, ChevronRight } from "lucide-react";
import type { Notification } from "../domain/notification.types";
import { getNotificationHref } from "../domain/notification.constants";

const TOAST_DURATION = 10000; // 10초

export default function NotificationToastManager() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [expanded, setExpanded] = useState(false);
  const timerRef = useRef<number | null>(null);

  const clearAll = useCallback(() => {
    setNotifications([]);
    setExpanded(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => {
      const next = prev.filter((n) => n.id !== id);
      if (next.length === 0) {
        setExpanded(false);
      }
      return next;
    });
  }, []);

  const resetTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => {
      clearAll();
    }, TOAST_DURATION);
  }, [clearAll]);

  useEffect(() => {
    const handler = (event: Event) => {
      const notification = (event as CustomEvent<Notification>).detail;
      if (!notification) return;

      setNotifications((prev) => {
        // 이미 있는 알림이면 무시
        if (prev.some((n) => n.id === notification.id)) {
          return prev;
        }
        return [notification, ...prev].slice(0, 10); // 최대 10개
      });

      resetTimer();
    };

    window.addEventListener("oboon:notification", handler);
    return () => window.removeEventListener("oboon:notification", handler);
  }, [resetTimer]);

  const handleNavigate = (notification: Notification) => {
    const href = getNotificationHref(notification);
    if (href) {
      router.push(href);
    }
    removeNotification(notification.id);
  };

  const toggleExpand = () => {
    setExpanded((prev) => !prev);
    resetTimer();
  };

  if (notifications.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999]">
      {expanded ? (
        // 확장된 상태: 알림 목록 표시
        <div
          className="animate-slide-in-right rounded-2xl border bg-(--oboon-bg-surface) shadow-lg backdrop-blur w-[320px] max-w-[calc(100vw-2rem)] max-h-[400px] overflow-hidden flex flex-col"
          style={{ borderColor: "var(--oboon-border-default)" }}
        >
          {/* 헤더 */}
          <div
            className="flex items-center justify-between px-4 py-3 border-b shrink-0"
            style={{ borderColor: "var(--oboon-border-default)" }}
          >
            <div className="flex items-center gap-2">
              <span className="oboon-logo h-5 w-5" aria-hidden />
              <span
                className="ob-typo-body2"
                style={{ color: "var(--oboon-text-title)" }}
              >
                새 알림 ({notifications.length})
              </span>
            </div>
            <button
              type="button"
              onClick={clearAll}
              className="rounded-md p-1 transition-colors hover:bg-(--oboon-bg-subtle)"
              style={{ color: "var(--oboon-text-muted)" }}
              aria-label="모두 닫기"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* 알림 목록 */}
          <div className="flex-1 overflow-y-auto">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className="px-4 py-3 border-b last:border-b-0 hover:bg-(--oboon-bg-subtle) transition-colors"
                style={{ borderColor: "var(--oboon-border-default)" }}
              >
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
                <button
                  type="button"
                  onClick={() => handleNavigate(notification)}
                  className="mt-1 flex items-center gap-0.5 text-xs font-medium hover:underline"
                  style={{ color: "var(--oboon-primary)" }}
                >
                  바로가기
                  <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        // 축소된 상태: 오분마크 하나만 표시
        <button
          type="button"
          onClick={toggleExpand}
          className="animate-slide-in-right relative flex items-center justify-center w-14 h-14 rounded-full border bg-(--oboon-bg-surface) shadow-lg backdrop-blur transition-transform hover:scale-105 active:scale-95"
          style={{ borderColor: "var(--oboon-primary)" }}
          aria-label={`새 알림 ${notifications.length}개`}
        >
          <span className="oboon-logo h-7 w-7" aria-hidden />
          {/* 알림 개수 뱃지 */}
          <span
            className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full flex items-center justify-center text-xs font-bold text-white"
            style={{ backgroundColor: "var(--oboon-danger)" }}
          >
            {notifications.length > 9 ? "9+" : notifications.length}
          </span>
        </button>
      )}
    </div>
  );
}
