import { NextResponse } from "next/server";

export const RESTORE_SESSION_COOKIE_NAME = "oauth_restore_session";
export const RESTORE_SESSION_COOKIE_MAX_AGE_SECONDS = 60 * 5;

export function setRestoreSessionCookie(
  response: NextResponse,
  sessionKey: string,
): NextResponse {
  response.cookies.set(RESTORE_SESSION_COOKIE_NAME, sessionKey, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: RESTORE_SESSION_COOKIE_MAX_AGE_SECONDS,
  });
  return response;
}

export function clearRestoreSessionCookie(response: NextResponse): NextResponse {
  response.cookies.set(RESTORE_SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
