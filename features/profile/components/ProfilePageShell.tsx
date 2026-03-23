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
    // overflow-x: clip — overflow-x: hidden과 달리 새 스크롤 컨텍스트를 만들지 않아 sticky가 정상 동작
    <main className="bg-(--oboon-bg-page) min-h-full [overflow-x:clip]">
      <PageContainer className="pb-10">
        <div className="lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10 lg:items-start">

          {/* ─── 데스크탑 사이드바 (sticky) ─── */}
          <aside className="hidden lg:flex flex-col gap-6 sticky top-[calc(var(--oboon-header-offset)+1.5rem)]">
            <div className="space-y-1.5">
              <h1 className="ob-typo-h1 text-(--oboon-text-title)">{title}</h1>
              <p className="ob-typo-body text-(--oboon-text-muted)">{description}</p>
            </div>
            <div className="h-px bg-(--oboon-border-default)" />
            <UserMenuTabs tabs={tabs} activeTab={activeTab} onChange={onTabChange} />
          </aside>

          {/* ─── 콘텐츠 영역 ─── */}
          <div className="min-w-0">

            {/* 모바일 전용: 페이지 타이틀 (스크롤됨) */}
            <div className="lg:hidden space-y-1 mb-4">
              <h1 className="ob-typo-h1 text-(--oboon-text-title)">{title}</h1>
              <p className="ob-typo-body text-(--oboon-text-muted)">{description}</p>
            </div>

            {/* 모바일 전용: sticky 탭 바 */}
            {/* -mx + px 트릭으로 PageContainer 좌우 패딩을 깨고 전체 폭 차지 */}
            <div className="lg:hidden sticky top-[var(--oboon-header-offset)] z-30 -mx-4 sm:-mx-5 px-4 sm:px-5 bg-(--oboon-bg-page) border-b border-(--oboon-border-default) py-2.5 mb-6">
              <UserMenuTabs tabs={tabs} activeTab={activeTab} onChange={onTabChange} />
            </div>

            {/* 탭 콘텐츠 */}
            <div className="space-y-4">{children}</div>
          </div>

        </div>
      </PageContainer>
    </main>
  );
}
