// app/auth/callback/page.tsx
"use client";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

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

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          console.error("세션 저장 실패:", error);
          router.replace("/login");
          return;
        }
      }

      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.replace("/login");
        return;
      }

      const res = await fetch("/api/auth/ensure-profile");
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