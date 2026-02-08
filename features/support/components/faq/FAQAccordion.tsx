"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { FAQItemViewModel } from "../../domain/support";

type FAQAccordionProps = {
  items: FAQItemViewModel[];
};

export function FAQAccordion({ items }: FAQAccordionProps) {
  const [openId, setOpenId] = useState<string | null>(null);

  const toggle = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  if (items.length === 0) {
    return (
      <div className="py-12 text-center text-(--oboon-text-muted)">
        등록된 FAQ가 없습니다.
      </div>
    );
  }

  return (
    <div className="divide-y divide-(--oboon-border-default)">
      {items.map((item) => {
        const isOpen = openId === item.id;

        return (
          <div key={item.id} className="py-4">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-4 text-left"
              onClick={() => toggle(item.id)}
              aria-expanded={isOpen}
            >
              <div className="flex-1">
                <span className="mr-2 rounded-md bg-(--oboon-bg-subtle) px-2 py-0.5 text-xs text-(--oboon-text-muted)">
                  {item.categoryName}
                </span>
                <span className="ob-typo-body-md text-(--oboon-text-title)">
                  {item.question}
                </span>
              </div>
              <ChevronDown
                className={`h-5 w-5 flex-shrink-0 text-(--oboon-text-muted) transition-transform duration-200 ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {isOpen && (
              <div className="mt-3 pl-0 md:pl-4">
                <div className="rounded-lg bg-(--oboon-bg-subtle) p-4 text-(--oboon-text-body) ob-typo-body-sm whitespace-pre-wrap">
                  {item.answer}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default FAQAccordion;
