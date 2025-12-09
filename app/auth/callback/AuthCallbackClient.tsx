"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabaseClient";

export default function AuthCallback() {
  const supabase = createSupabaseClient();
  const router = useRouter();

  useEffect(() => {
    async function run() {
      // 1️⃣ 세션 자동 저장됐는지 확인
      let { data } = await supabase.auth.getUser();

      if (!data.user) {
        // 🔥 300ms 기다린 뒤 다시 한 번 체크 (Google/Naver 모두 해결되는 패턴)
        await new Promise((r) => setTimeout(r, 300));
        const retry = await supabase.auth.getUser();

        if (!retry.data.user) {
          router.replace("/login");
          return;
        }

        data = retry.data;
      }

      // 2️⃣ 프로필 존재 여부 확인
      const res = await fetch("/api/auth/ensure-profile", { cache: "no-store" });
      const result = await res.json();

      if (result.needOnboarding) router.replace("/onboarding");
      else router.replace("/");
    }

    run();
  }, []);

  return <p className="text-white">로그인 처리 중...</p>;
}