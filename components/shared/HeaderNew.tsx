//app/components/shared/HeaderNew.tsx

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Calendar } from "lucide-react";
import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { createSupabaseClient } from "@/lib/supabaseClient"; // 1. Supabase 클라이언트 임포트

export default function Header() {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null); // 2. 유저 상태 관리
  const supabase = createSupabaseClient();

  // 3. 로그인 상태 확인 및 실시간 감지
  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    };

    getUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
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

        {/* 네비게이션 메뉴 */}
        <nav className="flex gap-6 overflow-x-auto whitespace-nowrap text-sm font-medium md:gap-8">
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

        {/* 우측 아이콘 및 버튼 영역 */}
        <div className="flex items-center gap-3">
          {/* 검색 버튼 */}
          <button className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <Search className="w-5 h-5 text-slate-400" />
          </button>

          {/* 4. 로그인 로직 적용 영역 */}
          {user ? (
            // [로그인 상태]: 프로필 이미지 표시 (클릭 시 /profile 이동)
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
            // [비로그인 상태]: 로그인 버튼 표시
            <Link
              href="/login"
              className="text-sm font-medium text-slate-500 hover:text-slate-900 px-2 transition-colors"
            >
              로그인
            </Link>
          )}

          {/* 상담 예약 버튼 (기존 유지) */}
          <button className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-800 transition-colors flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>상담 예약</span>
          </button>
        </div>
      </div>
    </header>
  );
}
