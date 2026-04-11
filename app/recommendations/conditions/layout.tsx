"use client";

import { ChevronLeft } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import type { ReactNode } from "react";

import PageContainer from "@/components/shared/PageContainer";
import WizardStepIndicator from "@/features/recommendations/components/WizardStepIndicator";
import { cn } from "@/lib/utils/cn";

function resolveStep(pathname: string): 0 | 1 | 2 {
  if (pathname.endsWith("/step/1")) return 0;
  if (pathname.endsWith("/step/2")) return 1;
  return 2;
}

function resolveBackPath(pathname: string): string {
  if (pathname.endsWith("/step/1") || pathname.endsWith("/done")) {
    return "/recommendations";
  }
  if (pathname.endsWith("/step/2")) {
    return "/recommendations/conditions/step/1";
  }
  if (pathname.endsWith("/step/3")) {
    return "/recommendations/conditions/step/2";
  }
  return "/recommendations";
}

export default function ConditionsLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isStepRoute = pathname.startsWith("/recommendations/conditions/step/");
  const step = resolveStep(pathname);
  const backPath = resolveBackPath(pathname);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    if (mq.matches) {
      router.replace("/recommendations");
      return;
    }

    const handleChange = (event: MediaQueryListEvent) => {
      if (event.matches) {
        router.replace("/recommendations");
      }
    };

    mq.addEventListener("change", handleChange);
    return () => mq.removeEventListener("change", handleChange);
  }, [router]);

  useEffect(() => {
    if (!isStepRoute) return;

    const mq = window.matchMedia("(max-width: 639px)");
    if (!mq.matches) return;

    const { style: htmlStyle } = document.documentElement;
    const { style: bodyStyle } = document.body;
    const prevHtmlOverflow = htmlStyle.overflow;
    const prevBodyOverflow = bodyStyle.overflow;
    const prevBodyOverscroll = bodyStyle.overscrollBehavior;

    htmlStyle.overflow = "hidden";
    bodyStyle.overflow = "hidden";
    bodyStyle.overscrollBehavior = "none";

    return () => {
      htmlStyle.overflow = prevHtmlOverflow;
      bodyStyle.overflow = prevBodyOverflow;
      bodyStyle.overscrollBehavior = prevBodyOverscroll;
    };
  }, [isStepRoute]);

  return (
    <div
      className={cn(
        "bg-(--oboon-bg-page)",
        isStepRoute ? "flex h-[100dvh] flex-col overflow-hidden" : "min-h-[100dvh]",
      )}
    >
      <div className="shrink-0 bg-(--oboon-bg-surface)/95 backdrop-blur">
        <PageContainer>
          <div className="flex items-center justify-between gap-2 py-1">
            <button
              type="button"
              onClick={() => router.replace(backPath)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-(--oboon-text-muted) transition-colors hover:bg-(--oboon-bg-subtle) hover:text-(--oboon-text-title)"
              aria-label="뒤로가기"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <WizardStepIndicator currentStep={step} />
            <div className="h-8 w-8" aria-hidden="true" />
          </div>
        </PageContainer>
        <div className="h-0.5 bg-(--oboon-border-default)/30">
          <div
            className="h-full bg-(--oboon-primary) transition-[width] duration-500 ease-out"
            style={{ width: `${((step + 1) / 3) * 100}%` }}
          />
        </div>
      </div>

      <PageContainer
        className={cn(
          isStepRoute
            ? "flex min-h-0 flex-1 !pt-4 sm:!pt-4 !pb-[calc(env(safe-area-inset-bottom)+5.5rem)] sm:!pb-4"
            : "pt-6 sm:pt-10 md:pt-10 pb-8 sm:pb-10",
        )}
      >
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
          {children}
        </div>
      </PageContainer>
    </div>
  );
}
