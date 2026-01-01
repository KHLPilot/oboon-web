// components/shared/Header.tsx

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Search, Calendar, LayoutDashboard, PlusCircle, UserPlus } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { User } from "@supabase/supabase-js";
import { createSupabaseClient } from "@/lib/supabaseClient";
import ThemeToggle from "./ThemeToggle";

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profileName, setProfileName] = useState<string>("");
  const [userRole, setUserRole] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const supabase = createSupabaseClient();
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const NAV_ITEMS = [
    { label: "분양 리스트", href: "/offerings" },
    { label: "지도", href: "/map" },
    { label: "브리핑", href: "/briefing" },
  ];

  // 드롭다운 외부 클릭 감지
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 유저 데이터 및 Role 로드
  const loadUserData = async (currentUser: User | null) => {
    setUser(currentUser);
    if (currentUser) {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("name, role")
        .eq("id", currentUser.id)
        .single();

      console.log("Profile loaded:", profile, "Error:", error); // 디버깅

      if (profile) {
        const realName = profile.name && profile.name !== "temp" ? profile.name : "";
        setProfileName(realName);
        setUserRole(profile.role || "user");

        console.log("Setting profileName:", realName); // 디버깅
      }
    } else {
      setProfileName("");
      setUserRole(null);
    }
  };

  // 초기 인증 상태 감지
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

  // ✅ 표시 이름 결정 - profiles 테이블 name 우선
  const getDisplayName = (): string => {
    // 1순위: profiles 테이블의 name
    if (profileName && profileName !== "temp") {
      console.log("Using profileName:", profileName); // 디버깅
      return profileName;
    }

    // 2순위: user가 없으면 빈 문자열
    if (!user) return "";

    // 3순위: user_metadata (소셜 로그인용)
    const meta = user.user_metadata || {};
    const metaName = meta.full_name || meta.name || meta.nickname;

    if (metaName && metaName !== "temp") {
      console.log("Using metaName:", metaName); // 디버깅
      return metaName;
    }

    // 4순위: 이메일 앞부분
    const emailName = user.email?.split("@")[0];
    if (emailName) {
      console.log("Using emailName:", emailName); // 디버깅
      return emailName;
    }

    // 최후: "사용자"
    return "사용자";
  };

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
    <header className="sticky top-0 z-50 w-full border-b bg-oboon-surface/90 backdrop-blur-md" style={{ borderColor: "var(--oboon-border-default)" }}>
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-8">
        {/* Logo */}
        <Link href="/" className="text-2xl font-black tracking-tighter" style={{ color: "var(--oboon-text-title)" }}>
          OBOON<span style={{ color: "var(--oboon-primary)" }}>.</span>
        </Link>

        {/* Navigation */}
        <nav className="hidden items-center gap-8 text-sm font-medium md:flex">
          {NAV_ITEMS.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`border-b-2 pb-0.5 transition-colors ${active
                  ? "font-semibold"
                  : "border-transparent hover:text-oboon-text-title"
                  }`}
                style={{
                  borderColor: active ? "var(--oboon-primary)" : "transparent",
                  color: active ? "var(--oboon-primary)" : "var(--oboon-text-muted)",
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-3">
          {/* 검색 */}
          <button className="hidden rounded-full p-2 transition hover:bg-oboon-bg-subtle md:inline-flex" style={{ color: "var(--oboon-text-muted)" }}>
            <Search className="h-4 w-4" />
          </button>

          {/* 다크/라이트 토글 */}
          <ThemeToggle />

          {/* 관리자 전용: 관리자 대시보드 버튼 */}
          {userRole === "admin" && (
            <Link
              href="/admin"
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors"
              style={{ color: "var(--oboon-primary)" }}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span className="hidden sm:inline">관리자</span>
            </Link>
          )}

          {/* agent 전용: 소속 등록 신청 버튼 */}
          {userRole === "agent" && (
            <Link
              href="/agent/register"
              className="ob-btn ob-btn-md ob-btn-pill ob-btn-primary flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>소속 등록 신청</span>
            </Link>
          )}

          {/* 상담 예약: user, agent_pending, 또는 비로그인 시에만 노출 */}
          {(userRole === "user" || userRole === "agent_pending" || !userRole) && (
            <button className="ob-btn ob-btn-md ob-btn-pill ob-btn-secondary flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>상담 예약</span>
            </button>
          )}

          {/* 현장 등록하기: builder, developer, admin만 노출 */}
          {["admin", "builder", "developer"].includes(userRole || "") && (
            <Link
              href="/company/properties"
              className="ob-btn ob-btn-md ob-btn-pill ob-btn-primary flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              <span className="hidden sm:inline">현장 등록하기</span>
            </Link>
          )}

          {/* 로그인 상태 유저 드롭다운 */}
          {user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen((prev) => !prev)}
                className="flex items-center gap-2 rounded-lg px-3 py-1.5 transition-colors hover:bg-oboon-bg-subtle"
              >
                <div className="w-9 h-9 rounded-full overflow-hidden border flex items-center justify-center" style={{ borderColor: "var(--oboon-border-default)", backgroundColor: "var(--oboon-bg-subtle)" }}>
                  {user.user_metadata?.avatar_url ? (
                    <img
                      src={user.user_metadata.avatar_url}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-semibold" style={{ color: "var(--oboon-text-body)" }}>
                      {getDisplayName().slice(0, 1)}
                    </span>
                  )}
                </div>
                <span className="hidden sm:inline text-sm font-medium" style={{ color: "var(--oboon-text-body)" }}>
                  {getDisplayName()}님
                </span>
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-40 rounded-xl shadow-card border py-2" style={{ backgroundColor: "var(--oboon-bg-surface)", borderColor: "var(--oboon-border-default)" }}>
                  <Link
                    href="/profile"
                    onClick={() => setDropdownOpen(false)}
                    className="block px-4 py-2 text-sm transition-colors hover:bg-oboon-bg-subtle"
                    style={{ color: "var(--oboon-text-body)" }}
                  >
                    프로필 설정
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm transition-colors hover:bg-oboon-bg-subtle"
                    style={{ color: "var(--oboon-danger)" }}
                  >
                    로그아웃
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/auth/login"
              className="text-sm font-medium px-2 transition-colors"
              style={{ color: "var(--oboon-text-muted)" }}
            >
              로그인
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}