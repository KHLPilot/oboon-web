"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

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

const STACK_POSITIONS = [
  "top-3 left-3 -rotate-2",
  "top-8 right-5 rotate-2",
  "bottom-10 left-10 -rotate-1",
  "bottom-4 right-2 rotate-1",
];

export default function HeroCounselorPreview({
  counselors,
  showFallback,
}: {
  counselors?: Counselor[];
  showFallback?: boolean;
}) {
  const [entered, setEntered] = useState(false);
  const previewItems =
    counselors && counselors.length > 0
      ? counselors
      : showFallback
        ? COUNSELOR_PREVIEW
        : [];

  useEffect(() => {
    const timer = window.setTimeout(() => setEntered(true), 40);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <section className="relative w-full overflow-hidden rounded-3xl border border-white/55 bg-white/45 p-4 shadow-(--oboon-shadow-card) backdrop-blur-md sm:p-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 18% 0%, color-mix(in srgb, var(--oboon-primary) 22%, transparent), transparent 42%)",
        }}
      />

      <div className="relative mb-4 sm:mb-5">
        <p className="ob-typo-caption text-(--oboon-text-title)">
          상담사 프로필 미리보기
        </p>
        <h3 className="mt-1 ob-typo-h3 text-(--oboon-text-title)">
          랜덤 배정 없이, 직접 선택
        </h3>
      </div>

      <div className="md:hidden">
        <div className="-mx-1 overflow-x-auto pb-1">
          <div className="flex snap-x snap-mandatory gap-3 px-1">
            {previewItems.map((counselor, index) => (
              <article
                key={counselor.name}
                className={[
                  "w-[84%] shrink-0 snap-center rounded-2xl border-2 border-white/60 bg-white/72 p-4 shadow-[0_4px_14px_rgba(0,0,0,0.12)] backdrop-blur-md transition-all duration-300",
                  "hover:-translate-y-1 hover:scale-[1.02] hover:shadow-(--oboon-shadow-card)",
                  entered ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
                ].join(" ")}
                style={{
                  transitionDelay: `${index * 70}ms`,
                }}
              >
                <CardBody counselor={counselor} />
              </article>
            ))}
          </div>
        </div>
      </div>

      <div className="relative hidden min-h-[320px] md:block">
        {previewItems.map((counselor, index) => (
          <div key={counselor.name} className={["absolute w-[48%] lg:w-[47%]", STACK_POSITIONS[index]].join(" ")}>
            <article
              className={[
                "rounded-2xl border-2 border-white/60 bg-white/72 p-4 shadow-[0_4px_14px_rgba(0,0,0,0.12)] backdrop-blur-md transition-all duration-300",
                "hover:-translate-y-1 hover:scale-[1.02] hover:shadow-(--oboon-shadow-card)",
                entered ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
              ].join(" ")}
              style={{
                transitionDelay: `${index * 90}ms`,
              }}
            >
              <CardBody counselor={counselor} />
            </article>
          </div>
        ))}
      </div>
    </section>
  );
}

function CardBody({ counselor }: { counselor: Counselor }) {
  const fieldTags = counselor.field
    .split("·")
    .map((tag) => tag.trim())
    .filter(Boolean);
  const safeTags = fieldTags.length > 0 ? fieldTags : ["소속 현장 미등록"];

  return (
    <div>
      <div className="flex items-center gap-3">
        <div className="relative h-11 w-11 overflow-hidden rounded-full border border-black/20 bg-(--oboon-bg-subtle)">
          <Image
            src={counselor.image}
            alt={`${counselor.name} 프로필 이미지`}
            fill
            sizes="44px"
            className="object-cover"
          />
        </div>
        <div className="min-w-0">
          <p className="ob-typo-caption text-black/65">분양상담사</p>
          <p className="truncate ob-typo-body2 text-black">
            {counselor.name}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {safeTags.map((tag) => (
          <span
            key={`${counselor.name}-${tag}`}
            className="inline-flex items-center rounded-full border px-2.5 py-1 ob-typo-caption text-black/90"
            style={{
              borderColor:
                "color-mix(in srgb, var(--oboon-primary) 35%, var(--oboon-border-default))",
              background:
                "color-mix(in srgb, var(--oboon-primary) 10%, var(--oboon-bg-subtle))",
            }}
          >
            {tag}
          </span>
        ))}
      </div>

      <p className="mt-2 ob-typo-body text-black/85">{counselor.intro}</p>
    </div>
  );
}
