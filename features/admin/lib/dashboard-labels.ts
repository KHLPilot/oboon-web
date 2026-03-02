import type { AppraisalKind, NoticeCategory } from "@/features/admin/types/dashboard";

export function roleLabel(role: string) {
  switch (role) {
    case "admin":
      return "관리자";
    case "user":
      return "일반 사용자";
    case "agent_pending":
      return "대행사 직원 (승인 대기)";
    case "agent":
      return "대행사 직원";
    default:
      return role;
  }
}

export function roleSortKey(role: string) {
  return roleLabel(role);
}

export function termTypeLabel(type: string) {
  switch (type) {
    case "customer_reservation":
      return "고객용 예약금 안내";
    case "agent_visit_fee":
      return "상담사용 방문성과비 약관";
    case "signup_terms":
      return "회원가입 - 서비스 이용약관";
    case "signup_privacy":
      return "회원가입 - 개인정보 수집·이용";
    case "signup_location":
      return "회원가입 - 위치정보 이용";
    case "signup_marketing":
      return "회원가입 - 마케팅 수신 (선택)";
    default:
      return type;
  }
}

export const NOTICE_CATEGORY_OPTIONS: Array<{ value: NoticeCategory; label: string }> = [
  { value: "update", label: "업데이트" },
  { value: "service", label: "서비스" },
  { value: "event", label: "이벤트" },
  { value: "maintenance", label: "작업 안내" },
];

export function noticeCategoryLabel(category: NoticeCategory) {
  return NOTICE_CATEGORY_OPTIONS.find((item) => item.value === category)?.label ?? category;
}

export function appraisalKindLabel(kind: AppraisalKind) {
  return kind === "apartment" ? "아파트" : "오피스텔";
}

