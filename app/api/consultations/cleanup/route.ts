import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/consultations/cleanup
 * 취소된 지 3일이 지난 예약을 삭제합니다.
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
        message: "삭제할 예약이 없습니다",
        deletedCount: 0,
      });
    }

    const idsToDelete = oldCancelled.map((c) => c.id);

    // 관련 채팅방 먼저 삭제
    const { error: chatRoomError } = await adminSupabase
      .from("chat_rooms")
      .delete()
      .in("consultation_id", idsToDelete);

    if (chatRoomError) {
      console.error("채팅방 삭제 오류:", chatRoomError);
      // 채팅방 삭제 실패해도 계속 진행
    }

    // 관련 채팅 메시지 삭제 (chat_rooms에 cascade가 없는 경우)
    const { error: messageError } = await adminSupabase
      .from("chat_messages")
      .delete()
      .in("consultation_id", idsToDelete);

    if (messageError) {
      console.error("채팅 메시지 삭제 오류:", messageError);
    }

    // 예약 삭제
    const { error: deleteError } = await adminSupabase
      .from("consultations")
      .delete()
      .in("id", idsToDelete);

    if (deleteError) {
      console.error("예약 삭제 오류:", deleteError);
      return NextResponse.json(
        { error: "삭제 중 오류가 발생했습니다" },
        { status: 500 }
      );
    }

    console.log(`${idsToDelete.length}개의 오래된 취소 예약이 삭제되었습니다.`);

    return NextResponse.json({
      success: true,
      message: `${idsToDelete.length}개의 예약이 삭제되었습니다`,
      deletedCount: idsToDelete.length,
      deletedIds: idsToDelete,
    });
  } catch (err: any) {
    console.error("정리 API 오류:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
