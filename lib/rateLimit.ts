/**
 * Rate Limiting 유틸리티
 *
 * Upstash Redis를 사용한 슬라이딩 윈도우 방식 rate limiting.
 * 기본 동작은 fail-open이지만, 인증 엔드포인트는 fail-secure로 사용할 수 있다.
 *
 * 환경변수 설정:
 *   UPSTASH_REDIS_REST_URL=https://...upstash.io
 *   UPSTASH_REDIS_REST_TOKEN=...
 */

import { createHash } from "crypto";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

type RateLimitMode = "open" | "secure";

type CheckRateLimitOptions = {
  failMode?: RateLimitMode;
  windowMs?: number;
  message?: string;
};

type MinimalRateLimitResult = {
  success: boolean;
  reset: number;
  remaining: number;
};

function createRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

const redis = createRedis();

function createLimiter(
  prefix: string,
  count: number,
  window: `${number} ${"s" | "m" | "h"}`,
): Ratelimit | null {
  if (!redis) return null;

  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(count, window),
    prefix,
  });
}

/** 인증/검증 엔드포인트: IP당 분당 5회 */
export const authLimiter = createLimiter("rl:auth", 5, "1 m");

/** OAuth 콜백: IP당 분당 5회 */
export const oauthCallbackIpLimiter = createLimiter(
  "rl:auth:oauth-callback",
  5,
  "1 m",
);

/** 이메일 인증 폴링: IP당 분당 20회 (3초 간격 폴링 허용) */
export const verificationLimiter = createLimiter("rl:verification", 20, "1 m");

/** 비밀번호 검증: IP당 분당 3회 (브루트포스 방지) */
export const passwordLimiter = createLimiter("rl:password", 3, "1 m");

/** 탈퇴 계정 확인: 이메일당 10분당 5회 */
export const deletedAccountEmailLimiter = createLimiter(
  "rl:auth:check-deleted-account",
  5,
  "10 m",
);

/** 인증 완료 표시: IP당 분당 10회 */
export const markVerifiedIpLimiter = createLimiter(
  "rl:auth:mark-verified",
  10,
  "1 m",
);

/** 계정 복구: IP당 분당 5회 */
export const restoreAccountIpLimiter = createLimiter(
  "rl:auth:restore-account",
  5,
  "1 m",
);

/** 계정 복구: 이메일당 10분당 5회 */
export const restoreAccountEmailLimiter = createLimiter(
  "rl:auth:restore-account-email",
  5,
  "10 m",
);

/** 복구 세션 생성/조회: IP당 분당 10회 */
export const restoreSessionIpLimiter = createLimiter(
  "rl:auth:restore-session",
  10,
  "1 m",
);

/** 비회원 조건 검증: IP당 분당 10회 */
export const guestConditionEvaluationIpLimiter = createLimiter(
  "rl:condition-validation:guest",
  10,
  "1 m",
);

/** 맞춤현장 추천: IP당 분당 12회 */
export const conditionRecommendationIpLimiter = createLimiter(
  "rl:condition-validation:recommend",
  12,
  "1 m",
);

/** 공개 조건 평가: IP당 분당 10회 */
export const conditionEvaluationIpLimiter = createLimiter(
  "rl:condition-validation:evaluate",
  10,
  "1 m",
);

/** 로그인 상세 조건 평가: 사용자당 분당 20회 */
export const conditionEvaluationUserLimiter = createLimiter(
  "rl:condition-validation:evaluate-v2",
  20,
  "1 m",
);

/** PDF 추출: 사용자당 10분당 8회 */
export const extractPdfLimiter = createLimiter("rl:extract-pdf", 8, "10 m");

/** 주소 검색 프록시: 사용자당 10분당 60회 */
export const geoAddressLimiter = createLimiter("rl:geo:address", 60, "10 m");

/** 역지오코딩 프록시: 사용자당 10분당 120회 */
export const geoReverseLimiter = createLimiter("rl:geo:reverse", 120, "10 m");

/** 인증 토큰 생성: 이메일당 시간당 3회 */
export const verificationTokenEmailLimiter = createLimiter(
  "rl:auth:create-verification-token",
  3,
  "1 h",
);

function parseSingleIp(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.toLowerCase() === "unknown") return null;
  return trimmed;
}

function parseForwardedLastIp(value: string | null): string | null {
  if (!value) return null;

  const ips = value
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part && part.toLowerCase() !== "unknown");

  return ips.at(-1) ?? null;
}

export function getClientIp(req: Request): string {
  // Vercel이 주입한 실제 클라이언트 IP를 우선 사용한다.
  const realIp = parseSingleIp(req.headers.get("x-real-ip"));
  if (realIp) return realIp;

  // Vercel 프록시가 마지막에 추가한 값을 신뢰한다.
  const forwardedIp = parseForwardedLastIp(req.headers.get("x-forwarded-for"));
  if (forwardedIp) return forwardedIp;

  return "anonymous";
}

export function getEmailRateLimitIdentifier(email: string): string {
  const normalizedEmail = email.trim().toLowerCase();
  return createHash("sha256").update(normalizedEmail).digest("hex");
}

function getRetryAfterSeconds(reset: number): string {
  const seconds = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
  return String(seconds);
}

function buildFailResult(windowMs: number): MinimalRateLimitResult {
  return {
    success: false,
    reset: Date.now() + windowMs,
    remaining: 0,
  };
}

function buildPassResult(): MinimalRateLimitResult {
  return {
    success: true,
    reset: Date.now(),
    remaining: 1,
  };
}

async function limitWithPolicy(
  limiter: Ratelimit | null,
  identifier: string,
  options: Required<Pick<CheckRateLimitOptions, "failMode" | "windowMs">>,
): Promise<MinimalRateLimitResult> {
  if (!limiter) {
    if (options.failMode === "secure") {
      console.error("[rateLimit] Redis 미설정 또는 초기화 실패");
      return buildFailResult(options.windowMs);
    }

    return buildPassResult();
  }

  try {
    const result = await limiter.limit(identifier);
    return {
      success: result.success,
      reset: result.reset,
      remaining: result.remaining,
    };
  } catch (error) {
    console.error("[rateLimit] Redis 장애:", {
      message: error instanceof Error ? error.message : String(error),
      failMode: options.failMode,
    });

    if (options.failMode === "secure") {
      return buildFailResult(options.windowMs);
    }

    return buildPassResult();
  }
}

function buildRateLimitResponse(
  result: MinimalRateLimitResult,
  message: string,
): Response {
  return new Response(
    JSON.stringify({ error: message }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": getRetryAfterSeconds(result.reset),
        "X-RateLimit-Remaining": String(result.remaining),
      },
    },
  );
}

/**
 * Rate limit 검사 후 초과 시 429 Response 반환.
 * 기본값은 fail-open이며, 인증 엔드포인트는 checkAuthRateLimit을 사용한다.
 *
 * @returns 429 Response | null (통과)
 */
export async function checkRateLimit(
  limiter: Ratelimit | null,
  identifier: string,
  options: CheckRateLimitOptions = {},
): Promise<Response | null> {
  const failMode = options.failMode ?? "open";
  const windowMs = options.windowMs ?? 60_000;
  const message =
    options.message ?? "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.";

  const result = await limitWithPolicy(limiter, identifier, {
    failMode,
    windowMs,
  });

  if (!result.success) {
    return buildRateLimitResponse(result, message);
  }

  return null;
}

export async function checkAuthRateLimit(
  limiter: Ratelimit | null,
  identifier: string,
  options: Omit<CheckRateLimitOptions, "failMode"> = {},
): Promise<Response | null> {
  return checkRateLimit(limiter, identifier, {
    ...options,
    failMode: "secure",
  });
}
