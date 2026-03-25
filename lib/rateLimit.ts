/**
 * Rate Limiting 유틸리티
 *
 * Upstash Redis를 사용한 슬라이딩 윈도우 방식 rate limiting.
 * UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN 미설정 시
 * rate limiting을 건너뜀 (fail-open) — 앱 동작에 영향 없음.
 *
 * 환경변수 설정:
 *   UPSTASH_REDIS_REST_URL=https://...upstash.io
 *   UPSTASH_REDIS_REST_TOKEN=...
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

function createRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

const redis = createRedis();

/** 인증/검증 엔드포인트: IP당 분당 5회 */
export const authLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "1 m"),
      prefix: "rl:auth",
    })
  : null;

/** 이메일 인증 폴링: IP당 분당 20회 (3초 간격 폴링 허용) */
export const verificationLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(20, "1 m"),
      prefix: "rl:verification",
    })
  : null;

/** 비밀번호 검증: IP당 분당 3회 (브루트포스 방지) */
export const passwordLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(3, "1 m"),
      prefix: "rl:password",
    })
  : null;

/** 요청에서 클라이언트 IP 추출 (Vercel 환경 포함) */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "anonymous";
}

/**
 * Rate limit 검사 후 초과 시 429 Response 반환.
 * limiter가 null(Upstash 미설정)이면 항상 null 반환 (통과).
 *
 * @returns 429 Response | null (통과)
 */
export async function checkRateLimit(
  limiter: Ratelimit | null,
  identifier: string,
): Promise<Response | null> {
  if (!limiter) return null;

  const { success } = await limiter.limit(identifier);

  if (!success) {
    return new Response(
      JSON.stringify({ error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": "60",
          "X-RateLimit-Remaining": "0",
        },
      },
    );
  }

  return null;
}
