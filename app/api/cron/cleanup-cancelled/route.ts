import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 취소된 예약 정리 (3일 경과 후 소프트 삭제 처리)
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
                message: "처리할 예약이 없습니다",
                hidden: 0,
            });
        }

        const consultationIds = expiredConsultations.map(c => c.id);

        // 예약 소프트 삭제 처리
        const { error: hideError } = await adminSupabase
            .from("consultations")
            .update({
                hidden_by_customer: true,
                hidden_by_agent: true,
            })
            .in("id", consultationIds);

        if (hideError) {
            console.error("예약 소프트 삭제 처리 오류:", hideError);
            return NextResponse.json(
                { error: "소프트 삭제 처리 실패", details: hideError.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: `${consultationIds.length}개의 예약이 소프트 삭제 처리되었습니다`,
            hidden: consultationIds.length,
            hiddenIds: consultationIds,
        });

    } catch (err: unknown) {
        console.error("Cron 정리 API 오류:", err);
        return NextResponse.json(
            { error: "서버 오류", details: (err instanceof Error ? err.message : "알 수 없는 오류") },
            { status: 500 }
        );
    }
}
