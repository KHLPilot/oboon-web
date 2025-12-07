// app/layout.tsx
import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { HeaderAuth } from "./components/HeaderAuth";
import { ensureProfile } from "@/lib/ensureProfile";

export const metadata: Metadata = {
  title: "OBOON 분양 플랫폼",
  description: "Offerings · Briefing · Overview · Options · Navigation",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 로그인 유저 profile 자동 생성
  await ensureProfile();

  return (
    <html lang="ko">
      <body className="bg-slate-950 text-slate-50">
        <div className="mx-auto max-w-5xl px-4 py-4">
          {/* 공통 헤더 */}
          <header className="mb-6 flex items-center justify-between gap-4">
            <nav>
              <Link href="/">
                <div className="text-xl font-bold">오분: 오늘의 분양</div>
                <div className="text-xs text-slate-400">
                  어려운 분양 정보도 오분이면 돼~
                </div>
              </Link>
            </nav>

            <div className="flex items-center gap-3">
              <HeaderAuth />
            </div>
          </header>

          {/* 페이지 내용 */}
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
