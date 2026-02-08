import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// 공개 API용 Supabase 클라이언트 (쿠키 불필요)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * GET /api/support/faq/categories
 * FAQ 카테고리 목록 조회
 */
export async function GET() {
  try {

    const { data, error } = await supabase
      .from("faq_categories")
      .select("id, key, name, description, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("FAQ 카테고리 조회 실패:", error);
      return NextResponse.json(
        { error: "카테고리 조회에 실패했습니다." },
        { status: 500 }
      );
    }

    return NextResponse.json({ categories: data ?? [] });
  } catch (err) {
    console.error("FAQ 카테고리 API 오류:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
