"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabaseClient";

export default function AuthCallbackClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createSupabaseClient();
  const [message, setMessage] = useState("로그인 처리 중...");

  useEffect(() => {
    async function handleCallback() {
      try {
        const type = searchParams.get("type");
        const hash = window.location.hash;

        // ========================================
        // 1️⃣ 네이버 로그인 (OTP 방식)
        // ========================================
        if (type === "naver") {
          const tokenHash = searchParams.get("token_hash");
          const email = searchParams.get("email");

          if (!tokenHash || !email) {
            router.replace("/auth/login");
            return;
          }

          console.log("🔐 네이버 OTP 인증 중...");

          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: "magiclink",
          });

          if (error) {
            console.error("❌ 네이버 인증 실패:", error);
            router.replace("/auth/login?error=naver_failed");
            return;
          }

          console.log("✅ 네이버 로그인 완료");

          // profiles 체크 후 리다이렉트
          await checkProfileAndRedirect();
          return;
        }

        // ========================================
        // 2️⃣ 구글 로그인 (해시 토큰 방식)
        // ========================================
        if (hash.includes("access_token")) {
          console.log("🔐 구글 로그인 처리 중...");

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

          console.log("✅ 구글 로그인 완료");

          // profiles 체크 후 리다이렉트
          await checkProfileAndRedirect();
          return;
        }

        // ========================================
        // 3️⃣ 이메일 인증 (일반 회원가입)
        // ========================================
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          // 인증 완료 표시
          await fetch("/api/auth/mark-verified", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: session.user.id,
              email: session.user.email
            }),
          });
        }

        setMessage("✅ 이메일 인증이 완료되었습니다!\n\n이 창을 닫고 원래 창으로 돌아가주세요.");

        // 자동 닫기
        setTimeout(() => {
          if (window.opener || window.history.length > 1) {
            window.close();
          } else {
            setMessage("✅ 이메일 인증이 완료되었습니다!\n\n창을 직접 닫아주세요.");
          }
        }, 3000);

      } catch (err) {
        console.error("콜백 오류:", err);
        setMessage("오류가 발생했습니다.");
        setTimeout(() => router.replace("/auth/login"), 3000);
      }
    }

    // ========================================
    // profiles 체크 후 리다이렉트 함수
    // ========================================
    async function checkProfileAndRedirect() {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/auth/login");
        return;
      }

      // profiles 조회
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, name, phone_number")
        .eq("id", session.user.id)
        .single();

      // profiles 없으면 생성 (Trigger 실패 대비)
      if (profileError && profileError.code === "PGRST116") {
        await supabase.from("profiles").insert({
          id: session.user.id,
          email: session.user.email,
          name: "temp",
          nickname: null,
          phone_number: "temp",
          user_type: "personal",
          role: "user",
        });

        router.replace("/auth/onboarding");
        return;
      }

      // role 기반 리다이렉트
      if (profile?.role === "admin") {
        router.replace("/admin");
        return;
      }

      if (profile?.role === "agent_pending" || profile?.role === "agent") {
        router.replace("/");
        return;
      }

      // 프로필 완성 체크
      const isMissing =
        !profile ||
        !profile.name ||
        profile.name === "temp" ||
        !profile.phone_number ||
        profile.phone_number === "temp";

      if (isMissing) {
        router.replace("/auth/onboarding");
      } else {
        router.replace("/");
      }
    }

    handleCallback();
  }, [router, searchParams, supabase]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--oboon-bg-page)" }}>
      <div className="text-center p-8 rounded-xl border shadow-card max-w-md" style={{ backgroundColor: "var(--oboon-bg-surface)", borderColor: "var(--oboon-border-default)" }}>
        <p className="font-medium whitespace-pre-line text-lg" style={{ color: "var(--oboon-text-body)" }}>
          {message}
        </p>
        {!window.location.hash.includes("access_token") && !searchParams.get("type") && (
          <p className="text-sm mt-4" style={{ color: "var(--oboon-text-muted)" }}>
            자동으로 닫히지 않으면 직접 닫아주세요.
          </p>
        )}
      </div>
    </div>
  );
}