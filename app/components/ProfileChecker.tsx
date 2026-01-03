"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabaseClient";

export default function ProfileChecker() {
    const router = useRouter();
    const pathname = usePathname();
    const supabase = createSupabaseClient();

    useEffect(() => {
        async function checkProfile() {
            // ✅ auth 페이지는 체크 안함 (무한 루프 방지)
            if (pathname?.startsWith("/auth")) {
                return;
            }

            // 1. 세션 확인
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                // 로그인 안됨 → 체크 불필요
                return;
            }

            // 2. 프로필 확인
            const { data: profile } = await supabase
                .from("profiles")
                .select("name, phone_number")
                .eq("id", session.user.id)
                .single();

            // 3. 프로필 미완성 → 온보딩으로
            if (!profile ||
                !profile.name ||
                profile.name === "temp" ||
                !profile.phone_number ||
                profile.phone_number === "temp") {
                console.log("🔄 프로필 미완성 - 온보딩으로 이동");
                router.replace("/auth/onboarding");
            }
        }

        checkProfile();
    }, [pathname, router, supabase]);

    return null; // UI 없음
}