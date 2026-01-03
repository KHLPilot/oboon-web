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
        console.log("📧 구글 코드 수신:", code.substring(0, 10) + "...");

        // 1. 코드를 사용해 Supabase에서 유저 정보 가져오기
        // pkce 방식으로 처리
        const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.exchangeCodeForSession(code);

        if (sessionError || !sessionData?.user) {
            console.error("❌ 세션 교환 실패:", sessionError);

            // 코드 만료 등의 경우 로그인 페이지로
            return NextResponse.redirect(new URL("/auth/login?error=session_failed", process.env.NEXT_PUBLIC_SITE_URL!));
        }

        const user = sessionData.user;
        const session = sessionData.session;

        console.log("✅ 구글 로그인 성공:", user.email);

        // 2. profiles 확인
        const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("role, name, phone_number")
            .eq("id", user.id)
            .single();

        console.log("📋 프로필 조회 결과:", {
            exists: !!profile,
            name: profile?.name,
            phone_number: profile?.phone_number,
            role: profile?.role
        });

        let redirectPath = "/";

        // 3. profiles 없으면 온보딩
        if (!profile) {
            console.log("🆕 신규 유저 - 온보딩으로");
            redirectPath = "/auth/onboarding";
        } else {
            // 4. role 체크
            if (profile.role === "admin") {
                console.log("👑 관리자 - 관리자 페이지로");
                redirectPath = "/admin";
            } else {
                // 5. 프로필 완성 체크
                const isMissing =
                    !profile.name ||
                    profile.name === "temp" ||
                    !profile.phone_number ||
                    profile.phone_number === "temp";

                console.log("🔍 프로필 완성 체크:", {
                    name: profile.name,
                    name_is_temp: profile.name === "temp",
                    phone_number: profile.phone_number,
                    phone_is_temp: profile.phone_number === "temp",
                    isMissing: isMissing
                });

                if (isMissing) {
                    console.log("🔄 프로필 미완성 - 온보딩으로");
                    redirectPath = "/auth/onboarding";
                } else {
                    console.log("✅ 프로필 완성 - 홈으로");
                    redirectPath = "/";
                }
            }
        }

        // 6. 쿠키 설정 후 리다이렉트
        const response = NextResponse.redirect(new URL(redirectPath, process.env.NEXT_PUBLIC_SITE_URL!));

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

        console.log(`✅ ${redirectPath}로 리다이렉트`);
        return response;

    } catch (error: any) {
        console.error("❌ Google OAuth 오류:", error);
        return NextResponse.redirect(new URL("/auth/login?error=unknown", process.env.NEXT_PUBLIC_SITE_URL!));
    }
}