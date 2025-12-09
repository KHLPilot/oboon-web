"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Search, Calendar } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { User } from "@supabase/supabase-js";
import { createSupabaseClient } from "@/lib/supabaseClient";

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const supabase = createSupabaseClient();
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // 드롭다운 외부 클릭
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 로그인 상태 가져오기
  useEffect(() => {
    const loadUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        return;
      }
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user ?? null);
    };

    loadUser();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => listener.subscription.unsubscribe();
  }, [supabase]);

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

  // 🔴 로그아웃 확실하게
  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("로그아웃 오류:", error.message);
      return;
    }

    setDropdownOpen(false);
    setUser(null);
    router.push("/");     // 메인으로 이동
    router.refresh();     // 화면 새로고침해서 상태 싹 맞추기
  };

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-100">
      <div className="container mx-auto px-4 md:px-8 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">

        {/* 로고 */}
        <div className="flex items-center justify-between md:justify-start w-full md:w-auto">
          <Link href="/" className="text-2xl font-black text-slate-900 tracking-tighter">
            OBOON<span className="text-teal-400">.</span>
          </Link>
        </div>

        {/* 네비게이션 */}
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

        {/* 우측 버튼 영역 */}
        <div className="flex items-center gap-4">
          <button className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <Search className="w-5 h-5 text-slate-400" />
          </button>

          {user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen((prev) => !prev)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <div className="w-9 h-9 rounded-full overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center">
                  {user.user_metadata?.avatar_url ? (
                    <img
                      src={user.user_metadata.avatar_url}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-semibold text-slate-600">
                      {getDisplayName(user).slice(0, 1)}
                    </span>
                  )}
                </div>
                <span className="text-sm font-medium text-slate-700">
                  {getDisplayName(user)}님
                </span>
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-white rounded-xl shadow-lg border border-slate-200 py-2">
                  <Link
                    href="/profile"
                    onClick={() => setDropdownOpen(false)}
                    className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                  >
                    프로필 설정
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-slate-100"
                  >
                    로그아웃
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="text-sm font-medium text-slate-500 hover:text-slate-900 px-2"
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