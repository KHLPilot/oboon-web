import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");

    if (!code) {
        return NextResponse.redirect(new URL("/auth/login?error=no_code", process.env.NEXT_PUBLIC_SITE_URL!));
    }

    try {
        // 1. Supabase에서 코드로 세션 교환
        const { data, error } = await supabaseAdmin.auth.exchangeCodeForSession(code);

        if (error || !data.session) {
            console.error("❌ Google 세션 교환 실패:", error);
            return NextResponse.redirect(new URL("/auth/login?error=session_failed", process.env.NEXT_PUBLIC_SITE_URL!));
        }

        const { session, user } = data;
        console.log("✅ Google 로그인 성공:", user.email);

        // 2. profiles 확인
        const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("role, name, phone_number")
            .eq("id", user.id)
            .single();

        // 3. profiles 없으면 생성 (Trigger 실패 대비)
        if (!profile) {
            await supabaseAdmin.from("profiles").insert({
                id: user.id,
                email: user.email,
                name: "temp",
                nickname: null,
                phone_number: "temp",
                user_type: "personal",
                role: "user",
            });

            // 세션 쿠키 설정 후 온보딩으로
            const response = NextResponse.redirect(new URL("/auth/onboarding", process.env.NEXT_PUBLIC_SITE_URL!));
            setAuthCookies(response, session);
            return response;
        }

        // 4. role 기반 리다이렉트
        if (profile.role === "admin") {
            const response = NextResponse.redirect(new URL("/admin", process.env.NEXT_PUBLIC_SITE_URL!));
            setAuthCookies(response, session);
            return response;
        }

        // 5. 프로필 완성 체크
        const isMissing =
            !profile.name ||
            profile.name === "temp" ||
            !profile.phone_number ||
            profile.phone_number === "temp";

        const redirectPath = isMissing ? "/auth/onboarding" : "/";
        const response = NextResponse.redirect(new URL(redirectPath, process.env.NEXT_PUBLIC_SITE_URL!));
        setAuthCookies(response, session);

        console.log(`✅ ${redirectPath}로 리다이렉트`);
        return response;

    } catch (error: any) {
        console.error("❌ Google OAuth 오류:", error);
        return NextResponse.redirect(new URL("/auth/login?error=unknown", process.env.NEXT_PUBLIC_SITE_URL!));
    }
}

// 쿠키 설정 헬퍼
function setAuthCookies(response: NextResponse, session: any) {
    response.cookies.set({
        name: "sb-access-token",
        value: session.access_token,
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7, // 7일
    });

    response.cookies.set({
        name: "sb-refresh-token",
        value: session.refresh_token,
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30, // 30일
    });
}