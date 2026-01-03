import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
    try {
        const { email } = await req.json();

        if (!email) {
            return NextResponse.json({ error: "이메일 누락" }, { status: 400 });
        }

        console.log("🔍 Temp 유저 확인 중:", email);

        // ✅ 수정: listUsers 대신 직접 조회
        const { data, error } = await supabaseAdmin.auth.admin.listUsers();

        if (error) {
            console.error("유저 목록 조회 실패:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const targetUser = data.users.find(u => u.email === email);

        if (!targetUser) {
            console.log("✅ 해당 이메일 유저 없음");
            return NextResponse.json({ success: true, message: "유저 없음" });
        }

        console.log("📋 발견된 유저:", {
            id: targetUser.id,
            email: targetUser.email,
            confirmed: targetUser.email_confirmed_at,
            metadata: targetUser.user_metadata
        });

        // ✅ 이메일 미인증 + temp 데이터인 경우만 삭제
        if (!targetUser.email_confirmed_at) {
            const metadata = targetUser.user_metadata;
            const isTemp = metadata?.name === "temp" || metadata?.phone_number === "temp";

            if (isTemp) {
                console.log("🗑️ Temp 유저 삭제 시도...");

                const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(
                    targetUser.id
                );

                if (deleteError) {
                    console.error("❌ 유저 삭제 실패:", deleteError);
                    return NextResponse.json({ error: deleteError.message }, { status: 500 });
                } else {
                    console.log("✅ Temp 유저 삭제 완료:", email);
                    return NextResponse.json({
                        success: true,
                        message: "Temp 유저 삭제됨",
                        deleted: true
                    });
                }
            } else {
                console.log("⚠️ Temp 유저 아님 (삭제 안함)");
            }
        } else {
            console.log("⚠️ 이미 인증된 유저 (삭제 안함)");
        }

        return NextResponse.json({ success: true, deleted: false });
    } catch (err: any) {
        console.error("❌ 정리 오류:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}