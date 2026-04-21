import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { verificationLimiter, getClientIp, checkRateLimit } from "@/lib/rateLimit";
import { parseJsonBody } from "@/lib/api/route-security";
import { checkVerificationRequestSchema } from "@/lib/auth/auth-request-schemas";

const supabaseAdmin = createSupabaseAdminClient();

export async function POST(req: Request) {
    const rateLimitRes = await checkRateLimit(verificationLimiter, getClientIp(req));
    if (rateLimitRes) return rateLimitRes;

    try {
        const parsed = await parseJsonBody(req, checkVerificationRequestSchema, {
            invalidInputMessage: "토큰이 필요합니다.",
        });
        if (!parsed.ok) {
            return parsed.response;
        }

        const { token } = parsed.data;

        // 1. 토큰으로 레코드 조회
        const { data: tokenData, error: tokenError } = await supabaseAdmin
            .from("verification_tokens")
            .select("token, user_id, expires_at, verified")
            .eq("token", token)
            .single();

        if (tokenError || !tokenData) {
            return NextResponse.json({ verified: false });
        }

        // 2. 만료 체크
        if (new Date(tokenData.expires_at) < new Date()) {
            return NextResponse.json({ verified: false, error: "토큰 만료" });
        }

        // 3. 이미 verified면 바로 리턴
        if (tokenData.verified) {
            return NextResponse.json({ verified: true });
        }

        // 4. Supabase Auth에서 실제 인증 상태 확인
        const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(
            tokenData.user_id
        );

        if (user && user.email_confirmed_at) {
            // 인증 완료됨 → 토큰 업데이트
            await supabaseAdmin
                .from("verification_tokens")
                .update({ verified: true })
                .eq("token", token);

            return NextResponse.json({ verified: true });
        }

        // 아직 미인증
        return NextResponse.json({ verified: false });
    } catch (err: unknown) {
        console.error("[API] 확인 오류:", err instanceof Error ? err.message : "unknown");
        return NextResponse.json({ verified: false });
    }
}
