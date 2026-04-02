"use client";

import { Heart } from "lucide-react";
import { useScrap } from "@/features/offerings/hooks/useScrap";

interface ScrapButtonProps {
  propertyId: number;
  initialScrapped: boolean;
  isLoggedIn: boolean;
  /** "icon" — 카드 오버레이용 원형 버튼 (기본) */
  /** "full" — 상세 페이지용 텍스트 포함 버튼 */
  variant?: "icon" | "full";
  className?: string;
}

export default function ScrapButton({
  propertyId,
  initialScrapped,
  isLoggedIn,
  variant = "icon",
  className,
}: ScrapButtonProps) {
  const { scrapped, loading, toggle } = useScrap({
    propertyId,
    initialScrapped,
    isLoggedIn,
  });

  if (variant === "full") {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          void toggle();
        }}
        disabled={loading}
        aria-label={scrapped ? "찜 해제" : "찜하기"}
        className={[
          "flex items-center gap-1.5 rounded-xl px-3 py-2 ob-typo-caption transition-colors",
          scrapped
            ? "bg-(--oboon-bg-subtle) text-rose-500"
            : "bg-(--oboon-bg-subtle) text-(--oboon-text-muted) hover:text-rose-500",
          loading ? "opacity-60 cursor-not-allowed" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <Heart
          size={16}
          className={scrapped ? "fill-rose-500 stroke-rose-500" : ""}
        />
        <span>{scrapped ? "찜됨" : "찜하기"}</span>
      </button>
    );
  }

  // icon variant — 카드 우상단 오버레이
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void toggle();
      }}
      disabled={loading}
      aria-label={scrapped ? "찜 해제" : "찜하기"}
      className={[
        "flex items-center justify-center rounded-full w-8 h-8 transition-colors",
        "border border-(--oboon-border-default) backdrop-blur-sm shadow-sm",
        scrapped
          ? "text-rose-500"
          : "text-(--oboon-text-muted) hover:text-rose-500",
        loading ? "opacity-60 cursor-not-allowed" : "",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ backgroundColor: "var(--oboon-bg-surface-frost)" }}
    >
      <Heart
        className={[
          "h-4 w-4 max-xs:!h-3.5 max-xs:!w-3.5",
          scrapped ? "fill-rose-500 stroke-rose-500" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      />
    </button>
  );
}
