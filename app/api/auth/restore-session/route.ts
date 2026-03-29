import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError } from "@/lib/api/route-error";
import { parseJsonBody } from "@/lib/api/route-security";
import {
  checkAuthRateLimit,
  getClientIp,
  restoreSessionIpLimiter,
} from "@/lib/rateLimit";
import { createRestoreToken } from "@/lib/auth/restoreToken";
import { getOAuthTempSession } from "@/lib/auth/oauthTempSession";

const requestSchema = z.object({
  sessionKey: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  const rateLimitRes = await checkAuthRateLimit(
    restoreSessionIpLimiter,
    getClientIp(req),
    { windowMs: 60 * 1000 },
  );
  if (rateLimitRes) return rateLimitRes;

  const parsed = await parseJsonBody(req, requestSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const session = await getOAuthTempSession(parsed.data.sessionKey);

    if (!session || session.purpose !== "restore") {
      return NextResponse.json(
        { error: "유효하지 않은 복구 세션입니다." },
        { status: 403 },
      );
    }

    return NextResponse.json(
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
  } catch (error) {
    return handleApiError("restore-session", error, {
      clientMessage: "서버 오류",
    });
  }
}
