// components/shared/Header.tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { Calendar, Menu } from "lucide-react";
import NotificationBell from "@/features/notifications/components/NotificationBell.client";
import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";

import { createSupabaseClient } from "@/lib/supabaseClient";
import { trackEvent } from "@/lib/analytics";
import { getAvatarUrlOrDefault, normalizeImageUrl } from "@/shared/imageUrl";
import { ROUTES } from "@/types/index";
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
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  const isAbortLikeError = (input: unknown) => {
    if (!input) return false;
    const name =
      typeof input === "object" && input !== null && "name" in input
        ? String((input as { name?: unknown }).name ?? "")
        : "";
    const message =
      input instanceof Error
        ? input.message
        : typeof input === "object" && input !== null && "message" in input
          ? String((input as { message?: unknown }).message ?? "")
          : String(input);
    const lowerName = name.toLowerCase();
    const lower = message.toLowerCase();
    return (
      lowerName === "aborterror" ||
      lower.includes("aborterror") ||
      lower.includes("signal is aborted") ||
      lower.includes("operation was aborted")
    );
  };

  const NAV_ITEMS = useMemo(
    () => [
      { label: "맞춤 현장", href: ROUTES.recommendations },
      { label: "분양 리스트", href: ROUTES.offerings.list, exact: true },
      { label: "비교하기", href: "/offerings/compare", exact: true },
      // { label: "브리핑", href: "/briefing" },
      { label: "커뮤니티", href: "/community" },
      { label: "고객센터", href: "/support" },
    ],
    [],
  );

  // nickname 우선 표시
  const loadUserData = async (currentUser: User | null) => {
    try {
      setUser(currentUser);

      if (!currentUser) {
        setProfileName("");
        setProfileAvatarUrl(null);
        setUserRole(null);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("name, nickname, role, avatar_url")
        .eq("id", currentUser.id)
        .single();

      if (profile) {
        const displayName = profile.nickname || profile.name;
        const realName =
          displayName && displayName !== "temp" ? displayName : "";
        setProfileName(realName);
        setProfileAvatarUrl(normalizeImageUrl(profile.avatar_url));
        setUserRole(profile.role || "user");
      }
    } catch (err) {
      if (isAbortLikeError(err)) return;
      console.error("헤더 사용자 정보 로드 오류:", err);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      await loadUserData(session?.user ?? null);
    };

    void initAuth().catch((err) => {
      if (isAbortLikeError(err)) return;
      console.error("헤더 인증 초기화 오류:", err);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        void loadUserData(session?.user ?? null);
      },
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
    setProfileAvatarUrl(null);
    setUserRole(null);
    router.push("/");
    router.refresh();
  };

  // auth, chat 페이지에서는 헤더 숨김
  const isHidden =
    pathname?.startsWith("/auth") || pathname?.startsWith("/chat");

  useEffect(() => {
    const root = document.documentElement;
    if (isHidden) {
      root.style.setProperty("--oboon-header-offset", "0px");
    } else {
      root.style.removeProperty("--oboon-header-offset");
    }

    return () => {
      root.style.removeProperty("--oboon-header-offset");
    };
  }, [isHidden]);

  if (isHidden) return null;

  const metadataAvatarUrl = normalizeImageUrl(
    (user?.user_metadata as Record<string, unknown> | undefined)?.avatar_url,
  );
  const currentAvatarUrl = getAvatarUrlOrDefault(
    profileAvatarUrl ?? metadataAvatarUrl,
  );

  // iOS safe-area 포함 헤더 총 높이(스페이서에 동일하게 사용)
  const HEADER_HEIGHT = "var(--oboon-header-offset)";

  return (
    <>
      <header
        className={[
          "fixed top-0 left-0 right-0 z-100 border-b overflow-x-clip",
          "supports-backdrop-filter:backdrop-blur-md",
        ].join(" ")}
        style={{
          borderColor: "var(--oboon-border-default)",
          height: HEADER_HEIGHT,
          paddingTop: "env(safe-area-inset-top)",
          backgroundColor:
            "color-mix(in srgb, var(--oboon-bg-surface) 90%, transparent)",

          WebkitBackdropFilter: "blur(12px)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div className="mx-auto flex h-16 w-full max-w-240 lg:max-w-300 items-center justify-between px-4 sm:px-5 lg:px-8">
          <div className="min-w-0 flex items-center gap-6 lg:gap-10">
            {/* Logo */}
            <Link
              href="/"
              className="shrink-0 flex items-center gap-1 ob-typo-h2"
              style={{ color: "var(--oboon-text-title)" }}
            >
              <span className="oboon-logo" aria-hidden />
              <span>OBOON</span>
            </Link>

            {/* Desktop nav */}
            <nav className="mt-1.5 hidden min-w-0 items-center gap-6 lg:gap-8 ob-typo-nav md:flex">
              {NAV_ITEMS.map((item) => {
                const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
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
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Role actions */}
            {userRole === "agent" && (
              <>
                <Button
                  variant="primary"
                  size="sm"
                  shape="pill"
                  className="flex items-center gap-2"
                  onClick={() => router.push("/agent/consultations")}
                >
                  <Calendar className="w-4 h-4" />
                  <span className="hidden lg:inline">예약 관리</span>
                  <span className="lg:hidden">예약</span>
                </Button>
              </>
            )}

            {userRole === "admin" && (
              <Button
                variant="primary"
                size="sm"
                shape="pill"
                className="flex items-center gap-2"
                onClick={() => router.push("/admin")}
              >
                <span className="hidden lg:inline">관리자 대시보드</span>
                <span className="lg:hidden ob-typo-caption">대시보드</span>
              </Button>
            )}

            <ThemeToggle />

            {/* Notification Bell */}
            {user && <NotificationBell />}

            {/* Auth / Profile */}
            <div className="hidden lg:block">
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 rounded-full transition-colors hover:bg-oboon-bg-subtle cursor-pointer">
                      <div
                        className="h-8 w-8 rounded-full overflow-hidden border flex items-center justify-center"
                        style={{
                          borderColor: "var(--oboon-border-default)",
                          backgroundColor: "var(--oboon-bg-subtle)",
                        }}
                      >
                        <Image
                          src={currentAvatarUrl}
                          alt="Profile"
                          width={32}
                          height={32}
                          className="h-full w-full object-cover"
                        />
                      </div>

                      <span
                        className="hidden sm:inline ob-typo-body"
                        style={{ color: "var(--oboon-text-body)" }}
                      >
                        {getDisplayName()}님
                      </span>
                    </button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="end" className="mt-4 w-40 p-1">
                    <DropdownMenuItem onClick={() => router.push("/profile")}>
                      마이페이지
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
                  onClick={() => trackEvent("login_click", { method: "link" })}
                  style={{ color: "var(--oboon-text-muted)" }}
                >
                  로그인
                </Link>
              )}
            </div>
            {/* Mobile nav */}
            <div className="lg:hidden">
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
                    const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
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
                        마이페이지
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
                      onClick={() => {
                        trackEvent("login_click", { method: "link" });
                        router.push("/auth/login");
                      }}
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
    </>
  );
}
