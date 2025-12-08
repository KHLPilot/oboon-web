//app/components/shared/HeaderNew.tsx
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

  // 로그인 / 로그아웃 감지
  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    };

    getUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [supabase]);

  const NAV_ITEMS = [
    { label: "Offerings", href: "/offerings" },
    { label: "Briefing", href: "/briefing" },
    { label: "Overview", href: "/overview" },
    { label: "Options", href: "/options" },
    { label: "Navigation", href: "/navigation" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-100">
      {/* 모바일: flex-col, PC(md 이상): flex-row */}
      <div className="container mx-auto px-4 md:px-8 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        
        {/* 왼쪽: 로고 */}
        <div className="flex items-center justify-between md:justify-start w-full md:w-auto">
          <Link
            href="/"
            className="text-2xl font-black text-slate-900 tracking-tighter"
          >
            OBOON<span className="text-teal-400">.</span>
          </Link>

          {/* 오른쪽 버튼 - 모바일에서는 1줄 안에 포함 */}
          <div className="flex items-center gap-3 md:hidden">
            <button className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <Search className="w-5 h-5 text-slate-400" />
            </button>

            {user ? (
              <Link
                href="/profile"
                className="relative w-9 h-9 rounded-full overflow-hidden border border-slate-200 hover:border-teal-400 transition-colors"
              >
                {user.user_metadata.avatar_url ? (
                  <img
                    src={user.user_metadata.avatar_url}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                    {user.email?.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </Link>
            ) : (
              <Link
                href="/login"
                className="text-sm font-medium text-slate-500 hover:text-slate-900 px-2 transition-colors"
              >
                로그인
              </Link>
            )}

            <button className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-800 transition-colors flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>상담 예약</span>
            </button>
          </div>
        </div>

        {/* 탭 메뉴: 모바일에서는 2번째 줄 */}
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

        {/* 오른쪽 버튼 - PC(md 이상)에서만 보임 */}
        <div className="hidden md:flex items-center gap-3">
          <button className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <Search className="w-5 h-5 text-slate-400" />
          </button>

          {user ? (
            <Link
              href="/profile"
              className="relative w-9 h-9 rounded-full overflow-hidden border border-slate-200 hover:border-teal-400 transition-colors"
            >
              {user.user_metadata.avatar_url ? (
                <img
                  src={user.user_metadata.avatar_url}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                  {user.email?.slice(0, 2).toUpperCase()}
                </div>
              )}
            </Link>
          ) : (
            <Link
              href="/login"
              className="text-sm font-medium text-slate-500 hover:text-slate-900 px-2 transition-colors"
            >
              로그인
            </Link>
          )}

          <button className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-800 transition-colors flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>상담 예약</span>
          </button>
        </div>

      </div>
    </header>
  );
}

