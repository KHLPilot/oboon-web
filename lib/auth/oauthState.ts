import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { constantTimeEqual } from "@/lib/api/internal-auth";

export type OAuthProvider = "google" | "naver";

type CookieStoreLike = {
  get(name: string): { value: string } | undefined;
};

const OAUTH_STATE_COOKIE_PREFIX = "oauth_state";
const OAUTH_STATE_MAX_AGE_SECONDS = 60 * 10;

function getOAuthStateCookieName(provider: OAuthProvider) {
  return `${OAUTH_STATE_COOKIE_PREFIX}_${provider}`;
}

export function createOAuthState(): string {
  return randomUUID();
}

export function setOAuthStateCookie(
  response: NextResponse,
  provider: OAuthProvider,
  state: string,
): NextResponse {
  response.cookies.set(getOAuthStateCookieName(provider), state, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    maxAge: OAUTH_STATE_MAX_AGE_SECONDS,
    path: "/",
  });

  return response;
}

export function clearOAuthStateCookie(
  response: NextResponse,
  provider: OAuthProvider,
): NextResponse {
  response.cookies.set(getOAuthStateCookieName(provider), "", {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    maxAge: 0,
    path: "/",
  });

  return response;
}

export function readOAuthStateCookie(
  provider: OAuthProvider,
  cookieStore: CookieStoreLike,
): string | null {
  return cookieStore.get(getOAuthStateCookieName(provider))?.value?.trim() ?? null;
}

export function isValidOAuthState(
  expectedState: string | null | undefined,
  stateCandidates: string[],
): boolean {
  return resolveMatchingOAuthState(expectedState, stateCandidates) !== null;
}

export function resolveMatchingOAuthState(
  expectedState: string | null | undefined,
  stateCandidates: string[],
): string | null {
  const expected = expectedState?.trim();

  if (!expected) {
    return null;
  }

  for (const candidate of stateCandidates) {
    const normalizedCandidate = candidate.trim();
    if (normalizedCandidate.length > 0 && constantTimeEqual(normalizedCandidate, expected)) {
      return normalizedCandidate;
    }
  }

  return null;
}
