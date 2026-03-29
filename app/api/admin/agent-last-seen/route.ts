import { NextResponse } from "next/server";
import { adminSupabase, requireAdminRoute } from "@/lib/api/admin-route";

const GET_USER_BATCH_SIZE = 20;

export async function POST(req: Request) {
  const auth = await requireAdminRoute();
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const body = (await req.json().catch(() => ({}))) as { userIds?: unknown };
    const userIds = Array.from(
      new Set(
        (Array.isArray(body.userIds) ? body.userIds : [])
          .map((id) => String(id ?? "").trim())
          .filter((id) => id.length > 0),
      ),
    );

    if (userIds.length === 0) {
      return NextResponse.json({ lastSignInAtByUserId: {} as Record<string, string | null> });
    }

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
