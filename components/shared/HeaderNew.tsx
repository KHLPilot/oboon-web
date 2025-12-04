"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Calendar } from "lucide-react";

export default function Header() {
  const pathname = usePathname();

  const NAV_ITEMS = [
    { label: "Offerings", href: "/offerings" },
    { label: "Briefing", href: "/briefing" },
    { label: "Overview", href: "/overview" },
    { label: "Options", href: "/options" },
    { label: "Navigation", href: "/navigation" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-100 h-16">
      <div className="container mx-auto px-4 md:px-8 h-full flex items-center justify-between">
        {/* 로고 */}
        <div className="flex items-center">
          <Link
            href="/"
            className="text-2xl font-black text-slate-900 tracking-tighter"
          >
            OBOON<span className="text-teal-400">.</span>
          </Link>
        </div>

        {/* 네비게이션 메뉴 (동적 스타일링 적용) */}
        <nav className="hidden md:flex gap-8 text-sm font-medium">
          {NAV_ITEMS.map((item) => {
            // 현재 경로가 메뉴의 링크와 시작 부분이 일치하면 활성화 (예: /offerings/123 도 Offerings 하이라이트)
            const isActive = pathname.startsWith(item.href);

            return (
              <Link
                key={item.label}
                href={item.href}
                className={`transition-colors ${
                  isActive
                    ? "text-teal-600 font-bold border-b-2 border-teal-600 pb-0.5" // 활성 상태 (민트색 + 굵게 + 밑줄)
                    : "text-slate-500 hover:text-slate-900" // 비활성 상태 (회색)
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* 우측 아이콘 및 버튼 */}
        <div className="flex items-center gap-3">
          <button className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <Search className="w-5 h-5 text-slate-400" />
          </button>
          <button className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-800 transition-colors flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>상담 예약</span>
          </button>
        </div>
      </div>
    </header>
  );
}
