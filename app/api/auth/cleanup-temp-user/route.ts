import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function getErrorMessage(error: unknown, fallback: string) {
    return error instanceof Error ? error.message : fallback;
}

export async function POST(req: Request) {
    try {
        const { email } = await req.json();

        if (!email) {
            return NextResponse.json({ error: "이메일 누락" }, { status: 400 });
        }

        // ✅ 수정: listUsers 대신 직접 조회
        const { data, error } = await supabaseAdmin.auth.admin.listUsers();

        if (error) {
            console.error("유저 목록 조회 실패:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const targetUser = data.users.find(u => u.email === email);

        if (!targetUser) {
            return NextResponse.json({ success: true, message: "유저 없음" });
        }

        // ✅ 이메일 미인증 + temp 데이터인 경우만 삭제
        if (!targetUser.email_confirmed_at) {
            const metadata = targetUser.user_metadata;
            const isTemp = metadata?.name === "temp" || metadata?.phone_number === "temp";

            if (isTemp) {
                const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(
                    targetUser.id
                );

                if (deleteError) {
                    console.error("❌ 유저 삭제 실패:", deleteError);
                    return NextResponse.json({ error: deleteError.message }, { status: 500 });
                } else {
                    return NextResponse.json({
                        success: true,
                        message: "Temp 유저 삭제됨",
                        deleted: true
                    });
                }
            } else {
            }
        } else {
        }

        return NextResponse.json({ success: true, deleted: false });
    } catch (err: unknown) {
        console.error("❌ 정리 오류:", err);
        return NextResponse.json({ error: getErrorMessage(err, "정리 오류") }, { status: 500 });
    }
}
