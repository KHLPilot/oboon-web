import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 취소된 예약 정리 (3일 경과 후 삭제)
// Vercel Cron 또는 외부 스케줄러에서 호출
export async function GET(req: Request) {
    try {
        // Cron 비밀 키 검증 (선택사항 - 보안을 위해 권장)
        const authHeader = req.headers.get("authorization");
        const cronSecret = process.env.CRON_SECRET;

        if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        // 3일 전 날짜 계산
        const deletionThreshold = new Date();
        deletionThreshold.setDate(deletionThreshold.getDate() - 3);

        // 취소된 예약 중 3일이 지난 것들 조회
        const { data: expiredConsultations, error: fetchError } = await adminSupabase
            .from("consultations")
            .select("id")
            .eq("status", "cancelled")
            .not("cancelled_at", "is", null)
            .lt("cancelled_at", deletionThreshold.toISOString());

        if (fetchError) {
            console.error("만료된 예약 조회 오류:", fetchError);
            return NextResponse.json(
                { error: "조회 실패", details: fetchError.message },
                { status: 500 }
            );
        }

        if (!expiredConsultations || expiredConsultations.length === 0) {
            return NextResponse.json({
                success: true,
                message: "삭제할 예약이 없습니다",
                deleted: 0,
            });
        }

        const consultationIds = expiredConsultations.map(c => c.id);

        // 1. 관련 채팅 메시지 삭제
        const { data: chatRooms } = await adminSupabase
            .from("chat_rooms")
            .select("id")
            .in("consultation_id", consultationIds);

        if (chatRooms && chatRooms.length > 0) {
            const roomIds = chatRooms.map(r => r.id);

            // 채팅 메시지 삭제
            const { error: msgDeleteError } = await adminSupabase
                .from("chat_messages")
                .delete()
                .in("room_id", roomIds);

            if (msgDeleteError) {
                console.error("채팅 메시지 삭제 오류:", msgDeleteError);
            }

            // 채팅방 삭제
            const { error: roomDeleteError } = await adminSupabase
                .from("chat_rooms")
                .delete()
                .in("id", roomIds);

            if (roomDeleteError) {
                console.error("채팅방 삭제 오류:", roomDeleteError);
            }
        }

        // 2. 예약 삭제
        const { error: deleteError } = await adminSupabase
            .from("consultations")
            .delete()
            .in("id", consultationIds);

        if (deleteError) {
            console.error("예약 삭제 오류:", deleteError);
            return NextResponse.json(
                { error: "삭제 실패", details: deleteError.message },
                { status: 500 }
            );
        }

        console.log(`[Cron] ${consultationIds.length}개의 취소된 예약 삭제 완료`);

        return NextResponse.json({
            success: true,
            message: `${consultationIds.length}개의 예약이 삭제되었습니다`,
            deleted: consultationIds.length,
            deletedIds: consultationIds,
        });

    } catch (err: any) {
        console.error("Cron 정리 API 오류:", err);
        return NextResponse.json(
            { error: "서버 오류", details: err.message },
            { status: 500 }
        );
    }
}
