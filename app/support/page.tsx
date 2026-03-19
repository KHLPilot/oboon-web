"use client";

import { useState, useEffect } from "react";
import { FAQCategoryTabs } from "@/features/support/components/faq/FAQCategoryTabs";
import { FAQAccordion } from "@/features/support/components/faq/FAQAccordion";
import { FAQListSkeleton } from "@/features/support/components/faq/FAQListSkeleton";
import type { FAQItemViewModel, FAQCategoryKey } from "@/features/support/domain/support";

export default function SupportFAQPage() {
  const [items, setItems] = useState<FAQItemViewModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<FAQCategoryKey | "all">("all");

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
    loadFAQ();
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

      {loading ? (
        <FAQListSkeleton />
      ) : (
        <FAQAccordion items={filteredItems} />
      )}
    </div>
  );
}
