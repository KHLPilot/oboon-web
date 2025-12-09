"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Calendar } from "lucide-react";
import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { createSupabaseClient } from "@/lib/supabaseClient";

export default function Header() {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const supabase = createSupabaseClient();

  // 로그인 상태 가져오기
  useEffect(() => {
    const loadSession = async () => {
      const { data } = await supabase.auth.getSession();
      setUser(data.session?.user ?? null);
    };

    loadSession();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  // 사용자 표시 이름
  const getDisplayName = (user: User | null): string => {
    if (!user) return "";

    const meta = user.user_metadata || {};

    return (
      meta.full_name ||
      meta.name ||
      meta.nickname ||
      user.email?.split("@")[0] ||
      "사용자"
    );
  };

  const NAV_ITEMS = [
    { label: "Offerings", href: "/offerings" },
    { label: "Briefing", href: "/briefing" },
    { label: "Overview", href: "/overview" },
    { label: "Options", href: "/options" },
    { label: "Navigation", href: "/navigation" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-100">
      <div className="container mx-auto px-4 md:px-8 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">

        {/* 좌측 로고 */}
        <div className="flex items-center justify-between md:justify-start w-full md:w-auto">
          <Link
            href="/"
            className="text-2xl font-black text-slate-900 tracking-tighter"
          >
            OBOON<span className="text-teal-400">.</span>
          </Link>

          {/* 모바일 로그인/예약 버튼 */}
          <div className="flex items-center gap-2 md:hidden">

            {/* 검색 */}
            <button className="p-1.5 hover:bg-slate-100 rounded-full transition-colors">
              <Search className="w-4 h-4 text-slate-400" />
            </button>

            {/* 로그인 or 프로필 */}
            {user ? (
              <Link
                href="/profile"
                className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-slate-100 transition-colors"
              >
                <div className="w-7 h-7 rounded-full overflow-hidden border border-slate-200">
                  {user.user_metadata?.avatar_url ? (
                    <img
                      src={user.user_metadata.avatar_url}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600">
                      {getDisplayName(user).slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>

                <span className="text-xs font-medium text-slate-700">
                  {getDisplayName(user)}님
                </span>
              </Link>
            ) : (
              <Link
                href="/login"
                className="text-xs font-medium text-slate-500 hover:text-slate-900 px-1.5"
              >
                로그인
              </Link>
            )}

            {/* 상담 예약 */}
            <button className="bg-slate-900 text-white px-2.5 py-1.5 rounded-md text-xs font-semibold hover:bg-slate-800 transition-colors flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>상담</span>
            </button>
          </div>
        </div>

        {/* 네비게이션 메뉴 */}
        <nav className="flex gap-6 overflow-x-auto whitespace-nowrap text-sm font-medium md:gap-8 w-full md:w-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`transition-colors ${
                  isActive
                    ? "text-teal-600 font-bold border-b-2 border-teal-600 pb-0.5"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* PC 버전 - 검색, 프로필, 상담 예약 */}
        <div className="hidden md:flex items-center gap-4">

          {/* 검색 */}
          <button className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <Search className="w-5 h-5 text-slate-400" />
          </button>

          {/* 로그인 or 프로필 */}
          {user ? (
            <Link
              href="/profile"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <div className="w-9 h-9 rounded-full overflow-hidden border border-slate-200">
                {user.user_metadata?.avatar_url ? (
                  <img
                    src={user.user_metadata.avatar_url}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                    {getDisplayName(user).slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>

              <span className="text-sm font-medium text-slate-700">
                {getDisplayName(user)}님
              </span>
            </Link>
          ) : (
            <Link
              href="/login"
              className="text-sm font-medium text-slate-500 hover:text-slate-900 px-2"
            >
              로그인
            </Link>
          )}

          {/* 상담 예약 */}
          <button className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-800 transition-colors flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>상담 예약</span>
          </button>
        </div>

      </div>
    </header>
  );
}
