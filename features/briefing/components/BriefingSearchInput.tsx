"use client";

import { useRouter } from "next/navigation";
import { useRef } from "react";

import { cx } from "@/features/briefing/components/briefing.ui";

export default function BriefingSearchInput({
  initialQuery = "",
  className,
}: {
  initialQuery?: string;
  className?: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = () => {
    const q = inputRef.current?.value.trim() ?? "";
    if (!q) return;
    router.push(`/briefing/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <div
      className={cx(
        "flex items-center gap-2",
        "bg-(--oboon-bg-surface) border border-(--oboon-border-default)",
        "rounded-xl px-4 py-2.5",
        "focus-within:border-(--oboon-primary) transition-colors",
        className
      )}
    >
      {/* 돋보기 아이콘 */}
      <svg
        className="shrink-0 text-(--oboon-text-muted)"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>

      <input
        ref={inputRef}
        type="search"
        defaultValue={initialQuery}
        placeholder="브리핑 글 검색 (제목·내용)"
        className={cx(
          "flex-1 bg-transparent outline-none",
          "ob-typo-body text-(--oboon-text-title)",
          "placeholder:text-(--oboon-text-muted)"
        )}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
        }}
      />

      <button
        type="button"
        onClick={submit}
        className={cx(
          "shrink-0 px-3 py-1 rounded-lg",
          "bg-(--oboon-primary) text-white",
          "ob-typo-caption font-semibold",
          "hover:opacity-90 transition-opacity"
        )}
      >
        검색
      </button>
    </div>
  );
}
