import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";

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

        // 고유 토큰 생성 (32바이트 hex)
        const token = randomBytes(32).toString("hex");

        // verification_tokens 테이블에 저장
        // (이 테이블을 먼저 만들어야 합니다 - 아래 SQL 참고)
        const { error } = await supabaseAdmin.from("verification_tokens").insert({
            token,
            user_id: userId,
            email,
            verified: false,
            expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1시간 유효
        });

        if (error) {
            console.error("토큰 저장 실패:", error);
            return NextResponse.json({ error: (error instanceof Error ? error.message : "알 수 없는 오류") }, { status: 500 });
        }

        return NextResponse.json({ token });
    } catch (err: unknown) {
        console.error("서버 오류:", err);
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}