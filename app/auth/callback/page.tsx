"use client";

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

      // URL에 code 있을 때만 세션 교환
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          console.error("세션 저장 실패:", error);
          router.replace("/login");
          return;
        }
      }

      // 세션 얻기
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.replace("/login");
        return;
      }

      // 프로필 생성 체크 → 온보딩 여부 판단
      const res = await fetch("/api/auth/ensure-profile");
      const result = await res.json();

      if (result.needOnboarding) {
        router.replace("/onboarding");
      } else {
        router.replace("/");
      }
    }

    run();
  }, []);

  return <p style={{ color: "white" }}>로그인 처리 중...</p>;
}