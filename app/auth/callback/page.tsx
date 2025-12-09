// app/auth/callback/page.tsx
"use client";

export const dynamic = "force-dynamic";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabaseClient";

export default function AuthCallback() {
  const router = useRouter();
  const supabase = createSupabaseClient();
  const params = useSearchParams();

  useEffect(() => {
    async function run() {
      const code = params.get("code");

      // 1) URL에 auth code 있을 때만 세션 교환
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          console.error("세션 저장 실패:", error);
          router.replace("/login");
          return;
        }
      }

      // 2) 세션 확인
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.replace("/login");
        return;
      }

      // 3) 프로필 + 온보딩 여부 확인 (캐시 사용 안 하도록 옵션 추가)
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
  }, [params, router, supabase]);

  return <p style={{ color: "white" }}>로그인 처리 중...</p>;
}
