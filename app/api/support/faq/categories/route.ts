import { NextResponse } from "next/server";
import { fetchPublicFAQCategoriesServer } from "@/features/support/services/faq.server";

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
 * GET /api/support/faq/categories
 * FAQ 카테고리 목록 조회
 */
export async function GET() {
  try {
    const categories = await fetchPublicFAQCategoriesServer();
    return NextResponse.json({ categories });
  } catch (err) {
    if (isDynamicServerUsageError(err)) {
      throw err;
    }
    console.error("FAQ 카테고리 API 오류:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
