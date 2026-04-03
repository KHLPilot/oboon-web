"use client";

import { useEffect, useState } from "react";
import { FAQAccordion } from "@/features/support/components/faq/FAQAccordion";
import { FAQCategoryTabs } from "@/features/support/components/faq/FAQCategoryTabs";
import { FAQListSkeleton } from "@/features/support/components/faq/FAQListSkeleton";
import type {
  FAQCategoryKey,
  FAQItemViewModel,
} from "@/features/support/domain/support";

export default function SupportPageClient() {
  const [items, setItems] = useState<FAQItemViewModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] =
    useState<FAQCategoryKey | "all">("all");

  useEffect(() => {
    async function loadFAQ() {
      try {
        const res = await fetch("/api/support/faq");
        if (res.ok) {
          const data = await res.json();
          setItems(data.items ?? []);
        }
      } catch (err) {
        console.error("FAQ 로딩 실패:", err);
      } finally {
        setLoading(false);
      }
    }

    void loadFAQ();
  }, []);

  const filteredItems =
    selectedCategory === "all"
      ? items
      : items.filter((item) => item.categoryKey === selectedCategory);

  return (
    <div>
      <div className="mb-6">
        <FAQCategoryTabs value={selectedCategory} onChange={setSelectedCategory} />
      </div>

      {loading ? <FAQListSkeleton /> : <FAQAccordion items={filteredItems} />}
    </div>
  );
}
