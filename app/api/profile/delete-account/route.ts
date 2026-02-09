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

        // 3. auth.users에서 비활성화 (삭제 대신)
        // Supabase Auth는 ban 기능 제공
        const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(
            userId,
            { ban_duration: "876000h" } // 100년 = 영구 정지
        );

        if (banError) {
            console.error("❌ 유저 비활성화 실패:", banError);
            // 실패해도 계속 진행 (로그아웃으로 대체)
        }

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
