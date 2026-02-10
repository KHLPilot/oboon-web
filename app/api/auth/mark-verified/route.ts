import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
    try {
        const { userId, email } = await req.json();

        if (!userId || !email) {
            return NextResponse.json({ error: "필수 값 누락" }, { status: 400 });
        }

        // 해당 유저의 모든 토큰을 verified로 업데이트
        const { error } = await supabaseAdmin
            .from("verification_tokens")
            .update({ verified: true })
            .eq("user_id", userId)
            .eq("verified", false);

        if (error) {
            console.error("토큰 업데이트 실패:", error);
        }

        return NextResponse.json({ success: true });
    } catch (err: unknown) {
        console.error("서버 오류:", err);
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}