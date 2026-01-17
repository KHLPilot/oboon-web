// components/shared/Header.tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Calendar, Menu, UserPlus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";

import { createSupabaseClient } from "@/lib/supabaseClient";
import ThemeToggle from "./ThemeToggle";
import Button from "../ui/Button";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "../ui/DropdownMenu";

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createSupabaseClient();

  const [user, setUser] = useState<User | null>(null);
  const [profileName, setProfileName] = useState<string>("");
  const [userRole, setUserRole] = useState<string | null>(null);

  const NAV_ITEMS = useMemo(
    () => [
      { label: "분양 리스트", href: "/offerings" },
      { label: "지도", href: "/map" },
      { label: "브리핑", href: "/briefing" },
    ],
    []
  );

  // ✅ nickname 우선 표시
  const loadUserData = async (currentUser: User | null) => {
    setUser(currentUser);

    if (!currentUser) {
      setProfileName("");
      setUserRole(null);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("name, nickname, role")
      .eq("id", currentUser.id)
      .single();

    if (profile) {
      const displayName = profile.nickname || profile.name;
      const realName = displayName && displayName !== "temp" ? displayName : "";
      setProfileName(realName);
      setUserRole(profile.role || "user");
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      loadUserData(session?.user ?? null);
    };

    initAuth();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        loadUserData(session?.user ?? null);
      }
    );

    return () => listener.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getDisplayName = (): string => {
    if (profileName && profileName !== "temp") return profileName;
    if (!user) return "";

    const meta = user.user_metadata || {};
    const metaName = meta.full_name || meta.name || meta.nickname;
    if (metaName && metaName !== "temp") return metaName;

    const emailName = user.email?.split("@")[0];
    if (emailName) return emailName;

    return "사용자";
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("로그아웃 오류:", error.message);
      return;
    }
    setUser(null);
    setProfileName("");
    setUserRole(null);
    router.push("/");
    router.refresh();
  };

  // auth, chat 페이지에서는 헤더 숨김
  if (pathname?.startsWith("/auth") || pathname?.startsWith("/chat")) return null;

  // iOS safe-area 포함 헤더 총 높이(스페이서에 동일하게 사용)
  const HEADER_HEIGHT = "calc(64px + env(safe-area-inset-top))";

  return (
    <>
      <header
        className={[
          "fixed top-0 left-0 right-0 z-100 w-full border-b",
          "bg-oboon-surface/90 supports-backdrop-filter:backdrop-blur-md",
        ].join(" ")}
        style={{
          borderColor: "var(--oboon-border-default)",
          height: HEADER_HEIGHT,
          paddingTop: "env(safe-area-inset-top)",
          WebkitBackdropFilter: "blur(12px)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div className="mx-auto flex h-16 max-w-240 lg:max-w-300 items-center justify-between px-4 sm:px-5 lg:px-8">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-1 ob-typo-h2"
            style={{ color: "var(--oboon-text-title)" }}
          >
            <span className="oboon-logo" aria-hidden />
            <span>OBOON</span>
          </Link>

          {/* Desktop nav */}
          <nav className="mt-1 hidden items-center gap-8 ob-typo-nav md:flex">
            {NAV_ITEMS.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`border-b-2 pb-0.5 transition-colors ${
                    active
                      ? ""
                      : "border-transparent hover:text-oboon-text-title"
                  }`}
                  style={{
                    borderColor: active
                      ? "var(--oboon-primary)"
                      : "transparent",
                    color: active
                      ? "var(--oboon-primary)"
                      : "var(--oboon-text-muted)",
                  }}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Role actions */}
            {userRole === "agent" && (
              <>
                <Link
                  href="/agent/consultations"
                  className="ob-btn ob-btn-sm ob-btn-pill ob-btn-secondary flex items-center gap-2"
                >
                  <Calendar className="w-4 h-4" />
                  <span className="hidden sm:inline">예약 관리</span>
                  <span className="sm:hidden">예약</span>
                </Link>
                <Link
                  href="/agent/properties"
                  className="ob-btn ob-btn-sm ob-btn-pill ob-btn-primary flex items-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  <span className="hidden sm:inline">소속 등록 신청</span>
                  <span className="sm:hidden">신청</span>
                </Link>
              </>
            )}

            {(userRole === "user" ||
              userRole === "agent_pending" ||
              !userRole) && (
              <button className="ob-btn ob-btn-sm ob-btn-pill ob-btn-secondary flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span className="hidden sm:inline">상담 예약</span>
                <span className="sm:hidden">상담</span>
              </button>
            )}

            {["admin", "builder", "developer"].includes(userRole || "") && (
              <Button
                variant="primary"
                size="sm"
                shape="pill"
                className="flex items-center gap-2"
                onClick={() => router.push("/company/properties")}
              >
                <span className="hidden sm:inline">현장 등록하기</span>
                <span className="sm:hidden">현장 등록</span>
              </Button>
            )}

            <ThemeToggle />

            {/* Auth / Profile */}
            <div className="hidden md:block">
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 rounded-full transition-colors hover:bg-oboon-bg-subtle">
                      <div
                        className="h-8 w-8 rounded-full overflow-hidden border flex items-center justify-center"
                        style={{
                          borderColor: "var(--oboon-border-default)",
                          backgroundColor: "var(--oboon-bg-subtle)",
                        }}
                      >
                        {user.user_metadata?.avatar_url ? (
                          <img
                            src={user.user_metadata.avatar_url}
                            alt="Profile"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span
                            className="ob-typo-caption"
                            style={{ color: "var(--oboon-text-body)" }}
                          >
                            {getDisplayName().slice(0, 1)}
                          </span>
                        )}
                      </div>

                      <span
                        className="hidden sm:inline ob-typo-body"
                        style={{ color: "var(--oboon-text-body)" }}
                      >
                        {getDisplayName()}님
                      </span>
                    </button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="start" className="mt-2 w-40 p-1">
                    <DropdownMenuItem onClick={() => router.push("/profile")}>
                      프로필 설정
                    </DropdownMenuItem>

                    {userRole === "admin" && (
                      <DropdownMenuItem onClick={() => router.push("/admin")}>
                        관리자
                      </DropdownMenuItem>
                    )}

                    <DropdownMenuItem destructive onClick={handleLogout}>
                      로그아웃
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link
                  href="/auth/login"
                  className="ob-typo-nav px-2 transition-colors"
                  style={{ color: "var(--oboon-text-muted)" }}
                >
                  로그인
                </Link>
              )}
            </div>
            {/* Mobile nav */}
            <div className="md:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label="메뉴 열기"
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-(--oboon-border-default) bg-white/5 text-(--oboon-text-muted) transition hover:bg-white/10"
                    style={{ borderColor: "var(--oboon-border-default)" }}
                  >
                    <Menu className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="mt-4 w-44 p-1">
                  {NAV_ITEMS.map((item) => {
                    const active = pathname.startsWith(item.href);
                    return (
                      <DropdownMenuItem
                        key={item.href}
                        onClick={() => router.push(item.href)}
                        className={
                          active ? "text-(--oboon-text-title)" : undefined
                        }
                      >
                        {item.label}
                      </DropdownMenuItem>
                    );
                  })}
                  {/* divider 느낌: 컴포넌트에 Separator가 없으면 이렇게 처리 */}
                  <div className="my-1 h-px bg-(--oboon-border-default)" />
                  {user ? (
                    <>
                      <DropdownMenuItem onClick={() => router.push("/profile")}>
                        프로필 설정
                      </DropdownMenuItem>

                      {userRole === "admin" ? (
                        <DropdownMenuItem onClick={() => router.push("/admin")}>
                          관리자
                        </DropdownMenuItem>
                      ) : null}

                      <DropdownMenuItem destructive onClick={handleLogout}>
                        로그아웃
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <DropdownMenuItem
                      onClick={() => router.push("/auth/login")}
                    >
                      로그인
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* fixed 헤더 높이만큼 본문이 가려지지 않도록 스페이서 */}
      <div aria-hidden style={{ height: HEADER_HEIGHT }} />
    </>
  );
}
