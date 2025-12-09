"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabaseClient";

export default function AuthCallbackClient() {
  const router = useRouter();
  const supabase = createSupabaseClient();

  useEffect(() => {
    async function run() {
      // ============================================
      // 1) NAVER magic link (#access_token) 처리
      // ============================================
      const hash = window.location.hash;

      if (hash.includes("access_token")) {
        const params = new URLSearchParams(hash.substring(1)); // '#' 제거
        const access_token = params.get("access_token");
        const refresh_token = params.get("refresh_token");

        if (access_token && refresh_token) {
          await supabase.auth.setSession({
            access_token,
            refresh_token,
          });

          // URL에서 해시 제거
          window.history.replaceState(null, "", "/auth/callback");
        }
      }

      // ============================================
      // 2) 세션 확인
      // ============================================
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      // ============================================
      // 3) 프로필 확인 (온보딩 여부 체크)
      // ============================================
      const res = await fetch("/api/auth/ensure-profile", {
        cache: "no-store",
      });

      const result = await res.json();

      if (result.needOnboarding) {
        router.replace("/onboarding");
      } else {
        router.replace("/");
      }
    }

    run();
  }, []);

  return <p className="text-white">로그인 처리 중...</p>;
}