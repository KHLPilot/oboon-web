import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const token = body.token;

        console.log("🔍 [API] 인증 확인 요청 - 토큰:", token ? "있음" : "없음");

        if (!token) {
            console.log("❌ [API] 토큰 없음");
            return NextResponse.json({ verified: false }, { status: 400 });
        }

        // 1. 토큰으로 레코드 조회
        const { data: tokenData, error: tokenError } = await supabaseAdmin
            .from("verification_tokens")
            .select("*")
            .eq("token", token)
            .single();

        if (tokenError || !tokenData) {
            console.log("❌ [API] 토큰 레코드 없음:", tokenError);
            return NextResponse.json({ verified: false });
        }

        console.log("📋 [API] 토큰 데이터:", {
            user_id: tokenData.user_id,
            email: tokenData.email,
            verified: tokenData.verified,
            expires_at: tokenData.expires_at
        });

        // 2. 만료 체크
        if (new Date(tokenData.expires_at) < new Date()) {
            console.log("⏰ [API] 토큰 만료");
            return NextResponse.json({ verified: false, error: "토큰 만료" });
        }

        // 3. 이미 verified면 바로 리턴
        if (tokenData.verified) {
            console.log("✅ [API] 이미 verified=true");
            return NextResponse.json({
                verified: true,
                userId: tokenData.user_id,
                email: tokenData.email,
            });
        }

        // 4. Supabase Auth에서 실제 인증 상태 확인
        console.log("🔍 [API] Supabase Auth 확인 중...");
        const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(
            tokenData.user_id
        );

        console.log("👤 [API] 유저 정보:", {
            id: user?.id,
            email: user?.email,
            email_confirmed_at: user?.email_confirmed_at
        });

        if (user && user.email_confirmed_at) {
            console.log("✅ [API] 이메일 인증 확인됨! 토큰 업데이트...");

            // 인증 완료됨 → 토큰 업데이트
            await supabaseAdmin
                .from("verification_tokens")
                .update({ verified: true })
                .eq("token", token);

            return NextResponse.json({
                verified: true,
                userId: tokenData.user_id,
                email: tokenData.email,
            });
        }

        console.log("⏳ [API] 아직 미인증");
        // 아직 미인증
        return NextResponse.json({ verified: false });
    } catch (err: any) {
        console.error("❌ [API] 확인 오류:", err);
        return NextResponse.json({ verified: false, error: err.message });
    }
}