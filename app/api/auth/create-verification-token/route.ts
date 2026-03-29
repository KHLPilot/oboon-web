import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { randomBytes } from "crypto";
import {
    handleApiError,
    handleSupabaseError,
    logApiError,
    maskEmail,
} from "@/lib/api/route-error";
import {
    checkAuthRateLimit,
    getEmailRateLimitIdentifier,
    verificationTokenEmailLimiter,
} from "@/lib/rateLimit";

const supabaseAdmin = createSupabaseAdminClient();

export async function POST(req: Request) {
    let maskedRequestEmail: string | undefined;

    try {
        const { userId, email } = await req.json();
        const normalizedEmail =
            typeof email === "string" ? email.trim().toLowerCase() : "";

        if (!userId || !normalizedEmail) {
            return NextResponse.json({ error: "필수 값 누락" }, { status: 400 });
        }

        maskedRequestEmail = maskEmail(normalizedEmail);

        const rateLimitRes = await checkAuthRateLimit(
            verificationTokenEmailLimiter,
            getEmailRateLimitIdentifier(normalizedEmail),
            { windowMs: 60 * 60 * 1000 }
        );
        if (rateLimitRes) return rateLimitRes;

        const { data: authUser, error: authUserError } =
            await supabaseAdmin.auth.admin.getUserById(userId);

        if (authUserError) {
            logApiError("create-verification-token auth user 조회", authUserError, {
                email: maskedRequestEmail,
            });
            return NextResponse.json({ error: "사용자를 찾을 수 없습니다" }, { status: 404 });
        }

        if (!authUser.user) {
            return NextResponse.json({ error: "사용자를 찾을 수 없습니다" }, { status: 404 });
        }

        if (authUser.user.email_confirmed_at) {
            return NextResponse.json(
                { error: "이미 인증된 계정입니다" },
                { status: 400 }
            );
        }

        const authUserEmail = authUser.user.email?.trim().toLowerCase();
        if (authUserEmail !== normalizedEmail) {
            return NextResponse.json({ error: "이메일 불일치" }, { status: 403 });
        }

        // 고유 토큰 생성 (32바이트 hex)
        const token = randomBytes(32).toString("hex");

        // verification_tokens 테이블에 저장
        // (이 테이블을 먼저 만들어야 합니다 - 아래 SQL 참고)
        const { error } = await supabaseAdmin.from("verification_tokens").insert({
            token,
            user_id: userId,
            email: normalizedEmail,
            verified: false,
            expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1시간 유효
        });

        if (error) {
            return handleSupabaseError("create-verification-token 저장", error, {
                defaultMessage: "토큰 생성에 실패했습니다",
                context: maskedRequestEmail ? { email: maskedRequestEmail } : undefined,
            });
        }

        return NextResponse.json({ token });
    } catch (err: unknown) {
        return handleApiError("create-verification-token", err, {
            clientMessage: "서버 오류",
            context: maskedRequestEmail ? { email: maskedRequestEmail } : undefined,
        });
    }
}
