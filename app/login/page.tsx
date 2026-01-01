"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import PageContainer from "@/components/shared/PageContainer";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Label from "@/components/ui/Label";

import { createSupabaseClient } from "@/lib/supabaseClient";

type Mode = "login" | "signup";

function cx(...v: (string | false | null | undefined)[]) {
  return v.filter(Boolean).join(" ");
}

export default function LoginPage() {
  const supabase = createSupabaseClient();
  const router = useRouter();
  const sp = useSearchParams();

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const redirect = useMemo(() => sp.get("redirect"), [sp]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) setError(error.message);
        else setMessage("?뺤씤 ?대찓?쇱씠 諛쒖넚?섏뿀?듬땲?? ?대찓?쇱쓣 ?뺤씤?댁＜?몄슂.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          setError(error.message);
        } else {
          const next = redirect
            ? `/api/auth/ensure-profile?redirect=${encodeURIComponent(
                redirect
              )}`
            : "/api/auth/ensure-profile";
          router.push(next);
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "\uB85C\uADF8\uC778 \uCC98\uB9AC \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4\.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleOAuthLogin(provider: "google" | "kakao") {
    setLoading(true);
    setError(null);
    setMessage(null);

    const origin = window.location.origin;
    const callbackUrl = redirect
      ? `${origin}/auth/callback?redirect=${encodeURIComponent(redirect)}`
      : `${origin}/auth/callback`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: callbackUrl },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    }
  }

  function handleNaverLogin() {
    const qs = redirect ? `?redirect=${encodeURIComponent(redirect)}` : "";
    window.location.href = `/api/auth/naver/login${qs}`;
  }

  return (
    <main className="bg-(--oboon-bg-page)">
      <PageContainer className="pt-10 pb-10">
        <div className="mx-auto w-full max-w-[420px]">
          {/* ?ㅻ뜑 */}
          <div className="mb-5">
            <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-(--oboon-text-title)">
              {mode === "login" ? "\uB85C\uADF8\uC778" : "\uD68C\uC6D0\uAC00\uC785"}
            </h1>
            <p className="mt-1 text-[14px] leading-[1.6] text-(--oboon-text-muted)">
              OBOON 遺꾩뼇 ?뚮옯?쇱뿉 {mode === "login" ? "\uB85C\uADF8\uC778" : "\uD68C\uC6D0\uAC00\uC785"}{" "}
              ?댁＜?몄슂.
            </p>
          </div>

          {/* 移대뱶 */}
          <Card>
            {/* 紐⑤뱶 ??*/}
            <div className="mb-4 flex gap-2">
              <Button
                type="button"
                onClick={() => setMode("login")}
                variant="secondary"
                size="sm"
                shape="pill"
                className={cx(
                  "h-9 flex-1 rounded-[10px] px-4 text-[13px] font-medium justify-center",
                  mode === "login"
                    ? "bg-(--oboon-bg-subtle) text-(--oboon-text-title) border border-(--oboon-border-default)"
                    : "bg-transparent text-(--oboon-text-muted) border border-(--oboon-border-default) hover:bg-(--oboon-bg-subtle)"
                )}
              >
                濡쒓렇??
              </Button>

              <Button
                type="button"
                onClick={() => setMode("signup")}
                variant="secondary"
                size="sm"
                shape="pill"
                className={cx(
                  "h-9 flex-1 rounded-[10px] px-4 text-[13px] font-medium justify-center",
                  mode === "signup"
                    ? "bg-(--oboon-bg-subtle) text-(--oboon-text-title) border border-(--oboon-border-default)"
                    : "bg-transparent text-(--oboon-text-muted) border border-(--oboon-border-default) hover:bg-(--oboon-bg-subtle)"
                )}
              >
                ?뚯썝媛??
              </Button>
            </div>

            {/* ??*/}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <Label className="mb-1 block text-[12px] font-medium text-(--oboon-text-muted)">
                  ?대찓??
                </Label>
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="h-11 text-[14px]"
                />
              </div>

              <div>
                <Label className="mb-1 block text-[12px] font-medium text-(--oboon-text-muted)">
                  鍮꾨?踰덊샇
                </Label>
                <Input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="6???댁긽"
                  className="h-11 text-[14px]"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                shape="pill"
                loading={loading}
                className="w-full justify-center text-[14px]"
              >
                {mode === "login" ? "\uB85C\uADF8\uC778" : "\uD68C\uC6D0\uAC00\uC785"}
              </Button>
            </form>

            {/* ?곹깭 硫붿떆吏 */}
            {error ? (
              <div className="mt-4 rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle) p-3 text-[13px] text-red-400">
                {error}
              </div>
            ) : null}

            {message ? (
              <div className="mt-4 rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle) p-3 text-[13px] text-(--oboon-text-body)">
                {message}
              </div>
            ) : null}

            {/* ?뚯뀥 濡쒓렇??*/}
            <div className="mt-6 border-t border-(--oboon-border-default) pt-4">
              <div className="mb-3 text-center text-[12px] text-(--oboon-text-muted)">
                ?뚯뀥 怨꾩젙?쇰줈 怨꾩냽?섍린
              </div>

              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  shape="pill"
                  disabled={loading}
                  className="w-full justify-center"
                  onClick={() => handleOAuthLogin("google")}
                >
                  Google濡?怨꾩냽?섍린
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  shape="pill"
                  disabled={loading}
                  className="w-full justify-center"
                  onClick={handleNaverLogin}
                >
                  ?ㅼ씠踰꾨줈 怨꾩냽?섍린
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  shape="pill"
                  disabled={loading}
                  className="w-full justify-center"
                  onClick={() => handleOAuthLogin("kakao")}
                >
                  移댁뭅?ㅻ줈 怨꾩냽?섍린
                </Button>
              </div>
            </div>
          </Card>

          {/* ?섎떒 ?덈궡 */}
          <div className="mt-3 text-center text-[12px] leading-5 text-(--oboon-text-muted)">
            濡쒓렇???뚯썝媛??吏꾪뻾 ???댁슜?쎄? 諛?媛쒖씤?뺣낫泥섎━諛⑹묠???숈쓽??寃껋쑝濡?
            媛꾩＜?⑸땲??
          </div>
        </div>
      </PageContainer>
    </main>
  );
}
