"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabaseClient";

export default function AuthCallbackClient() {
  const router = useRouter();
  const supabase = createSupabaseClient();

  useEffect(() => {
    async function run() {
      // 1. 해시 토큰 처리 (네이버 포함)
      const hash = window.location.hash;

      if (hash.includes("access_token")) {
        const params = new URLSearchParams(hash.substring(1));
        const access_token = params.get("access_token");
        const refresh_token = params.get("refresh_token");

        if (access_token && refresh_token) {
          await supabase.auth.setSession({
            access_token,
            refresh_token,
          });

          window.history.replaceState(null, "", "/auth/callback");
        }
      }

      // 2. 세션 확인
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/auth/login");
        return;
      }

      // 3. ensure-profile 호출 (Bearer 토큰 전달)
      const res = await fetch("/api/auth/ensure-profile", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        cache: "no-store",
      });

      const result = await res.json();

      if (result.needOnboarding) {
        router.replace("/auth/onboarding");
      } else {
        router.replace("/");
      }
    }

    run();
  }, []);

  return <p className="text-white">로그인 처리 중...</p>;
}
