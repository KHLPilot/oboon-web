// /app/offerings/page.tsx

"use client";

import FilterBar from "@/features/offerings/FilterBar";
import OfferingCard from "@/features/offerings/OfferingCard";
import { MOCK_OFFERINGS } from "@/features/offerings/mock";
import type { Offering } from "@/types/index";
import { use } from "react";

type PageProps = {
  searchParams?: {
    region?: string;
    status?: string;
    q?: string;
    budgetMin?: string;
    budgetMax?: string;
    purpose?: string;
  };
};
function filterOfferings(all: Offering[], sp: PageProps["searchParams"]) {
  const region = sp?.region ?? "전체";
  const status = sp?.status ?? "전체";
  const q = (sp?.q ?? "").trim();

  const budgetMin = sp?.budgetMin ? Number(sp.budgetMin) : null;
  const budgetMax = sp?.budgetMax ? Number(sp.budgetMax) : null;
  const purpose = sp?.purpose ?? null;

  return all.filter((o) => {
    if (region !== "전체" && o.region !== region) return false;
    if (status !== "전체" && o.status !== status) return false;

    // 검색어
    if (q) {
      const hay =
        `${o.title} ${o.addressShort} ${o.region} ${o.status}`.toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }

    // 💰 예산 필터
    if (budgetMin != null && o.priceMax억 != null && o.priceMax억 < budgetMin)
      return false;
    if (budgetMax != null && o.priceMin억 != null && o.priceMin억 > budgetMax)
      return false;

    // 🎯 목적 필터 (mock 기준 tag 활용 or 추후 컬럼화)
    if (purpose && purpose !== "other") {
      if (!o.tags?.includes(purpose)) return false;
    }

    return true;
  });
}

export default async function OfferingsPage({ searchParams }: PageProps) {
  // TODO: 추후 DB 연동 시 여기를 Supabase fetch로 교체
  const all = MOCK_OFFERINGS;
  const items = filterOfferings(all, searchParams);

  return (
    <main className="bg-(--oboon-bg-page)">
      <div className="mx-auto w-full max-w-[1200px] px-5 pt-10 pb-10">
        {/* 헤더 */}
        <div className="mb-4">
          <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-(--oboon-text-title)">
            분양 리스트
          </h1>
          <p className="mt-1 text-[14px] leading-[1.6] text-(--oboon-text-muted)">
            조건에 맞는 분양 정보를 빠르게 찾을 수 있어요.
          </p>
        </div>

        {/* 필터 */}
        <div
          className={[
            "mb-6 rounded-[16px] p-5",
            "bg-(--oboon-bg-surface)",
            "border border-(--oboon-border-default)",
          ].join(" ")}
        >
          <FilterBar />
        </div>

        {/* 결과 요약 */}
        <div className="mb-4 flex items-center justify-between">
          <div className="text-[14px] text-(--oboon-text-muted)">
            총{" "}
            <span className="font-semibold text-(--oboon-text-title)">
              {items.length}
            </span>
            개
          </div>
          {/* TODO: 정렬/지도 보기 */}
        </div>

        {/* 리스트 */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((o) => (
            <OfferingCard key={o.id} offering={o} />
          ))}
        </div>
      </div>
    </main>
  );
}
