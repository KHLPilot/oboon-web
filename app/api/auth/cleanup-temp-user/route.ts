import { NextResponse } from "next/server";
import { verifyBearerToken } from "@/lib/api/internal-auth";
import { handleApiError } from "@/lib/api/route-error";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { findAuthUserByEmail } from "@/lib/supabaseAdminAuth";

const supabaseAdmin = createSupabaseAdminClient();

export async function POST(req: Request) {
    try {
        const authHeader = req.headers.get("authorization");
        const secret = process.env.CLEANUP_API_KEY;

        if (!verifyBearerToken(authHeader, secret)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { email } = await req.json();
        const normalizedEmail =
            typeof email === "string" ? email.trim().toLowerCase() : "";

        if (!normalizedEmail) {
            return NextResponse.json({ error: "이메일 누락" }, { status: 400 });
        }

        const targetUser = await findAuthUserByEmail(supabaseAdmin, normalizedEmail);

        if (!targetUser) {
            return NextResponse.json({ success: true, message: "유저 없음" });
        }

        // ✅ 이메일 미인증 + temp 데이터인 경우만 삭제
        if (!targetUser.email_confirmed_at) {
            const metadata =
                typeof targetUser.user_metadata === "object" &&
                targetUser.user_metadata !== null
                    ? (targetUser.user_metadata as Record<string, unknown>)
                    : null;
            const isTemp =
                metadata?.name === "temp" || metadata?.phone_number === "temp";

            if (isTemp) {
                const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(
                    targetUser.id
                );

                if (deleteError) {
                    return handleApiError("cleanup-temp-user 사용자 삭제", deleteError, {
                        clientMessage: "삭제 실패",
                    });
                } else {
                    return NextResponse.json({
                        success: true,
                        message: "Temp 유저 삭제됨",
                        deleted: true
                    });
                }
            }
        }

        return NextResponse.json({ success: true, deleted: false });
    } catch (err: unknown) {
        return handleApiError("cleanup-temp-user", err, {
            clientMessage: "정리 오류",
        });
    }
}
