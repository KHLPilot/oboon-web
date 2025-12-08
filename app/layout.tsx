// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
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
          {/* 페이지 내용 */}
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
