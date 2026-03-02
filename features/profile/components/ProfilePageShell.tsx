"use client";

import type { ReactNode } from "react";

import PageContainer from "@/components/shared/PageContainer";

import UserMenuTabs, { type UserMenuTabItem } from "./UserMenuTabs";

type ProfilePageShellProps<T extends string> = {
  title: string;
  description: ReactNode;
  tabs: readonly UserMenuTabItem<T>[];
  activeTab: T;
  onTabChange: (tab: T) => void;
  children: ReactNode;
};

export default function ProfilePageShell<T extends string>({
  title,
  description,
  tabs,
  activeTab,
  onTabChange,
  children,
}: ProfilePageShellProps<T>) {
  return (
    <main className="bg-(--oboon-bg-page) min-h-full overflow-x-hidden">
      <PageContainer className="pb-6">
        <div className="w-full space-y-6">
          <section className="space-y-1">
            <div className="ob-typo-h1 text-(--oboon-text-title)">{title}</div>
            <p className="mt-1 ob-typo-body text-(--oboon-text-muted)">
              {description}
            </p>
          </section>

          <section className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
            <UserMenuTabs tabs={tabs} activeTab={activeTab} onChange={onTabChange} />
            <div className="min-w-0 space-y-4">{children}</div>
          </section>
        </div>
      </PageContainer>
    </main>
  );
}
