import { NextResponse } from "next/server";
import { requireAdminRoute } from "@/lib/api/admin-route";
import { handleApiError } from "@/lib/api/route-error";

export async function POST(request: Request) {
  const auth = await requireAdminRoute();
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const { searchParams, origin } = new URL(request.url);
    const dryRun = searchParams.get("dryRun") === "true";
    const cronSecret = process.env.CRON_SECRET;
    const response = await fetch(
      `${origin}/api/cron/regulation-rules-bootstrap?dryRun=${dryRun ? "true" : "false"}`,
      {
        method: "GET",
        headers: cronSecret ? { Authorization: `Bearer ${cronSecret}` } : undefined,
        cache: "no-store",
      },
    );

    const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
    if (!response.ok) {
      return handleApiError(
        "admin/regulation-rules/bootstrap 프록시",
        typeof payload?.error === "string" ? payload.error : "downstream request failed",
        {
          clientMessage: "규제 룰 부트스트랩 실행 중 오류가 발생했습니다",
          context: { downstreamStatus: response.status },
        },
      );
    }

    return NextResponse.json(payload ?? { success: true, dryRun });
  } catch (error) {
    return handleApiError("admin/regulation-rules/bootstrap", error, {
      clientMessage: "규제 룰 부트스트랩 실행 중 오류가 발생했습니다",
    });
  }
}
