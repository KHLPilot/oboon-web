export type LoggedInConditionSource =
  | "profile"
  | "request"
  | "draft"
  | "session"
  | "default";

export type LoggedOutConditionSource =
  | "session"
  | "draft"
  | "default";

export function pickLoggedInConditionSource(flags: {
  hasProfile: boolean;
  hasRequest: boolean;
  hasDraft: boolean;
  hasSession: boolean;
}): LoggedInConditionSource {
  // 1순위: 상담사 요청 조건
  if (flags.hasRequest) return "request";
  // 2순위: 최근 평가한 조건 (sessionStorage)
  if (flags.hasSession) return "session";
  // 3순위: 저장된 기본 조건 (profile)
  if (flags.hasProfile) return "profile";
  // 4순위: 임시 저장 조건 (localStorage draft)
  if (flags.hasDraft) return "draft";
  return "default";
}

export function pickLoggedOutConditionSource(flags: {
  hasSession: boolean;
  hasDraft: boolean;
}): LoggedOutConditionSource {
  if (flags.hasSession) return "session";
  if (flags.hasDraft) return "draft";
  return "default";
}
