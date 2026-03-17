import Link from "next/link";
import { Compass, Home, MapPinned } from "lucide-react";

import PageContainer from "@/components/shared/PageContainer";

const QUICK_LINKS = [
  {
    href: "/",
    title: "홈으로 이동",
    description: "메인 화면으로 이동합니다.",
    icon: Home,
  },
  {
    href: "/offerings",
    title: "분양 리스트 보기",
    description: "전체 분양 현장을 리스트나 지도로 확인합니다.",
    icon: Compass,
  },
  {
    href: "/recommendations",
    title: "맞춤 현장 열기",
    description: "내 조건에 맞는 현장을 비교합니다.",
    icon: MapPinned,
  },
] as const;

export default function NotFoundPage() {
  return (
    <main className="bg-(--oboon-bg-page)">
      <PageContainer className="pb-12 sm:pb-16">
        <section className="relative isolate overflow-hidden rounded-[2rem] border border-(--oboon-border-default) bg-(--oboon-bg-surface) shadow-(--oboon-shadow-card)">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-90"
            style={{
              background: [
                "radial-gradient(circle at 14% 18%, color-mix(in srgb, var(--oboon-primary) 24%, transparent), transparent 30%)",
                "radial-gradient(circle at 85% 20%, color-mix(in srgb, var(--oboon-safe) 16%, transparent), transparent 22%)",
                "linear-gradient(135deg, color-mix(in srgb, var(--oboon-bg-subtle) 40%, transparent), transparent)",
              ].join(", "),
            }}
          />

          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 top-10 h-48 w-48 rounded-full border border-(--oboon-border-strong) bg-(--oboon-bg-subtle) blur-2xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-10 left-10 h-40 w-40 rounded-full border border-(--oboon-badge-selected-border) bg-(--oboon-badge-selected-bg) blur-2xl"
          />

          <div className="relative grid gap-8 px-5 py-8 sm:px-8 sm:py-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-stretch lg:px-10 lg:py-12">
            <div className="min-w-0 lg:flex lg:min-h-full lg:items-center">
              <div>
                <p className="mb-3 text-[clamp(3.5rem,12vw,7rem)] leading-none font-semibold tracking-[-0.04em] text-(--oboon-text-title)">
                  404
                </p>
                <h1 className="max-w-[12ch] text-[clamp(1.9rem,4vw,3.5rem)] leading-[1.02] font-semibold tracking-[-0.03em] text-(--oboon-text-title)">
                  아직 준비 중이에요.
                </h1>
                <p className="mt-2 max-w-[34rem] ob-typo-subtitle text-(--oboon-text-muted)">
                  조금만 더 기다려 주세요. 곧 확인하실 수 있도록 준비하고
                  있어요.
                </p>
              </div>
            </div>

            <div className="grid gap-3">
              {QUICK_LINKS.map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-page) p-[1.125rem] transition-[transform,border-color,background-color] duration-200 hover:-translate-y-0.5 hover:border-(--oboon-border-strong) hover:bg-(--oboon-bg-surface)"
                  >
                    <div className="flex items-start gap-3">
                      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle)">
                        <Icon className="h-[1.125rem] w-[1.125rem] text-(--oboon-primary)" />
                      </span>
                      <div className="min-w-0">
                        <p className="ob-typo-subtitle text-(--oboon-text-title)">
                          {item.title}
                        </p>
                        <p className="mt-1 ob-typo-caption text-(--oboon-text-muted)">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      </PageContainer>
    </main>
  );
}
