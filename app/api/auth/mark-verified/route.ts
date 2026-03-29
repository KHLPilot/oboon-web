import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import {
  checkAuthRateLimit,
  getClientIp,
  markVerifiedIpLimiter,
} from "@/lib/rateLimit";
import {
  handleApiError,
  handleSupabaseError,
} from "@/lib/api/route-error";
import { createSupabaseServer } from "@/lib/supabaseServer";

const supabaseAdmin = createSupabaseAdminClient();

export async function POST(req: Request) {
    const rateLimitRes = await checkAuthRateLimit(
        markVerifiedIpLimiter,
        getClientIp(req),
        { windowMs: 60 * 1000 }
    );
    if (rateLimitRes) return rateLimitRes;

    try {
        const supabase = await createSupabaseServer();
        const {
            data: { user },
        } = await supabase.auth.getUser();
        const { userId } = await req.json();

        if (!userId) {
            return NextResponse.json({ error: "필수 값 누락" }, { status: 400 });
        }

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (user.id !== userId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // 해당 유저의 모든 토큰을 verified로 업데이트
        const { error } = await supabaseAdmin
            .from("verification_tokens")
            .update({ verified: true })
            .eq("user_id", userId)
            .eq("verified", false);

        if (error) {
            return handleSupabaseError("mark-verified 토큰 업데이트", error, {
                defaultMessage: "인증 처리에 실패했습니다",
            });
        }

        return NextResponse.json({ success: true });
    } catch (err: unknown) {
        return handleApiError("mark-verified", err, {
            clientMessage: "서버 오류",
        });
    }
}
