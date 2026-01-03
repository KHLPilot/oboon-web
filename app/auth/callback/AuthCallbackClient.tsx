"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabaseClient";

export default function AuthCallbackClient() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseClient(), []);
  const [message, setMessage] = useState("로그인 처리 중...");

  useEffect(() => {
    async function run() {
      try {
        // 1. 소셜 로그인 해시 처리
        const hash = window.location.hash;
        const isSocialLogin = hash.includes("access_token");

        if (isSocialLogin) {
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
        }

        // 2. 세션 확인
        const { data: { session } } = await supabase.auth.getSession();

        // ✅ 이메일 인증 링크 클릭 케이스 (일반 회원가입)
        if (!isSocialLogin) {
          // 세션이 있으면 서버에 인증 완료 표시
          if (session?.user) {
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

          // ✅ 자동 닫기만 시도, 실패해도 리다이렉트 안함
          setTimeout(() => {
            if (window.opener || window.history.length > 1) {
              window.close();
            } else {
              setMessage("✅ 이메일 인증이 완료되었습니다!\n\n창을 직접 닫아주세요. (회원가입 창으로 돌아가세요)");
            }
          }, 3000);

          return; // ✅ 여기서 완전히 종료
        }

        // 3. 소셜 로그인인 경우에만 세션 필수
        if (!session) {
          router.replace("/auth/login");
          return;
        }

        // 4. profiles 조회
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, name, phone_number")
          .eq("id", session.user.id)
          .single();

        // 5. role 기반 분기
        if (profile?.role === "admin") {
          router.replace("/admin");
          return;
        }

        if (profile?.role === "agent_pending" || profile?.role === "agent") {
          router.replace("/");
          return;
        }

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
      } catch (err) {
        console.error("AuthCallback error:", err);
        setMessage("오류가 발생했습니다. 창을 닫고 다시 시도해주세요.");
      }
    }

    run();
  }, [router, supabase]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--oboon-bg-page)" }}>
      <div className="text-center p-8 rounded-xl border shadow-card max-w-md" style={{ backgroundColor: "var(--oboon-bg-surface)", borderColor: "var(--oboon-border-default)" }}>
        <p className="font-medium whitespace-pre-line text-lg" style={{ color: "var(--oboon-text-body)" }}>
          {message}
        </p>
        {!window.location.hash.includes("access_token") && (
          <p className="text-sm mt-4" style={{ color: "var(--oboon-text-muted)" }}>
            자동으로 닫히지 않으면 직접 닫아주세요.
          </p>
        )}
      </div>
    </div>
  );
}