"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Search } from "lucide-react";

import HeaderAuth from "@/app/components/HeaderAuth";
import ThemeToggle from "./ThemeToggle";
import Button from "@/components/ui/Button";

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();

  const NAV_ITEMS = [
    { label: "분양 리스트", href: "/offerings" },
    { label: "지도", href: "/map" },
    { label: "브리핑", href: "/briefing" },
  ];

  /* ---------------------------
     Supabase Auth 상태 관리
  ---------------------------- */
  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    return createClient(url, key);
  }, []);

  const [isAuthed, setIsAuthed] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    // 최초 세션 체크
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setIsAuthed(Boolean(data.session));
      setAuthReady(true);
    });

    // 로그인/로그아웃 변경 감지
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthed(Boolean(session));
      setAuthReady(true);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  /* ---------------------------
     Render
  ---------------------------- */
  return (
    <header className="sticky top-0 z-50 w-full border-b border-(--oboon-border-default) bg-(--oboon-bg-surface)/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-8">
        {/* Logo */}
        <Link
          href="/"
          className="text-2xl font-black tracking-tighter text-(--oboon-text-title)"
        >
          OBOON<span className="text-(--oboon-primary)">.</span>
        </Link>

        {/* Nav */}
        <nav className="hidden items-center gap-8 text-sm font-medium md:flex">
          {NAV_ITEMS.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "border-b-2 pb-0.5 transition-colors",
                  active
                    ? "border-(--oboon-primary) font-semibold text-(--oboon-primary)"
                    : "border-transparent text-(--oboon-text-muted) hover:text-(--oboon-text-title)",
                ].join(" ")}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-3">
          {/* 검색 */}
          <button className="hidden rounded-full p-2 text-(--oboon-text-muted) transition hover:bg-(--oboon-bg-subtle) md:inline-flex">
            <Search className="h-4 w-4" />
          </button>

          {/* 다크/라이트 토글 */}
          <ThemeToggle />
          {/* 현장 등록하기 (로그인 상태에서만 노출) */}
          {authReady && isAuthed ? (
            <Button variant="primary" size="sm" shape="pill">
              현장 등록하기
            </Button>
          ) : null}

          {/* 로그인 / 프로필 */}
          <HeaderAuth />
        </div>
      </div>
    </header>
  );
}
