// components/shared/ThemeToggle.tsx
"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "dark";

  const saved = window.localStorage.getItem("oboon-theme");
  if (saved === "light" || saved === "dark") return saved;

  // 저장된 값이 없으면 OS 설정을 따른다
  const prefersDark = window.matchMedia?.(
    "(prefers-color-scheme: dark)"
  ).matches;
  return prefersDark ? "dark" : "light";
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  // 클라이언트에서만 실행
  useEffect(() => {
    setMounted(true);
    setTheme(getInitialTheme());
  }, []);

  useEffect(() => {
    if (mounted) {
      document.documentElement.dataset.theme = theme;
    }
  }, [theme, mounted]);

  const toggleTheme = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    window.localStorage.setItem("oboon-theme", next);
  };

  // 마운트 전에는 placeholder 렌더링
  if (!mounted) {
    return (
      <div className="flex h-9 w-9 items-center justify-center rounded-full border border-(--oboon-border-default) bg-white/5">
        <div className="h-4 w-4" />
      </div>
    );
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-(--oboon-border-default) bg-white/5 text-(--oboon-text-muted) transition hover:bg-white/10"
      aria-label={isDark ? "라이트 모드로 전환" : "다크 모드로 전환"}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}