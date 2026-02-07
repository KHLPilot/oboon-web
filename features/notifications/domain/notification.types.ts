/**
 * 알림 시스템 타입 정의
 */

export const NOTIFICATION_TYPES = {
  // 채팅/상담
  NEW_CHAT_MESSAGE: "new_chat_message",
  CONSULTATION_REQUEST: "consultation_request",
  CONSULTATION_CONFIRMED: "consultation_confirmed",
  CONSULTATION_CANCELLED: "consultation_cancelled",
  CUSTOMER_ARRIVAL: "customer_arrival",

  // 사용자/권한
  ROLE_CHANGED: "role_changed",
  PROPERTY_AGENT_APPROVED: "property_agent_approved",
  PROPERTY_AGENT_REJECTED: "property_agent_rejected",

  // 시스템/프로모션
  SYSTEM_ANNOUNCEMENT: "system_announcement",
  POPUP_AD: "popup_ad",
} as const;

export type NotificationType =
  (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];

export type Notification = {
  id: string;
  recipient_id: string;
  type: string;
  title: string;
  message: string | null;
  consultation_id: string | null;
  read_at: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};
