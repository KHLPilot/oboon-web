"use client";

import { ChevronLeft } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import type { ReactNode } from "react";

import PageContainer from "@/components/shared/PageContainer";
import WizardStepIndicator from "@/features/recommendations/components/WizardStepIndicator";

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

  return (
    <div className="min-h-[100dvh] bg-(--oboon-bg-page)">
      <div className="sticky top-0 z-20 border-b border-(--oboon-border-default) bg-(--oboon-bg-surface)/95 backdrop-blur">
        <PageContainer>
          <div className="flex items-center justify-between gap-3 py-3">
            <button
              type="button"
              onClick={() => router.replace(backPath)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-(--oboon-border-default) bg-(--oboon-bg-surface) text-(--oboon-text-title)"
              aria-label="뒤로가기"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <WizardStepIndicator currentStep={step} />
            <div className="h-10 w-10" aria-hidden="true" />
          </div>
        </PageContainer>
      </div>

      <PageContainer>
        <div className="space-y-4 py-4 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
          {children}
        </div>
      </PageContainer>
    </div>
  );
}
