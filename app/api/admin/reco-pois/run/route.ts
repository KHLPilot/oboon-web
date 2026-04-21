import { NextResponse } from "next/server";
import { adminRecoPoisRunQuerySchema } from "../../_schemas";
import { requireAdminRoute } from "@/lib/api/admin-route";
import { handleApiError } from "@/lib/api/route-error";

export async function POST(request: Request) {
  const auth = await requireAdminRoute();
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const { searchParams, origin } = new URL(request.url);
    const parsed = adminRecoPoisRunQuerySchema.safeParse({
      chunk: searchParams.get("chunk") ?? undefined,
      topN: searchParams.get("topN") ?? undefined,
      radius: searchParams.get("radius") ?? undefined,
      concurrency: searchParams.get("concurrency") ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: "유효하지 않은 요청입니다." },
        { status: 400 },
      );
    }
    const chunk = parsed.data.chunk ?? 100;
    const topN = parsed.data.topN ?? 3;
    const radius = parsed.data.radius ?? 2000;
    const concurrency = parsed.data.concurrency ?? 4;

    const cronSecret = process.env.CRON_SECRET;
    const response = await fetch(
      `${origin}/api/cron/reco-pois?chunk=${chunk}&topN=${topN}&radius=${radius}&concurrency=${concurrency}`,
      {
        method: "POST",
        headers: cronSecret ? { Authorization: `Bearer ${cronSecret}` } : undefined,
        cache: "no-store",
      },
    );

    const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;

    if (!response.ok) {
      return handleApiError(
        "admin/reco-pois/run 프록시",
        typeof payload?.error === "string" ? payload.error : "downstream request failed",
        {
          clientMessage: "추천 POI 배치 실행 중 오류가 발생했습니다",
          context: { downstreamStatus: response.status },
        },
      );
    }

    return NextResponse.json(payload ?? { success: true });
  } catch (error) {
    return handleApiError("admin/reco-pois/run", error, {
      clientMessage: "추천 POI 배치 실행 중 오류가 발생했습니다",
    });
  }
}
