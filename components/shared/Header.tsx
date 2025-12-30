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
  const [profileName, setProfileName] = useState<string>(""); // DB에서 가져온 실명 저장용
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const supabase = createSupabaseClient();
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // 드롭다운 외부 클릭 감지
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /**
   * 유저 세션과 DB 프로필 이름을 함께 로드하는 함수
   */
  const loadUserData = async (currentUser: User | null) => {
    setUser(currentUser);
    if (currentUser) {
      // 내 DB(profiles)에서 실제 이름 가져오기
      const { data: profile } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", currentUser.id)
        .single();

      if (profile?.name) {
        setProfileName(profile.name);
      } else {
        setProfileName(""); // 프로필 정보가 아직 없으면 초기화
      }
    } else {
      setProfileName("");
    }
  };

  // 초기 로드 및 인증 상태 변경 감지
  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      loadUserData(session?.user ?? null);
    };

    initAuth();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      loadUserData(session?.user ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, [supabase]);

  /**
   * 표시할 이름 결정 로직
   * 1순위: profiles 테이블의 실명
   * 2순위: 소셜 로그인 등의 metadata name
   * 3순위: 이메일 아이디 부분
   */
  const getDisplayName = (): string => {
    if (profileName) return profileName; // DB 실명이 있으면 최우선 적용
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

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("로그아웃 오류:", error.message);
      return;
    }
    setDropdownOpen(false);
    setUser(null);
    setProfileName(""); // 이름 상태 초기화
    router.push("/");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-100">
      <div className="container mx-auto px-4 md:px-8 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* 로고 */}
        <div className="flex items-center justify-between md:justify-start w-full md:w-auto">
          <Link
            href="/"
            className="text-2xl font-black text-slate-900 tracking-tighter"
          >
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
                className={`transition-colors ${isActive
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

          {/* 로그인 상태 */}
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
                      {getDisplayName().slice(0, 1)}
                    </span>
                  )}
                </div>
                <span className="text-sm font-medium text-slate-700">
                  {getDisplayName()}님
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
              href="/auth/login"
              className="text-sm font-medium text-slate-500 hover:text-slate-900 px-2"
            >
              로그인
            </Link>
          )}

          <button className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-800 transition-colors flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>상담 예약</span>
          </button>

          <Link
            href="/company/properties"
            className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-teal-500 transition-colors"
          >
            현장 등록하기
          </Link>
        </div>
      </div>
    </header>
  );
}