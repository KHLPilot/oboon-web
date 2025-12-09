// app/auth/callback/AuthCallbackClient.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabaseClient";

export default function AuthCallbackClient() {
  const router = useRouter();
  const supabase = createSupabaseClient();

  useEffect(() => {
    async function run() {
      // 1) Supabase가 URL hash(code/token) 자동 파싱 → 세션 저장하기 때문에
      // 여기서는 getUser()만 확인하면 됨
      const { data } = await supabase.auth.getUser();

      if (!data.user) {
        router.replace("/login");
        return;
      }

      // 2) 온보딩 필요 여부 확인
      const res = await fetch("/api/auth/ensure-profile", {
        cache: "no-store",
      });
      const result = await res.json();

      if (result.needOnboarding) router.replace("/onboarding");
      else router.replace("/");
    }

    run();
  }, []);

  return <p className="text-white">로그인 처리 중...</p>;
}