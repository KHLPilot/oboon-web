// app/api/profile/check-nickname/route.ts

import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { createSupabaseServer } from "@/lib/supabaseServer";

const supabaseAdmin = createSupabaseAdminClient();

export async function POST(req: Request) {
    try {
        const supabase = await createSupabaseServer();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
        }

        const { nickname } = await req.json();

        // 닉네임이 없으면 사용 가능
        if (!nickname || nickname.trim() === "") {
            return NextResponse.json({ available: true });
        }

        // 닉네임 중복 체크 (본인 제외 — 서버에서 검증된 user.id 사용)
        const { data, error } = await supabaseAdmin
            .from("profiles")
            .select("id")
            .eq("nickname", nickname)
            .neq("id", user.id)
            .maybeSingle();

        if (error) {
            console.error("닉네임 체크 오류:", error);
            return NextResponse.json({ error: "서버 오류" }, { status: 500 });
        }

        // data가 있으면 중복
        const available = !data;

        return NextResponse.json({ available });
    } catch (err: unknown) {
        console.error("서버 오류:", err);
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}