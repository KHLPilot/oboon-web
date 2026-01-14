// components/shared/Header.tsx

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Calendar, LayoutDashboard, PlusCircle, UserPlus } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { User } from "@supabase/supabase-js";
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

  // ✅ nickname 우선 표시
  const loadUserData = async (currentUser: User | null) => {
    setUser(currentUser);
    if (currentUser) {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("name, nickname, role")
        .eq("id", currentUser.id)
        .single();

      console.log("Profile loaded:", profile, "Error:", error);

      if (profile) {
        // nickname 우선, 없으면 name 사용
        const displayName = profile.nickname || profile.name;
        const realName =
          displayName && displayName !== "temp" ? displayName : "";
        setProfileName(realName);
        setUserRole(profile.role || "user");

        console.log("Setting profileName:", realName);
      }
    } else {
      setProfileName("");
      setUserRole(null);
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
  }, [supabase]);

  const getDisplayName = (): string => {
    // 1순위: profiles 테이블의 nickname 또는 name
    if (profileName && profileName !== "temp") {
      return profileName;
    }

    // 2순위: user가 없으면 빈 문자열
    if (!user) return "";

    // 3순위: user_metadata (소셜 로그인용)
    const meta = user.user_metadata || {};
    const metaName = meta.full_name || meta.name || meta.nickname;

    if (metaName && metaName !== "temp") {
      return metaName;
    }

    // 4순위: 이메일 앞부분
    const emailName = user.email?.split("@")[0];
    if (emailName) {
      return emailName;
    }

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

  if (pathname?.startsWith("/auth")) {
    return null;
  }

  return (
    <header
      className="sticky top-0 z-50 w-full border-b bg-oboon-surface/90 backdrop-blur-md"
      style={{ borderColor: "var(--oboon-border-default)" }}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-8">
        <Link
          href="/"
          className="flex items-center gap-1 ob-typo-h2"
          style={{ color: "var(--oboon-text-title)" }}
        >
          <span className="oboon-logo" aria-hidden />
          <span>OBOON</span>
        </Link>

        <nav className="mt-1 hidden items-center gap-8 ob-typo-nav md:flex">
          {NAV_ITEMS.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`border-b-2 pb-0.5 transition-colors ${
                  active ? "" : "border-transparent hover:text-oboon-text-title"
                }`}
                style={{
                  borderColor: active ? "var(--oboon-primary)" : "transparent",
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

        <div className="flex items-center gap-3">
          {userRole === "agent" && (
            <Link
              href="/agent/register"
              className="ob-btn ob-btn-md ob-btn-pill ob-btn-primary flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>소속 등록 신청</span>
            </Link>
          )}

          {(userRole === "user" ||
            userRole === "agent_pending" ||
            !userRole) && (
            <button className="ob-btn ob-btn-sm ob-btn-pill ob-btn-secondary flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>상담 예약</span>
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
            </Button>
          )}

          <ThemeToggle />

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-lg transition-colors hover:bg-oboon-bg-subtle">
                  <div
                    className="w-8 h-8 rounded-full overflow-hidden border flex items-center justify-center"
                    style={{
                      borderColor: "var(--oboon-border-default)",
                      backgroundColor: "var(--oboon-bg-subtle)",
                    }}
                  >
                    {user.user_metadata?.avatar_url ? (
                      <img
                        src={user.user_metadata.avatar_url}
                        alt="Profile"
                        className="w-full h-full object-cover"
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
      </div>
    </header>
  );
}
