// app/layout.tsx
import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { HeaderAuth } from "./components/HeaderAuth"; // ⬅️ 추가

export const metadata: Metadata = {
  title: "OBOON 분양 플랫폼",
  description: "Offerings · Briefing · Overview · Options · Navigation",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="bg-slate-950 text-slate-50">{children}</body>
    </html>
  );
}

// export default function RootLayout({
//   children,
// }: {
//   children: React.ReactNode;
// }) {
//   return (
//     <html lang="ko">
//       <body className="bg-slate-950 text-slate-50"></body>
// <div className="mx-auto max-w-5xl px-4 py-4">
//   {/* 공통 헤더 */}
//   <header className="mb-6 flex items-center justify-between gap-4">
//     <nav>
//       <Link href="/">
//         <div className="text-xl font-bold">오분: 오늘의 분양</div>
//         <div className="text-xs text-slate-400">
//           어려운 분양 정보도 오분이면 돼~
//         </div>
//       </Link>
//     </nav>

//     {/* 오른쪽: 메뉴 + 로그인/로그아웃 */}
//     <div className="flex items-center gap-3">
//       {/* 상단 메뉴 (라우팅) */}
//       <nav className="flex flex-wrap gap-2 text-xs md:text-sm">
//         <Link
//           href="/offerings"
//           className="rounded-full border border-slate-100 text-slate-100 bg-slate-900 px-3 py-1 hover:border-emerald-400 hover:text-emerald-400"
//         >
//           O · Offerings
//         </Link>
//         <Link
//           href="/briefing"
//           className="rounded-full border border-slate-100 text-slate-100 bg-slate-900 px-3 py-1 hover:border-emerald-400 hover:text-emerald-400"
//         >
//           B · Briefing
//         </Link>
//         <Link
//           href="/overview"
//           className="rounded-full border border-slate-100 text-slate-100 bg-slate-900 px-3 py-1 hover:border-emerald-400 hover:text-emerald-400"
//         >
//           O · Overview
//         </Link>
//         <Link
//           href="/options"
//           className="rounded-full border border-slate-100 text-slate-100 bg-slate-900 px-3 py-1 hover:border-emerald-400 hover:text-emerald-400"
//         >
//           O · Options
//         </Link>
//         <Link
//           href="/navigation"
//           className="rounded-full border border-slate-100 text-slate-100 bg-slate-900 px-3 py-1 hover:border-emerald-400 hover:text-emerald-400"
//         >
//           N · Navigation
//         </Link>
//       </nav>

//       {/* 로그인 / 로그아웃 영역 */}
//       <HeaderAuth />
//     </div>
//   </header>

//   {/* 여기 안에 각 페이지 내용이 들어옴 */}
//   <main>{children}</main>
// </div>
// </body>
//     </html>
//   );
// }
