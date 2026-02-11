// components/shared/ThemeToggle.tsx
"use client";

import { useEffect, useState } from "react";
import { Moon } from "lucide-react";

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
  // 상태 초기화 함수에서 저장값/OS 설정을 읽고, effect에서는 외부 시스템(DOM)만 동기화한다.
  const [theme, setTheme] = useState<Theme>(() => getInitialTheme());

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const toggleTheme = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    window.localStorage.setItem("oboon-theme", next);
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="flex h-8 w-8 items-center justify-center rounded-full border border-(--oboon-border-default) bg-white/5 text-(--oboon-text-muted) transition hover:bg-white/10 cursor-pointer"
      aria-label="테마 전환"
    >
      <Moon className="h-4 w-4" />
    </button>
  );
}
