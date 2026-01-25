"use client";

import Button from "@/components/ui/Button";

type CommunityTab<K extends string> = {
  key: K;
  label: string;
};

type CommunityTabsProps<K extends string> = {
  tabs: ReadonlyArray<CommunityTab<K>>;
  value: K;
  onChange: (key: K) => void;
};

export default function CommunityTabs<K extends string>({
  tabs,
  value,
  onChange,
}: CommunityTabsProps<K>) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {tabs.map((tab) => {
        const isActive = tab.key === value;
        return (
          <Button
            key={tab.key}
            variant={isActive ? "primary" : "secondary"}
            size="sm"
            shape="pill"
            className={isActive ? "" : "text-(--oboon-text-title)"}
            onClick={() => onChange(tab.key)}
          >
            {tab.label}
          </Button>
        );
      })}
    </div>
  );
}
