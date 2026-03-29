import { NextResponse } from "next/server";
import { verifyBearerToken } from "@/lib/api/internal-auth";
import { handleApiError } from "@/lib/api/route-error";
import { runRecoPoiBatch } from "@/features/reco/services/recoPoiBatch.service";

export const dynamic = "force-dynamic";

function toPositiveInt(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

function isAuthorized(req: Request): boolean {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  return verifyBearerToken(authHeader, cronSecret);
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const chunkSize = toPositiveInt(searchParams.get("chunk"), 50);
    const topN = toPositiveInt(searchParams.get("topN"), 3);
    const radius = toPositiveInt(searchParams.get("radius"), 2000);
    const concurrency = toPositiveInt(searchParams.get("concurrency"), 3);

    const startedAt = new Date().toISOString();
    const stats = await runRecoPoiBatch({
      chunkSize,
      topN,
      radius,
      concurrency,
    });

    return NextResponse.json({
      success: true,
      startedAt,
      finishedAt: new Date().toISOString(),
      options: { chunkSize, topN, radius, concurrency },
      stats,
    });
  } catch (error) {
    return handleApiError("cron/reco-pois", error, {
      clientMessage: "배치 실행 중 오류가 발생했습니다",
    });
  }
}

export async function GET(req: Request) {
  return POST(req);
}
