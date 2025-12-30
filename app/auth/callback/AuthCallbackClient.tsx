"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabaseClient";

export default function AuthCallbackClient() {
  const router = useRouter();
  const supabase = createSupabaseClient();
  const [message, setMessage] = useState("로그인 처리 중...");

  useEffect(() => {
    async function run() {
      const hash = window.location.hash;
      const isSocialLogin = hash.includes("access_token");

      // 1. 해시 토큰 처리 (소셜 로그인)
      if (isSocialLogin) {
        const params = new URLSearchParams(hash.substring(1));
        const access_token = params.get("access_token");
        const refresh_token = params.get("refresh_token");

        if (access_token && refresh_token) {
          await supabase.auth.setSession({ access_token, refresh_token });
          window.history.replaceState(null, "", "/auth/callback");
        }
      }

      // 2. 세션 확인
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/auth/login");
        return;
      }

      /**
       * 핵심 수정 부분: 이메일 가입 새 창 닫기 로직
       * 1. 소셜 로그인이 아니면서 (일반 이메일 인증 링크 클릭)
       * 2. 창이 여러 개 떠 있는 상태라면 (회원가입 중인 기존 창이 존재함)
       */
      if (!isSocialLogin) {
        setMessage("인증이 완료되었습니다. 이 창을 닫고 원래 창으로 돌아가주세요!");
        // 3초 뒤 자동 닫기 시도
        setTimeout(() => {
          if (window.opener || window.history.length > 1) {
            window.close();
          }
        }, 3000);
        return; // 여기서 멈춤 (리다이렉트 안 함)
      }

      // 3. 소셜 로그인의 경우 기존 로직 수행 (프로필 확인 및 온보딩)
      const res = await fetch("/api/auth/ensure-profile", {
        headers: { Authorization: `Bearer ${session.access_token}` },
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
  }, [supabase, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
      <div className="text-center p-8 bg-slate-900 rounded-xl border border-slate-800 shadow-xl">
        <p className="font-medium">{message}</p>
        {!window.location.hash.includes("access_token") && (
          <p className="text-xs text-slate-500 mt-2">자동으로 닫히지 않으면 직접 닫아주세요.</p>
        )}
      </div>
    </div>
  );
}