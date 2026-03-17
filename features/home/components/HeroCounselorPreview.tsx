"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { MessageCircle } from "lucide-react";

type Counselor = {
  name: string;
  field: string;
  intro: string;
  image: string;
};

const COUNSELOR_PREVIEW: Counselor[] = [
  {
    name: "김도현 상담사",
    field: "아파트 · 재건축",
    intro: "서울/수도권 분양 전문",
    image: "/images/default-avatar.png",
  },
  {
    name: "박지훈 상담사",
    field: "오피스텔 · 수익형",
    intro: "수익률 분석 기반 제안",
    image: "/images/default-avatar.png",
  },
  {
    name: "이서연 상담사",
    field: "신도시 · 특별공급",
    intro: "청약 전략 맞춤 컨설팅",
    image: "/images/default-avatar.png",
  },
  {
    name: "최민재 상담사",
    field: "중대형 · 프리미엄",
    intro: "라이프스타일 기반 제안",
    image: "/images/default-avatar.png",
  },
];

const AUTO_ROTATE_MS = 3500;

export default function HeroCounselorPreview({
  counselors,
  showFallback,
}: {
  counselors?: Counselor[];
  showFallback?: boolean;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [entered, setEntered] = useState(false);
  const [animKey, setAnimKey] = useState(0);

  const previewItems =
    counselors && counselors.length > 0
      ? counselors
      : showFallback
        ? COUNSELOR_PREVIEW
        : [];

  const goTo = useCallback((index: number) => {
    setActiveIndex(index);
    setAnimKey((k) => k + 1);
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => setEntered(true), 40);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (previewItems.length <= 1) return;
    const t = window.setTimeout(() => {
      goTo((activeIndex + 1) % previewItems.length);
    }, AUTO_ROTATE_MS);
    return () => window.clearTimeout(t);
  }, [activeIndex, previewItems.length, goTo]);

  if (previewItems.length === 0) return null;

  const active = previewItems[activeIndex];

  return (
    <section
      className={[
        "relative flex h-full w-full flex-col overflow-hidden rounded-3xl",
        "border border-(--oboon-border-default) bg-(--oboon-bg-surface)",
        "p-4 sm:p-5 shadow-(--oboon-shadow-card) backdrop-blur-md",
        "transition-all duration-500",
        entered ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
      ].join(" ")}
    >
      {/* bg radial glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 20% 0%, color-mix(in srgb, var(--oboon-primary) 20%, transparent), transparent 52%)",
        }}
      />

      {/* Header */}
      <div className="relative z-10 mb-3 shrink-0">
        <p className="ob-typo-caption text-(--oboon-text-muted)">
          상담사 프로필 미리보기
        </p>
        <h3 className="mt-0.5 ob-typo-h3 text-(--oboon-text-title)">
          랜덤 배정 없이, 직접 선택
        </h3>
      </div>

      {/* Featured Card + Thumbnails — 남은 공간에서 수직 중앙 */}
      <div className="relative z-10 my-auto flex flex-col gap-2 sm:gap-3">
      <div className="overflow-hidden">
        <article
          key={animKey}
          className="rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-page) p-3 shadow-(--oboon-shadow-card) sm:p-4"
          style={{
            animation: "counselorCardReveal 0.38s cubic-bezier(0.22,1,0.36,1)",
          }}
        >
          {/* Avatar + Name */}
          <div className="flex items-center gap-3">
            <div
              className="shrink-0 rounded-full p-[2px]"
              style={{
                background: "var(--oboon-primary)",
                boxShadow:
                  "0 0 0 3px color-mix(in srgb, var(--oboon-primary) 20%, transparent)",
              }}
            >
              <div className="relative h-12 w-12 overflow-hidden rounded-full sm:h-14 sm:w-14">
                <Image
                  src={active.image}
                  alt={`${active.name} 프로필 이미지`}
                  fill
                  sizes="(max-width: 640px) 48px, 56px"
                  className="object-cover"
                />
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate ob-typo-body2 font-semibold text-(--oboon-text-title)">
                {active.name}
              </p>
              <p className="mt-0.5 truncate ob-typo-caption text-(--oboon-text-muted)">
                {active.intro}
              </p>
            </div>
          </div>

          {/* Tags */}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {active.field
              .split("·")
              .map((t) => t.trim())
              .filter(Boolean)
              .map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center rounded-full px-2.5 py-1 ob-typo-caption"
                  style={{
                    background:
                      "color-mix(in srgb, var(--oboon-primary) 12%, var(--oboon-bg-subtle))",
                    color: "var(--oboon-primary)",
                    border:
                      "1px solid color-mix(in srgb, var(--oboon-primary) 28%, transparent)",
                  }}
                >
                  {tag}
                </span>
              ))}
          </div>

          {/* Action hint — 모바일에서 숨김 (공간 부족) */}
          <div
            className="mt-2 hidden items-center gap-2 rounded-xl px-3 py-2 sm:flex"
            style={{
              background:
                "color-mix(in srgb, var(--oboon-primary) 8%, var(--oboon-bg-subtle))",
            }}
          >
            <MessageCircle
              className="h-3.5 w-3.5 shrink-0"
              style={{ color: "var(--oboon-primary)" }}
              aria-hidden="true"
            />
            <p className="flex-1 truncate ob-typo-caption text-(--oboon-text-muted)">
              현장을 선택하면 이 상담사와 연결됩니다
            </p>
          </div>
        </article>
      </div>

      {/* Thumbnail navigation */}
      <div className="flex items-center justify-center gap-2">
        {previewItems.map((counselor, i) => (
          <button
            key={counselor.name}
            type="button"
            onClick={() => goTo(i)}
            aria-label={`${counselor.name} 보기`}
            aria-pressed={i === activeIndex}
            className={[
              "relative overflow-hidden rounded-full transition-all duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--oboon-primary)/50",
              i === activeIndex
                ? "h-8 w-8 scale-110 sm:h-9 sm:w-9"
                : "h-6 w-6 opacity-50 hover:opacity-80 sm:h-7 sm:w-7",
            ].join(" ")}
            style={
              i === activeIndex
                ? {
                    boxShadow:
                      "0 0 0 2px var(--oboon-primary), 0 0 0 4px color-mix(in srgb, var(--oboon-primary) 18%, transparent)",
                  }
                : {
                    boxShadow: "0 0 0 1.5px var(--oboon-border-default)",
                  }
            }
          >
            <Image
              src={counselor.image}
              alt={counselor.name}
              fill
              sizes="(max-width: 640px) 32px, 36px"
              className="object-cover"
            />
          </button>
        ))}
      </div>
      </div>

      <style jsx>{`
        @keyframes counselorCardReveal {
          0% {
            opacity: 0;
            transform: translateY(10px) scale(0.98);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </section>
  );
}
