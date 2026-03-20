import { NextResponse } from "next/server";
import { fetchPublicFAQCategoriesServer } from "@/features/support/services/faq.server";

/**
 * GET /api/support/faq/categories
 * FAQ 카테고리 목록 조회
 */
export async function GET() {
  try {
    const categories = await fetchPublicFAQCategoriesServer();
    return NextResponse.json({ categories });
  } catch (err) {
    console.error("FAQ 카테고리 API 오류:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
