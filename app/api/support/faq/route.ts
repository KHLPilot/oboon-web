import { NextResponse } from "next/server";
import { fetchPublicFAQItemsServer } from "@/features/support/services/faq.server";

export const dynamic = "force-dynamic";

function isDynamicServerUsageError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    (error as { digest?: string }).digest === "DYNAMIC_SERVER_USAGE"
  );
}

/**
 * GET /api/support/faq
 * FAQ 아이템 목록 조회 (공개)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryKey = searchParams.get("category");
    const items = await fetchPublicFAQItemsServer(categoryKey);

    return NextResponse.json({ items });
  } catch (err) {
    if (isDynamicServerUsageError(err)) {
      throw err;
    }
    console.error("FAQ API 오류:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
