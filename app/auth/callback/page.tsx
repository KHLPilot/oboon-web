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
      const { data } = await supabase.auth.getUser();

      if (data.user) {
        await fetch("/api/auth/ensure-profile");
        router.replace("/");
      } else {
        router.replace("/login");
      }
    }

    run();
  }, []);

  return <p style={{ color: "white" }}>로그인 처리 중...</p>;
}