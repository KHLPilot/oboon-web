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
      /**
       * 1️⃣ 소셜 로그인 해시 처리
       */
      const hash = window.location.hash;
      const isSocialLogin = hash.includes("access_token");

      if (isSocialLogin) {
        const params = new URLSearchParams(hash.substring(1));
        const access_token = params.get("access_token");
        const refresh_token = params.get("refresh_token");

        if (access_token && refresh_token) {
          await supabase.auth.setSession({ access_token, refresh_token });
          // URL 정리
          window.history.replaceState(null, "", "/auth/callback");
        }
      }

      /**
       * 2️⃣ 세션 확인
       */
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/auth/login");
        return;
      }

      /**
       * 3️⃣ 이메일 인증 링크 클릭(일반 회원가입)인 경우
       * → 리다이렉트 안 하고 창 닫기 안내만
       */
      if (!isSocialLogin) {
        setMessage("이메일 인증이 완료되었습니다. 이 창을 닫고 원래 창으로 돌아가주세요.");
        setTimeout(() => {
          if (window.opener || window.history.length > 1) {
            window.close();
          }
        }, 3000);
        return;
      }

      /**
       * 4️⃣ 🔥 핵심: profiles 직접 조회 (role 기준 분기)
       */
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, name, phone_number")
        .eq("id", session.user.id)
        .single();

      /**
       * 5️⃣ role 기반 분기
       */

      // ✅ 관리자
      if (profile?.role === "admin") {
        router.replace("/admin");
        return;
      }

      // ✅ 대행사 직원 (대기 or 승인)
      if (profile?.role === "agent_pending" || profile?.role === "agent") {
        router.replace("/");
        return;
      }

      // ✅ 일반 유저만 온보딩 체크
      const isMissingInfo =
        !profile ||
        !profile.name ||
        profile.name === "temp" ||
        !profile.phone_number;

      if (isMissingInfo) {
        router.replace("/auth/onboarding");
      } else {
        router.replace("/");
      }
    }

    run();
  }, [router, supabase]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
      <div className="text-center p-8 bg-slate-900 rounded-xl border border-slate-800 shadow-xl">
        <p className="font-medium">{message}</p>
        {!window.location.hash.includes("access_token") && (
          <p className="text-xs text-slate-500 mt-2">
            자동으로 닫히지 않으면 직접 닫아주세요.
          </p>
        )}
      </div>
    </div>
  );
}
