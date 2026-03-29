import { createHmac } from "crypto";

const RESTORE_TOKEN_TTL_MS = 5 * 60 * 1000;
const MIN_RESTORE_SECRET_LENGTH = 32;

function getRestoreSecret(): string {
  const secret = process.env.RESTORE_TOKEN_SECRET;

  if (!secret) {
    throw new Error(
      "[restoreToken] RESTORE_TOKEN_SECRET 환경변수가 설정되지 않았습니다. 32자 이상의 랜덤 문자열을 설정하세요.",
    );
  }

  if (secret.length < MIN_RESTORE_SECRET_LENGTH) {
    throw new Error("[restoreToken] RESTORE_TOKEN_SECRET은 32자 이상이어야 합니다");
  }

  return secret;
}

export function createRestoreToken(userId: string) {
  const expiresAt = Date.now() + RESTORE_TOKEN_TTL_MS;
  const payload = `${userId}|${expiresAt}`;
  const sig = createHmac("sha256", getRestoreSecret())
    .update(payload)
    .digest("hex");

  return Buffer.from(`${payload}|${sig}`).toString("base64url");
}

export function verifyRestoreToken(token: string): string | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString();
    const [userId, expiresAt, sig, extra] = decoded.split("|");

    if (!userId || !expiresAt || !sig || extra !== undefined) {
      return null;
    }

    const expiresAtMs = Number(expiresAt);
    if (!Number.isFinite(expiresAtMs) || Date.now() > expiresAtMs) {
      return null;
    }

    const expected = createHmac("sha256", getRestoreSecret())
      .update(`${userId}|${expiresAt}`)
      .digest("hex");

    if (sig !== expected) {
      return null;
    }

    return userId;
  } catch {
    return null;
  }
}
