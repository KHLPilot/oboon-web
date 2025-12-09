// app/layout.tsx
"use client";

import { useEffect } from "react";
import type { Metadata } from "next";
import "./globals.css";
import { createSupabaseClient } from "@/lib/supabaseClient";

export const metadata: Metadata = {
  title: "OBOON 분양 플랫폼",
  description: "Offerings · Briefing · Overview · Options · Navigation",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = createSupabaseClient();

  // 🔥 NAVER magic link / OAuth 해시(#) 토큰 처리
  useEffect(() => {
    async function processHashToken() {
      const hash = window.location.hash;

      if (!hash.includes("access_token")) return;

      const params = new URLSearchParams(hash.substring(1));
      const access_token = params.get("access_token");
      const refresh_token = params.get("refresh_token");

      if (access_token && refresh_token) {
        await supabase.auth.setSession({
          access_token,
          refresh_token,
        });

        // URL 정리 (해시 제거)
        window.history.replaceState(null, "", "/auth/callback");
      }
    }

    processHashToken();
  }, []);

  return (
    <html lang="ko">
      <body className="bg-slate-950 text-slate-50">{children}</body>
    </html>
  );
}
