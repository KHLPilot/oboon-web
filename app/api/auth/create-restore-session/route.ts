import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api/route-error";
import {
  badRequestResponse,
  requireAuthenticatedUser,
} from "@/lib/api/route-security";
import {
  checkAuthRateLimit,
  getClientIp,
  restoreSessionIpLimiter,
} from "@/lib/rateLimit";
import { createRestoreOAuthTempSession } from "@/lib/auth/oauthTempSession";

export async function POST(req: NextRequest) {
  const rateLimitRes = await checkAuthRateLimit(
    restoreSessionIpLimiter,
    getClientIp(req),
    { windowMs: 60 * 1000 },
  );
  if (rateLimitRes) return rateLimitRes;

  try {
    const auth = await requireAuthenticatedUser();
    if (!auth.ok) return auth.response;

    const { user } = auth;

    if (!user || !user.email) {
      return badRequestResponse("복구 세션을 생성할 수 없습니다.");
    }

    const sessionKey = await createRestoreOAuthTempSession({
      userId: user.id,
      email: user.email,
    });

    return NextResponse.json(
      { sessionKey },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    return handleApiError("create-restore-session", error, {
      clientMessage: "서버 오류",
    });
  }
}
