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
  if (flags.hasProfile) return "profile";
  if (flags.hasRequest) return "request";
  if (flags.hasDraft) return "draft";
  if (flags.hasSession) return "session";
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
