"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Search, Calendar, LayoutDashboard, PlusCircle, UserPlus } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { User } from "@supabase/supabase-js";
import { createSupabaseClient } from "@/lib/supabaseClient";

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profileName, setProfileName] = useState<string>("");
  const [userRole, setUserRole] = useState<string | null>(null); // 권한 상태 추가
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const supabase = createSupabaseClient();
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // 1. 드롭다운 외부 클릭 감지 (기존 유지)
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 2. 유저 데이터 및 Role 로드 (수정 및 보완)
  const loadUserData = async (currentUser: User | null) => {
    setUser(currentUser);
    if (currentUser) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("name, role")
        .eq("id", currentUser.id)
        .single();

      if (profile) {
        setProfileName(profile.name || "");
        setUserRole(profile.role || "user"); // Role 저장
      }
    } else {
      setProfileName("");
      setUserRole(null);
    }
  };

  // 3. 초기 인증 상태 감지 (기존 유지)
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

  // 4. 표시 이름 결정 로직 (기존 1, 2, 3순위 유지)
  const getDisplayName = (): string => {
    if (profileName) return profileName;
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
    setProfileName("");
    setUserRole(null);
    router.push("/");
    router.refresh();
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

        {/* 네비게이션 (기존 유지) */}
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

        {/* 우측 버튼 영역 (권한 로직 집중 적용) */}
        <div className="flex items-center gap-4">
          <button className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <Search className="w-5 h-5 text-slate-400" />
          </button>

          {/* [추가] 관리자 전용: 관리자 대시보드 버튼 */}
          {userRole === "admin" && (
            <Link
              href="/admin"
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span className="hidden sm:inline">관리자</span>
            </Link>
          )}

          {/* [추가] agent 전용: 소속 등록 신청 버튼 */}
          {userRole === "agent" && (
            <Link
              href="/agent/register"
              className="bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-amber-400 transition-colors flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>소속 등록 신청</span>
            </Link>
          )}

          {/* [수정] 상담 예약: user, agent_pending, 또는 비로그인 시에만 노출 */}
          {(userRole === "user" || userRole === "agent_pending" || !userRole) && (
            <button className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-800 transition-colors flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>상담 예약</span>
            </button>
          )}

          {/* [수정] 현장 등록하기: builder, developer, admin만 노출 */}
          {["admin", "builder", "developer"].includes(userRole || "") && (
            <Link
              href="/company/properties"
              className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-teal-500 transition-colors flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              <span className="hidden sm:inline">현장 등록하기</span>
            </Link>
          )}

          {/* 로그인 상태 유저 드롭다운 (기존 유지) */}
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
                <span className="hidden sm:inline text-sm font-medium text-slate-700">
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
        </div>
      </div>
    </header>
  );
}