/**
 * 알림 Realtime 구독 서비스
 */

import { createSupabaseClient } from "@/lib/supabaseClient";
import type { Notification } from "../domain/notification.types";

type SubscribeArgs = {
  userId: string;
  onNewNotification: (notification: Notification) => void;
};

/**
 * 사용자의 알림을 실시간으로 구독
 * @returns 구독 해제 함수
 */
export function subscribeToNotifications({
  userId,
  onNewNotification,
}: SubscribeArgs): () => void {
  const supabase = createSupabaseClient();

  const channel = supabase
    .channel(`user_notifications_${userId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `recipient_id=eq.${userId}`,
      },
      (payload) => {
        const notification = payload.new as Notification;
        onNewNotification(notification);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
