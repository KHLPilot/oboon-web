import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/consultations/cleanup
 * 취소된 지 3일이 지난 예약을 소프트 삭제 처리합니다.
 * Supabase cron job이나 외부 스케줄러에서 호출할 수 있습니다.
 */
export async function POST(req: Request) {
  try {
    // API 키 검증 (선택적 - 보안을 위해 사용 권장)
    const authHeader = req.headers.get("authorization");
    const expectedKey = process.env.CLEANUP_API_KEY;

    // API 키가 설정되어 있으면 검증
    if (expectedKey && authHeader !== `Bearer ${expectedKey}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // 3일 전 날짜 계산
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    // 취소된 지 3일이 지난 예약 조회
    const { data: oldCancelled, error: fetchError } = await adminSupabase
      .from("consultations")
      .select("id")
      .eq("status", "cancelled")
      .lt("cancelled_at", threeDaysAgo.toISOString());

    if (fetchError) {
      console.error("취소된 예약 조회 오류:", fetchError);
      return NextResponse.json(
        { error: "조회 중 오류가 발생했습니다" },
        { status: 500 }
      );
    }

    if (!oldCancelled || oldCancelled.length === 0) {
      return NextResponse.json({
        success: true,
        message: "처리할 예약이 없습니다",
        hiddenCount: 0,
      });
    }

    const idsToHide = oldCancelled.map((c) => c.id);

    // 예약 소프트 삭제 처리
    const { error: hideError } = await adminSupabase
      .from("consultations")
      .update({
        hidden_by_customer: true,
        hidden_by_agent: true,
      })
      .in("id", idsToHide);

    if (hideError) {
      console.error("예약 소프트 삭제 처리 오류:", hideError);
      return NextResponse.json(
        { error: "소프트 삭제 처리 중 오류가 발생했습니다" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `${idsToHide.length}개의 예약이 소프트 삭제 처리되었습니다`,
      hiddenCount: idsToHide.length,
      hiddenIds: idsToHide,
    });
  } catch (err: unknown) {
    console.error("정리 API 오류:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
