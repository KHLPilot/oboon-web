// app/api/profile/delete-account/route.ts (Soft Delete)

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
    try {
        const { userId } = await req.json();

        if (!userId) {
            return NextResponse.json(
                { error: "userId가 필요합니다." },
                { status: 400 }
            );
        }

        // 1. 사용자 확인
        const { data: user } = await supabaseAdmin.auth.admin.getUserById(userId);

        if (!user) {
            return NextResponse.json(
                { error: "사용자를 찾을 수 없습니다." },
                { status: 404 }
            );
        }

        // 2. profiles 익명화 + deleted_at 설정 (Soft Delete)
        const { error: updateError } = await supabaseAdmin
            .from("profiles")
            .update({
                name: "탈퇴한 사용자",
                nickname: null,
                phone_number: null,
                email: `deleted_${userId}@deleted.com`,
                deleted_at: new Date().toISOString(),
            })
            .eq("id", userId);

        if (updateError) {
            console.error("❌ Profile 익명화 실패:", updateError);
            return NextResponse.json(
                { error: "Profile 익명화 실패" },
                { status: 500 }
            );
        }

        // 3. auth.users는 그대로 유지 (ban 하지 않음)
        // 로그인 시 deleted_at 체크로 탈퇴 계정 판별

        return NextResponse.json({
            success: true,
            message: "계정이 삭제되었습니다.",
        });
    } catch (err: any) {
        console.error("❌ 계정 삭제 오류:", err);
        return NextResponse.json(
            { error: "서버 오류" },
            { status: 500 }
        );
    }
}
