// app/api/profile/check-nickname/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
    try {
        const { nickname, currentUserId } = await req.json();

        // 닉네임이 없으면 사용 가능
        if (!nickname || nickname.trim() === "") {
            return NextResponse.json({ available: true });
        }

        // 닉네임 중복 체크 (본인 제외)
        const { data, error } = await supabaseAdmin
            .from("profiles")
            .select("id")
            .eq("nickname", nickname)
            .neq("id", currentUserId || "")
            .maybeSingle(); // single 대신 maybeSingle 사용

        if (error) {
            console.error("닉네임 체크 오류:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // data가 있으면 중복
        const available = !data;

        return NextResponse.json({ available });
    } catch (err: any) {
        console.error("서버 오류:", err);
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}