export function toKoreanErrorMessage(input: unknown, fallback?: string): string {
  const fallbackMessage = fallback?.trim() || "요청 처리 중 오류가 발생했습니다.";

  const raw = normalizeUnknown(input);
  if (!raw) return fallbackMessage;

  const message = raw.trim();
  if (!message) return fallbackMessage;
  const lower = message.toLowerCase();
  const mapped = mapKnownEnglishError(lower);
  const prefix = extractKoreanPrefix(message);
  if (mapped) {
    return prefix ? `${prefix}: ${mapped}` : mapped;
  }

  const hasKorean = /[가-힣]/.test(message);
  const hasLatin = /[A-Za-z]/.test(message);

  if (hasKorean && !hasLatin) return message;
  if (prefix && hasLatin) return `${prefix}: ${fallbackMessage}`;

  return fallbackMessage;
}

function normalizeUnknown(input: unknown): string {
  if (typeof input === "string") return input;
  if (input instanceof Error) return input.message;
  if (typeof input === "object" && input !== null) {
    const maybe = input as { message?: unknown; error?: unknown };
    if (typeof maybe.message === "string") return maybe.message;
    if (typeof maybe.error === "string") return maybe.error;
  }
  return "";
}

function mapKnownEnglishError(lower: string): string | null {
  if (lower.includes("violates row-level security policy")) {
    return "권한이 없어 요청을 처리할 수 없습니다.";
  }
  if (lower.includes("permission denied")) {
    return "권한이 없어 요청을 처리할 수 없습니다.";
  }
  if (lower.includes("duplicate key value violates unique constraint")) {
    return "이미 존재하는 데이터입니다.";
  }
  if (lower.includes("violates not-null constraint")) {
    return "필수 입력값이 누락되었습니다.";
  }
  if (lower.includes("invalid input syntax")) {
    return "입력 형식이 올바르지 않습니다.";
  }
  if (lower.includes("invalid login credentials")) {
    return "이메일 또는 비밀번호가 올바르지 않습니다.";
  }
  if (lower.includes("jwt expired") || lower.includes("token has expired")) {
    return "로그인 세션이 만료되었습니다. 다시 로그인해주세요.";
  }
  if (
    lower.includes("failed to fetch") ||
    lower.includes("network error") ||
    lower.includes("fetch failed")
  ) {
    return "네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
  }
  if (lower.includes("relation") && lower.includes("does not exist")) {
    return "요청 처리 중 서버 설정 오류가 발생했습니다.";
  }
  if (lower.includes("column") && lower.includes("does not exist")) {
    return "요청 처리 중 서버 설정 오류가 발생했습니다.";
  }
  return null;
}

function extractKoreanPrefix(message: string): string | null {
  const idx = message.indexOf(":");
  if (idx < 0) return null;
  const head = message.slice(0, idx).trim();
  if (!head) return null;
  return /[가-힣]/.test(head) ? head : null;
}
