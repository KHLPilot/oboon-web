import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { handleApiError, handleSupabaseError } from "@/lib/api/route-error";

export const dynamic = "force-dynamic";

const adminSupabase = createSupabaseAdminClient();

/**
 * GET /api/terms?type=customer_reservation
 * 활성 약관 조회 (로그인 불필요)
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");

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

    if (error) {
      return handleSupabaseError("terms 조회", error, {
        defaultMessage: "약관 조회에 실패했습니다",
      });
    }

    return NextResponse.json({ terms: data || [] });
  } catch (err: unknown) {
    return handleApiError("terms API", err, {
      clientMessage: "서버 오류가 발생했습니다",
    });
  }
}
