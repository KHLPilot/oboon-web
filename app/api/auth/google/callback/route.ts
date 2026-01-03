import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(req: Request) {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");

    if (!code) {
        return NextResponse.redirect(new URL("/auth/login?error=no_code", process.env.NEXT_PUBLIC_SITE_URL!));
    }

    const cookieStore = cookies();

    // 1. SSR 클라이언트 생성 (PKCE 자동 처리)
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value;
                },
                set(name: string, value: string, options: any) {
                    cookieStore.set({ name, value, ...options });
                },
                remove(name: string, options: any) {
                    cookieStore.set({ name, value: "", ...options });
                },
            },
        }
    );

    try {
        console.log("📧 구글 코드 수신:", code.substring(0, 10) + "...");

        // 2. 코드로 세션 교환 (PKCE 자동 처리)
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);

        if (error || !data.user) {
            console.error("❌ 세션 교환 실패:", error);
            return NextResponse.redirect(new URL("/auth/login?error=session_failed", process.env.NEXT_PUBLIC_SITE_URL!));
        }

        const user = data.user;
        console.log("✅ 구글 로그인 성공:", user.email);

        // 3. profiles 확인 (anon key로 조회)
        const { data: profile } = await supabase
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

        // 4. profiles 없으면 온보딩
        if (!profile) {
            console.log("🆕 신규 유저 - 온보딩으로");
            redirectPath = "/auth/onboarding";
        } else {
            // 5. role 체크
            if (profile.role === "admin") {
                console.log("👑 관리자 - 관리자 페이지로");
                redirectPath = "/admin";
            } else {
                // 6. 프로필 완성 체크
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

        console.log(`✅ ${redirectPath}로 리다이렉트`);

        // 7. 리다이렉트 (쿠키는 이미 설정됨)
        return NextResponse.redirect(new URL(redirectPath, process.env.NEXT_PUBLIC_SITE_URL!));

    } catch (error: any) {
        console.error("❌ Google OAuth 오류:", error);
        return NextResponse.redirect(new URL("/auth/login?error=unknown", process.env.NEXT_PUBLIC_SITE_URL!));
    }
}