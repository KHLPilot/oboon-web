import { NextResponse } from "next/server";
import { adminSupabase, requireAdminRoute } from "@/lib/api/admin-route";
import { parseJsonBody, uuidV4Schema } from "@/lib/api/route-security";
import {
  adminAgentLastSeenIpLimiter,
  checkAuthRateLimit,
  getClientIp,
} from "@/lib/rateLimit";
import { z } from "zod";

const GET_USER_BATCH_SIZE = 20;
const agentLastSeenRequestSchema = z.object({
  userIds: z.array(uuidV4Schema).max(100).default([]),
});

export async function POST(req: Request) {
  const auth = await requireAdminRoute();
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const rateLimitRes = await checkAuthRateLimit(
      adminAgentLastSeenIpLimiter,
      getClientIp(req),
      { windowMs: 60 * 1000 },
    );
    if (rateLimitRes) return rateLimitRes;

    const parsed = await parseJsonBody(req, agentLastSeenRequestSchema, {
      invalidInputMessage: "userIds가 필요합니다.",
    });
    if (!parsed.ok) {
      return parsed.response;
    }

    const userIds = Array.from(new Set(parsed.data.userIds));

    const lastSignInAtByUserId: Record<string, string | null> = {};

    for (let start = 0; start < userIds.length; start += GET_USER_BATCH_SIZE) {
      const batch = userIds.slice(start, start + GET_USER_BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map((userId) => adminSupabase.auth.admin.getUserById(userId)),
      );

      results.forEach((result, index) => {
        const userId = batch[index];

        if (result.status === "fulfilled" && !result.value.error) {
          lastSignInAtByUserId[userId] =
            result.value.data.user?.last_sign_in_at ?? null;
          return;
        }

        lastSignInAtByUserId[userId] = null;
      });
    }

    return NextResponse.json({ lastSignInAtByUserId });
  } catch (error) {
    console.error("POST /api/admin/agent-last-seen error:", error);
    return NextResponse.json(
      { error: "최근 접속 시간 조회에 실패했습니다." },
      { status: 500 },
    );
  }
}
