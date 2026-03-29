import { randomUUID } from "crypto";
import { Redis } from "@upstash/redis";

const OAUTH_TEMP_SESSION_TTL_SECONDS = 60 * 5;
const OAUTH_TEMP_SESSION_PREFIX = "oauth-temp";
const OAUTH_TEMP_SESSION_CONFIG_ERROR =
  "[oauthTempSession] UPSTASH_REDIS_REST_URL / TOKEN 환경변수가 설정되지 않았습니다. OAuth 복구 플로우는 Redis가 필수입니다.";

type RestoreOAuthTempSession = {
  purpose: "restore";
  userId: string;
  email: string;
};

type OAuthTempSession = RestoreOAuthTempSession;

function createRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) return null;

  return new Redis({ url, token });
}

const redis = createRedis();

export function validateSessionStoreConfig(): void {
  if (!redis) {
    throw new Error(OAUTH_TEMP_SESSION_CONFIG_ERROR);
  }
}

function getRequiredRedis(): Redis {
  validateSessionStoreConfig();
  return redis as Redis;
}

function getRedisKey(sessionKey: string) {
  return `${OAUTH_TEMP_SESSION_PREFIX}:${sessionKey}`;
}

export async function createRestoreOAuthTempSession(input: {
  userId: string;
  email: string;
}): Promise<string> {
  const store = getRequiredRedis();
  const sessionKey = randomUUID();
  const payload: RestoreOAuthTempSession = {
    purpose: "restore",
    userId: input.userId,
    email: input.email,
  };

  await store.set(
    getRedisKey(sessionKey),
    JSON.stringify(payload),
    { ex: OAUTH_TEMP_SESSION_TTL_SECONDS },
  );

  return sessionKey;
}

export async function getOAuthTempSession(
  sessionKey: string,
): Promise<OAuthTempSession | null> {
  if (!sessionKey) return null;
  const store = getRequiredRedis();

  const raw = await store.get<string>(getRedisKey(sessionKey));
  if (!raw) return null;

  try {
    return JSON.parse(raw) as OAuthTempSession;
  } catch {
    return null;
  }
}
