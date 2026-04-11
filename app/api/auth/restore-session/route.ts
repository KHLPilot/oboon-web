import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError } from "@/lib/api/route-error";
import {
  checkAuthRateLimit,
  getClientIp,
  restoreSessionIpLimiter,
} from "@/lib/rateLimit";
import { createRestoreToken } from "@/lib/auth/restoreToken";
import { getOAuthTempSession } from "@/lib/auth/oauthTempSession";
import {
  clearRestoreSessionCookie,
  RESTORE_SESSION_COOKIE_NAME,
} from "@/lib/auth/restoreSessionCookie";

const requestSchema = z.object({
  sessionKey: z.string().uuid().optional(),
});

export async function POST(req: NextRequest) {
  const rateLimitRes = await checkAuthRateLimit(
    restoreSessionIpLimiter,
    getClientIp(req),
    { windowMs: 60 * 1000 },
  );
  if (rateLimitRes) return rateLimitRes;

  try {
    let body: unknown = null;
    try {
      body = await req.json();
    } catch {
      body = null;
    }

    const parsed = requestSchema.safeParse(body ?? {});
    if (!parsed.success && body !== null) {
      return NextResponse.json(
        { error: "입력값이 올바르지 않습니다." },
        { status: 400 },
      );
    }

    const cookieSessionKey = req.cookies.get(RESTORE_SESSION_COOKIE_NAME)?.value ?? null;

    const sessionKey = parsed.success ? parsed.data.sessionKey ?? cookieSessionKey ?? null : cookieSessionKey;
    if (!sessionKey) {
      return NextResponse.json(
        { error: "유효하지 않은 복구 세션입니다." },
        { status: 403 },
      );
    }

    const session = await getOAuthTempSession(sessionKey);

    if (!session || session.purpose !== "restore") {
      return NextResponse.json(
        { error: "유효하지 않은 복구 세션입니다." },
        { status: 403 },
      );
    }

    const response = NextResponse.json(
      {
        email: session.email,
        restoreToken: createRestoreToken(session.userId),
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
    return clearRestoreSessionCookie(response);
  } catch (error) {
    return handleApiError("restore-session", error, {
      clientMessage: "서버 오류",
    });
  }
}
