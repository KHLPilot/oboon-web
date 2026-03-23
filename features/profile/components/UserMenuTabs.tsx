"use client";

import Button from "@/components/ui/Button";

export type UserMenuTabItem<T extends string> = {
  id: T;
  label: string;
};

type UserMenuTabsProps<T extends string> = {
  tabs: readonly UserMenuTabItem<T>[];
  activeTab: T;
  onChange: (tab: T) => void;
};

export default function UserMenuTabs<T extends string>({
  tabs,
  activeTab,
  onChange,
}: UserMenuTabsProps<T>) {
  return (
    <>
      {/* ─── 데스크탑: 수직 사이드 내비게이션 ─── */}
      <nav className="hidden lg:block" aria-label="프로필 메뉴">
        <ul className="space-y-0.5">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <li key={tab.id}>
                <button
                  type="button"
                  onClick={() => onChange(tab.id)}
                  className={[
                    "group w-full text-left rounded-xl px-3 py-2 ob-typo-body transition-all duration-150 relative",
                    isActive
                      ? "text-(--oboon-text-title) bg-(--oboon-bg-subtle)"
                      : "text-(--oboon-text-muted) hover:text-(--oboon-text-title) hover:bg-(--oboon-bg-subtle)/60",
                  ].join(" ")}
                  aria-current={isActive ? "page" : undefined}
                >
                  {/* 활성 인디케이터 */}
                  <span
                    className={[
                      "absolute left-0 top-1/2 -translate-y-1/2 w-0.5 rounded-full bg-(--oboon-primary) transition-all duration-200",
                      isActive ? "h-5 opacity-100" : "h-0 opacity-0",
                    ].join(" ")}
                  />
                  <span className="pl-2">{tab.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* ─── 모바일: 수평 스크롤 필 탭 ─── */}
      <div
        className="lg:hidden flex max-w-full gap-1.5 overflow-x-auto scrollbar-none"
        role="tablist"
      >
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            type="button"
            size="sm"
            shape="pill"
            variant={activeTab === tab.id ? "primary" : "secondary"}
            className="shrink-0"
            onClick={() => onChange(tab.id)}
            role="tab"
            aria-selected={activeTab === tab.id}
          >
            {tab.label}
          </Button>
        ))}
      </div>
    </>
  );
}
