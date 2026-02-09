import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(req: Request) {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");

    if (!code) {
        return NextResponse.redirect(new URL("/auth/login?error=no_code", process.env.NEXT_PUBLIC_SITE_URL!));
    }

    const cookieStore = await cookies();

    // 1. SSR 클라이언트 생성 (PKCE 자동 처리)
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) => {
                            cookieStore.set(name, value, options);
                        });
                    } catch {
                        // 읽기 전용 컨텍스트에서는 무시
                    }
                },
            },
        }
    );

    try {
        // 2. 코드로 세션 교환 (PKCE 자동 처리)
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);

        if (error || !data.user) {
            console.error("❌ 세션 교환 실패:", error);

            // banned 계정인 경우 (기존 탈퇴 계정) 복구 페이지로 리다이렉트
            if (error?.message?.toLowerCase().includes("banned")) {
                return NextResponse.redirect(
                    new URL("/auth/login?error=banned", process.env.NEXT_PUBLIC_SITE_URL!)
                );
            }

            return NextResponse.redirect(new URL("/auth/login?error=session_failed", process.env.NEXT_PUBLIC_SITE_URL!));
        }

        const user = data.user;
        // 3. profiles 확인 (anon key로 조회) - deleted_at 포함
        const { data: profile } = await supabase
            .from("profiles")
            .select("role, name, phone_number, deleted_at, email")
            .eq("id", user.id)
            .single();

        // 4. 탈퇴한 계정인지 확인 (deleted_at이 설정된 경우)
        if (profile?.deleted_at) {
            // 세션 제거 후 복구 페이지로 리다이렉트
            await supabase.auth.signOut();
            return NextResponse.redirect(
                new URL(`/auth/restore?userId=${user.id}&email=${encodeURIComponent(user.email || "")}`, process.env.NEXT_PUBLIC_SITE_URL!)
            );
        }

        let redirectPath = "/";

        // 4. profiles 없으면 온보딩
        if (!profile) {
            redirectPath = "/auth/onboarding";
        } else {
            // 5. role 체크
            if (profile.role === "admin") {
                redirectPath = "/admin";
            } else {
                // 6. 프로필 완성 체크
                const isMissing =
                    !profile.name ||
                    profile.name === "temp" ||
                    !profile.phone_number ||
                    profile.phone_number === "temp";

                if (isMissing) {
                    redirectPath = "/auth/onboarding";
                } else {
                    redirectPath = "/";
                }
            }
        }

        // 7. 리다이렉트 (쿠키는 이미 설정됨)
        return NextResponse.redirect(new URL(redirectPath, process.env.NEXT_PUBLIC_SITE_URL!));

    } catch (error: any) {
        console.error("❌ Google OAuth 오류:", error);
        return NextResponse.redirect(new URL("/auth/login?error=unknown", process.env.NEXT_PUBLIC_SITE_URL!));
    }
}
