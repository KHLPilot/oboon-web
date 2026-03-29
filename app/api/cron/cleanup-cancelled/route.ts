import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { verifyBearerToken } from "@/lib/api/internal-auth";
import { handleApiError, handleSupabaseError } from "@/lib/api/route-error";

export const dynamic = "force-dynamic";

const adminSupabase = createSupabaseAdminClient();

// 취소된 예약 정리 (3일 경과 후 소프트 삭제 처리)
// Vercel Cron 또는 외부 스케줄러에서 호출
export async function GET(req: Request) {
    try {
        // Cron 비밀 키 검증 (선택사항 - 보안을 위해 권장)
        const authHeader = req.headers.get("authorization");
        const cronSecret = process.env.CRON_SECRET;

        if (!verifyBearerToken(authHeader, cronSecret)) {
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
            return handleSupabaseError("cleanup-cancelled 대상 조회", fetchError, {
                defaultMessage: "조회 실패",
            });
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
            return handleSupabaseError("cleanup-cancelled 소프트 삭제", hideError, {
                defaultMessage: "소프트 삭제 처리 실패",
            });
        }

        return NextResponse.json({
            success: true,
            message: `${consultationIds.length}개의 예약이 소프트 삭제 처리되었습니다`,
            hidden: consultationIds.length,
            hiddenIds: consultationIds,
        });

    } catch (err: unknown) {
        return handleApiError("cleanup-cancelled", err, {
            clientMessage: "서버 오류",
        });
    }
}
