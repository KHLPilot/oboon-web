"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { subscribeToNotifications } from "../services/notification.realtime";
import type { Notification } from "../domain/notification.types";

type NotificationContextValue = {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  markAsReadByConsultation: (consultationId: string, type: string) => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  deleteAllNotifications: () => Promise<void>;
  refetch: () => Promise<void>;
};

const NotificationContext = createContext<NotificationContextValue | null>(
  null
);

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications");
      const data = await response.json();
      if (response.ok) {
        setNotifications(data.notifications || []);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (!message.toLowerCase().includes("load failed")) {
        console.error("알림 조회 오류:", err);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // 현재 사용자 조회 및 인증 상태 변경 감지
  useEffect(() => {
    const supabase = createSupabaseClient();

    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUserId(user?.id || null);
      if (user) {
        await fetchNotifications();
      } else {
        setLoading(false);
      }
    };

    getUser();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUserId(session?.user?.id || null);
        if (session?.user) {
          fetchNotifications();
        } else {
          setNotifications([]);
          setLoading(false);
        }
      }
    );

    return () => listener.subscription.unsubscribe();
  }, [fetchNotifications]);

  // Realtime 구독
  useEffect(() => {
    if (!userId) return;

    const unsubscribe = subscribeToNotifications({
      userId,
      onNewNotification: (notification) => {
        setNotifications((prev) => [notification, ...prev]);
        // 토스트 표시를 위한 커스텀 이벤트 발생
        window.dispatchEvent(
          new CustomEvent("oboon:notification", { detail: notification })
        );
      },
    });

    return unsubscribe;
  }, [userId]);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId }),
      });

      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId
              ? { ...n, read_at: new Date().toISOString() }
              : n
          )
        );
      }
    } catch (err) {
      console.error("알림 읽음 처리 오류:", err);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });

      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) => ({
            ...n,
            read_at: n.read_at || new Date().toISOString(),
          }))
        );
      }
    } catch (err) {
      console.error("전체 읽음 처리 오류:", err);
    }
  }, []);

  const markAsReadByConsultation = useCallback(
    async (consultationId: string, type: string) => {
      try {
        const response = await fetch("/api/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ consultationId, type }),
        });

        if (response.ok) {
          setNotifications((prev) =>
            prev.map((n) =>
              n.consultation_id === consultationId && n.type === type
                ? { ...n, read_at: n.read_at || new Date().toISOString() }
                : n
            )
          );
        }
      } catch (err) {
        console.error("상담 알림 읽음 처리 오류:", err);
      }
    },
    []
  );

  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      const response = await fetch("/api/notifications", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId }),
      });

      if (response.ok) {
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      }
    } catch (err) {
      console.error("알림 삭제 오류:", err);
    }
  }, []);

  const deleteAllNotifications = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deleteAll: true }),
      });

      if (response.ok) {
        setNotifications([]);
      }
    } catch (err) {
      console.error("전체 삭제 오류:", err);
    }
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read_at).length,
    [notifications]
  );

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      loading,
      markAsRead,
      markAllAsRead,
      markAsReadByConsultation,
      deleteNotification,
      deleteAllNotifications,
      refetch: fetchNotifications,
    }),
    [
      notifications,
      unreadCount,
      loading,
      markAsRead,
      markAllAsRead,
      markAsReadByConsultation,
      deleteNotification,
      deleteAllNotifications,
      fetchNotifications,
    ]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error(
      "useNotifications must be used within NotificationProvider"
    );
  }
  return ctx;
}
