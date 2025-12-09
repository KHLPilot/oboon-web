//app/auth/callback/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabaseClient";

export default function AuthCallback() {
  const router = useRouter();
  const supabase = createSupabaseClient();

  useEffect(() => {
    async function run() {
      // 토큰이 URL 해시에 있는 경우 자동으로 세션 저장됨
      const { data } = await supabase.auth.getUser();

      if (data.user) {
        // 서버에서 프로필 생성
        await fetch("/api/auth/ensure-profile");

        router.replace("/"); // 홈으로
      } else {
        router.replace("/login");
      }
    }

    run();
  }, []);

  return <p>로그인 처리 중...</p>;
}
