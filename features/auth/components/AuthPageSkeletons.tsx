import PageContainer from "@/components/shared/PageContainer";
import Card from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import type { ReactNode } from "react";

function AuthShell({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <main className="min-h-dvh overflow-x-hidden bg-(--oboon-bg-page) text-(--oboon-text-title)">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(1200px_600px_at_50%_0%,rgba(64,112,255,0.18),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(800px_500px_at_50%_30%,rgba(0,200,180,0.10),transparent_65%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(900px_700px_at_50%_100%,rgba(255,255,255,0.06),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_40%,rgba(0,0,0,0.55)_100%)]" />
      </div>

      <PageContainer variant="full" className="relative overflow-hidden">
        <div className="w-full max-w-105 -translate-y-4 sm:translate-y-0">
          {children}
        </div>
      </PageContainer>
    </main>
  );
}

function AuthTitleSkeleton({
  titleWidth = "w-32",
  subtitleWidth = "w-72",
}: {
  titleWidth?: string;
  subtitleWidth?: string;
}) {
  return (
    <div className="mb-4 sm:mb-5 text-center space-y-2">
      <Skeleton className={`mx-auto h-10 ${titleWidth} rounded-xl`} />
      <Skeleton className={`mx-auto h-5 ${subtitleWidth} max-w-full rounded-lg`} />
    </div>
  );
}

function AuthFieldSkeleton({ labelWidth = "w-14" }: { labelWidth?: string }) {
  return (
    <div className="space-y-2">
      <Skeleton className={`h-4 ${labelWidth}`} />
      <Skeleton className="h-11 w-full rounded-xl" />
    </div>
  );
}

function AuthButtonSkeleton({ widthClass = "w-full" }: { widthClass?: string }) {
  return <Skeleton className={`h-11 rounded-full ${widthClass}`} />;
}

export function LoginPageSkeleton() {
  return (
    <AuthShell>
      <AuthTitleSkeleton titleWidth="w-28" subtitleWidth="w-56" />

      <Card className="border border-(--oboon-border-default) p-6">
        <div className="space-y-4">
          <AuthFieldSkeleton labelWidth="w-12" />
          <AuthFieldSkeleton labelWidth="w-16" />
          <AuthButtonSkeleton />
          <AuthButtonSkeleton />

          <div className="mt-6 flex items-center gap-3">
            <Skeleton className="h-px flex-1" />
            <Skeleton className="h-4 w-16 rounded-lg" />
            <Skeleton className="h-px flex-1" />
          </div>

          <div className="space-y-2">
            <AuthButtonSkeleton />
            <AuthButtonSkeleton />
          </div>

          <Skeleton className="mt-5 h-9 w-72 max-w-full rounded-lg mx-auto" />
        </div>
      </Card>

      <Skeleton className="mx-auto mt-4 h-5 w-52 rounded-lg" />
    </AuthShell>
  );
}

export function SignupPageSkeleton() {
  return (
    <AuthShell>
      <AuthTitleSkeleton titleWidth="w-32" subtitleWidth="w-64" />

      <Card className="border border-(--oboon-border-default) p-6">
        <div className="space-y-4">
          <AuthFieldSkeleton labelWidth="w-20" />
          <AuthFieldSkeleton labelWidth="w-16" />
          <AuthFieldSkeleton labelWidth="w-18" />
          <AuthButtonSkeleton />

          <div className="mt-4 space-y-3 rounded-2xl border border-(--oboon-border-default) p-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={`signup-term-${index}`} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4 rounded-sm" />
                  <Skeleton className="h-4 w-44 rounded-lg" />
                </div>
                <Skeleton className="h-4 w-16 rounded-lg" />
              </div>
            ))}
          </div>

          <AuthButtonSkeleton />
        </div>
      </Card>
    </AuthShell>
  );
}

export function SignupProfilePageSkeleton() {
  return (
    <AuthShell>
      <AuthTitleSkeleton titleWidth="w-40" subtitleWidth="w-80" />

      <Card className="border border-(--oboon-border-default) p-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="order-2 space-y-4 lg:order-1">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <AuthFieldSkeleton labelWidth="w-12" />
              <AuthFieldSkeleton labelWidth="w-16" />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <AuthFieldSkeleton labelWidth="w-14" />
              <AuthFieldSkeleton labelWidth="w-16" />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <AuthFieldSkeleton labelWidth="w-8" />
              <AuthFieldSkeleton labelWidth="w-20" />
              <AuthFieldSkeleton labelWidth="w-16" />
            </div>
            <AuthFieldSkeleton labelWidth="w-18" />
            <AuthButtonSkeleton />
          </div>

          <div className="order-1 space-y-3 lg:order-2">
            <Skeleton className="h-4 w-20 rounded-lg" />
            <Skeleton className="h-64 w-full rounded-full" />
            <Skeleton className="mx-auto h-8 w-8 rounded-full" />
          </div>
        </div>
      </Card>
    </AuthShell>
  );
}

export function RestorePageSkeleton() {
  return (
    <AuthShell>
      <AuthTitleSkeleton titleWidth="w-36" subtitleWidth="w-80" />

      <div className="space-y-4">
        {Array.from({ length: 2 }).map((_, index) => (
          <Card key={`restore-${index}`} className="border border-(--oboon-border-default) p-5">
            <div className="flex items-start gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-6 w-28 rounded-lg" />
                <Skeleton className="h-4 w-full rounded-lg" />
                <Skeleton className="h-4 w-4/5 rounded-lg" />
                <Skeleton className="h-10 w-full rounded-full" />
              </div>
            </div>
          </Card>
        ))}

        <AuthButtonSkeleton />
      </div>
    </AuthShell>
  );
}

export function OnboardingPageSkeleton() {
  return (
    <AuthShell>
      <AuthTitleSkeleton titleWidth="w-44" subtitleWidth="w-80" />

      <Card className="border border-(--oboon-border-default) p-6">
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <AuthFieldSkeleton labelWidth="w-12" />
            <AuthFieldSkeleton labelWidth="w-14" />
          </div>
          <AuthFieldSkeleton labelWidth="w-16" />
          <AuthFieldSkeleton labelWidth="w-16" />

          <div className="space-y-3 rounded-2xl border border-(--oboon-border-default) p-4">
            <Skeleton className="h-5 w-24 rounded-lg" />
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={`agreement-${index}`} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4 rounded-sm" />
                  <Skeleton className="h-4 w-48 rounded-lg" />
                </div>
                <Skeleton className="h-4 w-16 rounded-lg" />
              </div>
            ))}
          </div>

          <AuthButtonSkeleton />
        </div>
      </Card>
    </AuthShell>
  );
}

export function AuthCallbackPageSkeleton() {
  return (
    <AuthShell>
      <AuthTitleSkeleton titleWidth="w-36" subtitleWidth="w-64" />

      <Card className="border border-(--oboon-border-default) p-6">
        <div className="space-y-3 text-center">
          <Skeleton className="mx-auto h-7 w-44 rounded-xl" />
          <Skeleton className="mx-auto h-4 w-72 max-w-full rounded-lg" />
          <Skeleton className="mx-auto h-4 w-56 max-w-full rounded-lg" />
          <Skeleton className="mx-auto h-4 w-40 max-w-full rounded-lg" />
        </div>
      </Card>
    </AuthShell>
  );
}
