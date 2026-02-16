// components/ProfileChecker.tsx

"use client";

import { useEffect, useMemo, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabaseClient";

export default function ProfileChecker() {
    const router = useRouter();
    const pathname = usePathname();
    const supabase = useMemo(() => createSupabaseClient(), []);
    const checkedRef = useRef(false);

    useEffect(() => {
        // /auth 경로는 모두 건너뛰기 (온보딩 포함)
        if (pathname.startsWith("/auth")) {
            return;
        }

        // 이미 프로필 확인 완료 시 스킵
        if (checkedRef.current) return;

        async function checkProfile() {
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                return;
            }

            const { data: profile } = await supabase
                .from("profiles")
                .select("name, phone_number")
                .eq("id", session.user.id)
                .single();

            // temp 값 체크
            const isMissing =
                !profile ||
                !profile.name ||
                profile.name === "temp" ||
                !profile.phone_number ||
                profile.phone_number === "temp";

            if (isMissing) {
                router.replace("/auth/onboarding");
            } else {
                checkedRef.current = true;
            }
        }

        checkProfile();
    }, [pathname, router, supabase]);

    return null;
}
