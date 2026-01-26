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

        // 전체 유저 목록에서 해당 이메일 찾기
        const { data, error } = await supabaseAdmin.auth.admin.listUsers();

        if (error) {
            console.error("유저 조회 실패:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const existingUser = data.users.find(u => u.email === email);

        if (!existingUser) {
            return NextResponse.json({
                exists: false,
                confirmed: false
            });
        }

        const isConfirmed = !!existingUser.email_confirmed_at;

        return NextResponse.json({
            exists: true,
            confirmed: isConfirmed
        });
    } catch (err: any) {
        console.error("❌ 이메일 체크 오류:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
