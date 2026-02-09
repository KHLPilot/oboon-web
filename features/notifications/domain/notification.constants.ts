/**
 * 알림 타입별 설정 (라벨, 이동 경로)
 */

import type { Notification } from "./notification.types";
import { NOTIFICATION_TYPES } from "./notification.types";

type NotificationConfig = {
  label: string;
  getHref: (notification: Notification, userRole?: string | null) => string | null;
};

export function getConsultationsEntryHref(userRole?: string | null): string {
  return userRole === "agent" ? "/agent/consultations" : "/profile?consultations=1";
}

export const NOTIFICATION_CONFIG: Record<string, NotificationConfig> = {
  [NOTIFICATION_TYPES.NEW_CHAT_MESSAGE]: {
    label: "새 메시지",
    getHref: (n) => (n.consultation_id ? `/chat/${n.consultation_id}` : null),
  },
  [NOTIFICATION_TYPES.CONSULTATION_REQUEST]: {
    label: "예약 요청",
    getHref: () => "/agent/consultations",
  },
  [NOTIFICATION_TYPES.CONSULTATION_CONFIRMED]: {
    label: "예약 확정",
    getHref: (_n, userRole) => getConsultationsEntryHref(userRole),
  },
  [NOTIFICATION_TYPES.CONSULTATION_CANCELLED]: {
    label: "예약 취소",
    getHref: (_n, userRole) => getConsultationsEntryHref(userRole),
  },
  [NOTIFICATION_TYPES.CUSTOMER_ARRIVAL]: {
    label: "고객 도착",
    getHref: () => "/agent/consultations",
  },
  [NOTIFICATION_TYPES.ROLE_CHANGED]: {
    label: "권한 변경",
    getHref: () => "/profile",
  },
  [NOTIFICATION_TYPES.PROPERTY_AGENT_APPROVED]: {
    label: "소속 승인",
    getHref: () => "/agent/properties",
  },
  [NOTIFICATION_TYPES.PROPERTY_AGENT_REJECTED]: {
    label: "소속 거절",
    getHref: () => "/agent/properties",
  },
  [NOTIFICATION_TYPES.ADMIN_PROPERTY_REVIEW_REQUEST]: {
    label: "현장 검토 요청",
    getHref: () => "/admin",
  },
  [NOTIFICATION_TYPES.ADMIN_NEW_RESERVATION]: {
    label: "신규 예약",
    getHref: () => "/admin",
  },
  [NOTIFICATION_TYPES.ADMIN_DEPOSIT_UPDATE]: {
    label: "예약금 변경",
    getHref: () => "/admin",
  },
  [NOTIFICATION_TYPES.ADMIN_NEW_QNA]: {
    label: "1:1 문의",
    getHref: (n) =>
      typeof n.metadata?.qna_id === "string"
        ? `/support/qna/${n.metadata.qna_id}`
        : "/support/qna",
  },
  [NOTIFICATION_TYPES.QNA_ANSWERED]: {
    label: "문의 답변",
    getHref: (n) =>
      typeof n.metadata?.qna_id === "string"
        ? `/support/qna/${n.metadata.qna_id}`
        : "/support/qna",
  },
  [NOTIFICATION_TYPES.SYSTEM_ANNOUNCEMENT]: {
    label: "공지",
    getHref: () => null,
  },
  [NOTIFICATION_TYPES.POPUP_AD]: {
    label: "이벤트",
    getHref: (n) => (n.metadata?.href as string) || null,
  },
};

/**
 * 알림 타입에 해당하는 이동 경로를 반환
 */
export function getNotificationHref(notification: Notification): string | null {
  const config = NOTIFICATION_CONFIG[notification.type];
  return config?.getHref(notification) ?? null;
}

export function getNotificationHrefForRole(
  notification: Notification,
  userRole?: string | null
): string | null {
  const config = NOTIFICATION_CONFIG[notification.type];
  return config?.getHref(notification, userRole) ?? null;
}
