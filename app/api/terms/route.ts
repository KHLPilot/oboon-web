import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/terms?type=customer_reservation
 * 활성 약관 조회 (로그인 불필요)
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");

    // 디버그: 환경변수 확인
    console.log("[/api/terms] SUPABASE_URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log("[/api/terms] SERVICE_KEY exists:", !!process.env.SUPABASE_SERVICE_ROLE_KEY);

    let query = adminSupabase
      .from("terms")
      .select("id, type, version, title, content, is_required, display_order, updated_at")
      .eq("is_active", true);

    if (type) {
      query = query.eq("type", type);
    }

    // display_order로 정렬 (0은 맨 뒤로)
    query = query.order("display_order", { ascending: true });

    const { data, error } = await query;

    // 디버그: 결과 확인
    console.log("[/api/terms] type:", type, "result count:", data?.length, "error:", error);

    if (error) {
      console.error("약관 조회 오류:", error);
      return NextResponse.json(
        { error: "약관 조회에 실패했습니다" },
        { status: 500 }
      );
    }

    return NextResponse.json({ terms: data || [] });
  } catch (err: unknown) {
    console.error("약관 API 오류:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
