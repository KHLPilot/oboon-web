// components/shared/Header.tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { Calendar, LayoutDashboard, Menu } from "lucide-react";
import NotificationBell from "@/features/notifications/components/NotificationBell.client";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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
  const headerRef = useRef<HTMLElement | null>(null);

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
      { label: "비교하기", href: ROUTES.offerings.compare, exact: true },
      { label: "브리핑", href: ROUTES.briefing },
      { label: "커뮤니티", href: "/community" },
      // { label: "고객센터", href: "/support" },
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

  useLayoutEffect(() => {
    const root = document.documentElement;
    if (isHidden) {
      root.dataset.oboonHeaderHidden = "true";
      root.style.removeProperty("--oboon-header-offset");
    } else {
      delete root.dataset.oboonHeaderHidden;
      const syncHeaderOffset = () => {
        const header = headerRef.current;
        if (!header) return;
        const measuredHeight = Math.ceil(header.getBoundingClientRect().height);
        root.style.setProperty("--oboon-header-offset", `${measuredHeight}px`);
      };

      syncHeaderOffset();

      const observer =
        typeof ResizeObserver !== "undefined" && headerRef.current
          ? new ResizeObserver(syncHeaderOffset)
          : null;
      if (headerRef.current && observer) {
        observer.observe(headerRef.current);
      }

      window.addEventListener("resize", syncHeaderOffset);

      return () => {
        window.removeEventListener("resize", syncHeaderOffset);
        observer?.disconnect();
        root.style.removeProperty("--oboon-header-offset");
      };
    }

    return () => {
      delete root.dataset.oboonHeaderHidden;
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

  return (
    <>
      <header
        ref={headerRef}
        className={[
          "oboon-header-shell fixed top-0 left-0 right-0 z-(--oboon-z-header) overflow-x-clip",
          "supports-backdrop-filter:backdrop-blur-md",
        ].join(" ")}
      >
        <div className="mx-auto flex h-16 w-full max-w-240 lg:max-w-300 items-center justify-between px-4 sm:px-5 lg:px-8">
          <div className="min-w-0 flex items-center gap-6 lg:gap-10">
            {/* Logo */}
            <Link
              href="/"
              className="shrink-0 flex items-center gap-1 ob-typo-h2 text-(--oboon-text-title)"
            >
              <span className="oboon-logo" aria-hidden />
              <span className="hidden xs:inline">OBOON</span>
            </Link>

            {/* Desktop nav */}
            <nav className="mt-1.5 hidden min-w-0 items-center gap-6 lg:gap-8 ob-typo-nav lg:flex">
              {NAV_ITEMS.map((item) => {
                const active = item.exact
                  ? pathname === item.href
                  : pathname?.startsWith(item.href) ?? false;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={[
                      "border-b-2 pb-0.5 transition-colors",
                      active
                        ? "border-(--oboon-primary) text-(--oboon-primary)"
                        : "border-transparent text-(--oboon-text-muted) hover:text-(--oboon-text-title)",
                    ].join(" ")}
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
                {/* < xs (< 320px): 원형 아이콘 버튼 */}
                <button
                  type="button"
                  aria-label="예약 관리"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-(--oboon-primary) bg-(--oboon-primary) text-(--oboon-on-primary) transition-colors hover:bg-(--oboon-primary-hover) sm:hidden"
                  onClick={() => router.push("/agent/consultations")}
                >
                  <Calendar className="h-4 w-4" />
                </button>
                {/* xs+: pill 버튼 (텍스트는 sm부터) */}
                <div className="hidden sm:block">
                  <Button
                    variant="primary"
                    size="sm"
                    shape="pill"
                    className="flex items-center gap-2"
                    onClick={() => router.push("/agent/consultations")}
                  >
                    <Calendar className="w-4 h-4" />
                    <span className="hidden lg:inline">예약 관리</span>
                    <span className="hidden sm:inline lg:hidden">예약</span>
                  </Button>
                </div>
              </>
            )}

            {userRole === "admin" && (
              <>
                {/* < xs (< 320px): 원형 아이콘 버튼 */}
                <button
                  type="button"
                  aria-label="관리자 대시보드"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-(--oboon-primary) bg-(--oboon-primary) text-(--oboon-on-primary) transition-colors hover:bg-(--oboon-primary-hover) sm:hidden"
                  onClick={() => router.push("/admin")}
                >
                  <LayoutDashboard className="h-4 w-4" />
                </button>
                {/* xs+: pill 버튼 (텍스트는 sm부터) */}
                <div className="hidden sm:block">
                  <Button
                    variant="primary"
                    size="sm"
                    shape="pill"
                    className="flex items-center gap-2"
                    onClick={() => router.push("/admin")}
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    <span className="hidden lg:inline">대시보드</span>
                    <span className="hidden sm:inline lg:hidden ob-typo-caption">대시보드</span>
                  </Button>
                </div>
              </>
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
                        className="h-8 w-8 rounded-full overflow-hidden border border-(--oboon-border-default) bg-(--oboon-bg-subtle) flex items-center justify-center"
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
                        className="hidden sm:inline ob-typo-body text-(--oboon-text-body)"
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
                  className="ob-typo-nav px-2 text-(--oboon-text-muted) transition-colors"
                  onClick={() => trackEvent("login_click", { method: "link" })}
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
                  >
                    <Menu className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="mt-4 w-44 p-1">
                  {NAV_ITEMS.map((item) => {
                    const active = item.exact
                      ? pathname === item.href
                      : pathname?.startsWith(item.href) ?? false;
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
