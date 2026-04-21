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
import { parseJsonBody } from "@/lib/api/route-security";
import { markVerifiedRequestSchema } from "@/lib/auth/auth-request-schemas";
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

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const parsed = await parseJsonBody(req, markVerifiedRequestSchema, {
            invalidInputMessage: "필수 값 누락",
        });
        if (!parsed.ok) {
            return parsed.response;
        }

        const { userId } = parsed.data;

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
