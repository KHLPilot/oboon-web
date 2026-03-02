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
      <aside className="hidden lg:block h-fit">
        <div className="rounded-2xl">
          <div className="space-y-0.5">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => onChange(tab.id)}
                className={[
                  "w-full text-left py-1.5 rounded-xl ob-typo-body transition-colors relative",
                  activeTab === tab.id
                    ? "text-(--oboon-text-title)"
                    : "text-(--oboon-text-muted) hover:text-(--oboon-text-title)",
                ].join(" ")}
              >
                <span
                  className={[
                    "relative block pl-5 pr-2 py-0.5 rounded-lg",
                    activeTab === tab.id ? "bg-(--oboon-bg-subtle) py-1" : "",
                  ].join(" ")}
                >
                  {activeTab === tab.id && (
                    <span className="absolute left-0 top-0 bottom-0 w-1 rounded-full bg-(--oboon-primary)" />
                  )}
                  {tab.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </aside>

      <div className="lg:hidden">
        <div className="flex max-w-full gap-2 overflow-x-auto pb-2 scrollbar-none">
          {tabs.map((tab) => (
            <Button
              key={tab.id}
              type="button"
              size="sm"
              shape="pill"
              variant={activeTab === tab.id ? "primary" : "secondary"}
              className="shrink-0"
              onClick={() => onChange(tab.id)}
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </div>
    </>
  );
}
