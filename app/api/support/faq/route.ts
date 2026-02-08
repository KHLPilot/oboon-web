import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// 공개 API용 Supabase 클라이언트 (쿠키 불필요)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * GET /api/support/faq
 * FAQ 아이템 목록 조회 (공개)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryKey = searchParams.get("category");

    let query = supabase
      .from("faq_items")
      .select(`
        id,
        category_id,
        question,
        answer,
        sort_order,
        faq_categories!inner (
          key,
          name,
          sort_order
        )
      `)
      .eq("is_active", true);

    if (categoryKey) {
      query = query.eq("faq_categories.key", categoryKey);
    }

    const { data, error } = await query.order("sort_order", { ascending: true });

    if (error) {
      console.error("FAQ 조회 실패:", error);
      return NextResponse.json(
        { error: "FAQ 조회에 실패했습니다." },
        { status: 500 }
      );
    }

    const items = (data ?? []).map((item) => {
      const category = item.faq_categories as unknown as { key: string; name: string };
      return {
        id: item.id,
        categoryKey: category.key,
        categoryName: category.name,
        question: item.question,
        answer: item.answer,
      };
    });

    return NextResponse.json({ items });
  } catch (err) {
    console.error("FAQ API 오류:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
