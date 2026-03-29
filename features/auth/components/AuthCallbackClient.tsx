"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabaseClient";

import PageContainer from "@/components/shared/PageContainer";
import Card from "@/components/ui/Card";

export default function AuthCallbackClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createSupabaseClient();
  const [message, setMessage] = useState("처리 중...");

  const type = useMemo(() => searchParams.get("type"), [searchParams]);
  const isSocial = Boolean(type);

  useEffect(() => {
    async function handleCallback() {
      try {
        // ========================================
        // 1) 네이버 로그인 (OTP 방식)
        // ========================================
        if (type === "naver") {
          const tokenHash = searchParams.get("token_hash");

          if (!tokenHash) {
            router.replace("/auth/login");
            return;
          }

          setMessage("네이버 로그인 처리 중...");

          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: "magiclink",
          });

          if (error) {
            router.replace("/auth/login?error=naver_failed");
            return;
          }

          await checkProfileAndRedirect();
          return;
        }

        // ========================================
        // 2) 이메일 인증 (일반 회원가입)
        // ========================================
        setMessage("이메일 인증 처리 중...");

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          await fetch("/api/auth/mark-verified", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: session.user.id,
              email: session.user.email,
            }),
          });
        }

        setMessage("이메일 인증이 완료되었습니다!\n 원래 창으로 돌아가주세요.");

        setTimeout(() => {
          if (window.opener || window.history.length > 1) {
            window.close();
          } else {
            setMessage("이메일 인증이 완료되었습니다!\n 창을 직접 닫아주세요.");
          }
        }, 3000);
      } catch {
        console.error("[auth/callback] callback", {
          status: 500,
          message: "callback failed",
        });
        setMessage("오류가 발생했습니다.");
        setTimeout(() => router.replace("/auth/login"), 3000);
      }
    }

    async function checkProfileAndRedirect() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/auth/login");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, name, phone_number, deleted_at")
        .eq("id", session.user.id)
        .single();

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

      if (profile?.deleted_at) {
        const restoreSessionRes = await fetch("/api/auth/create-restore-session", {
          method: "POST",
        });
        const restoreSessionData = await restoreSessionRes.json();
        await supabase.auth.signOut();

        if (!restoreSessionRes.ok || typeof restoreSessionData?.sessionKey !== "string") {
          router.replace("/auth/login?error=auth_failed");
          return;
        }

        router.replace(
          `/auth/restore?s=${encodeURIComponent(restoreSessionData.sessionKey)}`,
        );
        return;
      }

      if (profile?.role === "admin") {
        router.replace("/admin");
        return;
      }

      const isMissing =
        !profile ||
        !profile.name ||
        profile.name === "temp" ||
        !profile.phone_number ||
        profile.phone_number === "temp";

      router.replace(isMissing ? "/auth/onboarding" : "/");
    }

    handleCallback();
  }, [router, searchParams, supabase, type]);

  return (
    <main className="min-h-dvh overflow-x-hidden bg-(--oboon-bg-page) text-(--oboon-text-title)">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(1200px_600px_at_50%_0%,rgba(64,112,255,0.18),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(800px_500px_at_50%_30%,rgba(0,200,180,0.10),transparent_65%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(900px_700px_at_50%_100%,rgba(255,255,255,0.06),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_40%,rgba(0,0,0,0.55)_100%)]" />
      </div>

      <PageContainer variant="full" className="relative overflow-hidden">
        <div className="w-full max-w-105 -translate-y-4 sm:translate-y-0">
          {/* Header (로그인 페이지 톤) */}
          <div className="mb-4 sm:mb-5 text-center">
            <div className="ob-typo-h1 tracking-[-0.02em] text-(--oboon-text-title)">
              {isSocial ? "로그인 처리 중" : "이메일 인증"}
            </div>

            <p className="mt-0.5 sm:mt-1 ob-typo-h4 leading-[1.6] text-(--oboon-text-muted)">
              {isSocial
                ? "잠시만 기다려주세요."
                : "인증이 완료되면 안내가 표시됩니다."}
            </p>
          </div>

          {/* Card */}
          <Card className="border border-(--oboon-border-default) p-6">
            <p className="ob-typo-h3 text-center whitespace-pre-line leading-[1.6] space-y-2 text-(--oboon-text-body)">
              {message.split("\n").map((line, i) => (
                <span key={i} className="block">
                  {line}
                </span>
              ))}
            </p>

            {!isSocial ? (
              <p className="mt-3 ob-typo-caption text-center text-(--oboon-text-muted)">
                자동으로 닫히지 않으면 직접 닫아주세요.
              </p>
            ) : null}
          </Card>
        </div>
      </PageContainer>
    </main>
  );
}
