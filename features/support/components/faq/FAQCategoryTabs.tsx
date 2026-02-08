"use client";

import { Button } from "@/components/ui/Button";
import { FAQ_CATEGORIES, type FAQCategoryKey } from "../../domain/support";

type FAQCategoryTabsProps = {
  value: FAQCategoryKey | "all";
  onChange: (key: FAQCategoryKey | "all") => void;
};

const ALL_TAB = { key: "all" as const, label: "전체" };

export function FAQCategoryTabs({ value, onChange }: FAQCategoryTabsProps) {
  const tabs = [ALL_TAB, ...FAQ_CATEGORIES];

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
            onClick={() => onChange(tab.key)}
          >
            {tab.label}
          </Button>
        );
      })}
    </div>
  );
}

export default FAQCategoryTabs;
