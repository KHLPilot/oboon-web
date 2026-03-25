// app/offerings/compare/page.tsx
import type { Metadata } from "next";
import Image from "next/image";
import { cn } from "@/lib/utils/cn";
import PageContainer from "@/components/shared/PageContainer";
import CompareSlotGrid from "@/features/offerings/components/compare/CompareSlotGrid.client";
import CompareTable from "@/features/offerings/components/compare/CompareTable";
import CompareCTA from "@/features/offerings/components/compare/CompareCTA";
import {
  getOfferingsForCompare,
  getAvailableOfferingsBasic,
} from "@/features/offerings/services/offering.compare";
import { getScrapedPropertyIds } from "@/features/offerings/services/offeringScrap.service";
import { createSupabaseServer } from "@/lib/supabaseServer";

export const metadata: Metadata = {
  title: "현장 비교 | OBOON",
  description: "분양 현장을 나란히 비교해 최적의 현장을 찾아보세요.",
};

interface ComparePageProps {
  searchParams: Promise<{ a?: string; b?: string; c?: string }>;
}

export default async function ComparePage({ searchParams }: ComparePageProps) {
  const params = await searchParams;

  const slotIds = [params.a, params.b, params.c].filter(
    (id): id is string => Boolean(id),
  );

  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  const [compareItems, availableItems, scrapsResult] = await Promise.all([
    slotIds.length >= 1
      ? getOfferingsForCompare(slotIds)
      : Promise.resolve([]),
    getAvailableOfferingsBasic(),
    user
      ? getScrapedPropertyIds(supabase, user.id)
      : Promise.resolve(new Set<number>()),
  ]);

  const scrappedIds = new Set(
    [...scrapsResult].map((propertyId) => String(propertyId)),
  );

  const initialSlots: Partial<Record<"a" | "b" | "c", string>> = {};
  if (params.a) initialSlots.a = params.a;
  if (params.b) initialSlots.b = params.b;
  if (params.c) initialSlots.c = params.c;

  const hasEnoughForTable = compareItems.length >= 2;

  return (
    <PageContainer>
      {/* ── 페이지 헤더 ────────────────────────────────────────────── */}
      <div className="mb-4">
        <h1 className="ob-typo-h1 text-(--oboon-text-title)">현장 비교하기</h1>
        <p className="mt-1 ob-typo-body text-(--oboon-text-muted)">
          최대 <span className="md:hidden">2개</span><span className="hidden md:inline">3개</span> 현장을 나란히 비교하고 나에게 맞는 현장을 찾아보세요.
        </p>
      </div>

      {/* ── 슬롯 선택 ───────────────────────────────────────────────── */}
      {/*
        Apple처럼 선택 영역이 스크롤 시 sticky하게 상단 고정되도록
        position: sticky는 CompareSlotGrid를 래핑하는 이 컨테이너에 적용
      */}
      <div className="sticky top-16 z-20 border-b border-(--oboon-border-default) backdrop-blur-sm">
        <div className="mx-auto w-full max-w-5xl py-3 md:py-4">
          <CompareSlotGrid
            availableItems={availableItems}
            initialSlots={initialSlots}
            scrappedIds={[...scrappedIds]}
          />
        </div>
      </div>

      {/* ── 비교 영역 ───────────────────────────────────────────────── */}
      <div className="mx-auto w-full max-w-5xl">
        {hasEnoughForTable ? (
          <div className="space-y-12 py-12">

            {/* 선택된 현장 헤더 카드 — Apple의 제품 이미지+가격 영역 */}
            <CompareHeader items={compareItems} />

            {/* 비교 테이블 */}
            <CompareTable items={compareItems} />

            {/* CTA */}
            <CompareCTA items={compareItems} />

          </div>
        ) : (
          /* 빈 상태 안내 */
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="ob-typo-h3 font-semibold text-(--oboon-text-title)">
              현장을 선택해주세요
            </div>
            <p className="mt-2 ob-typo-body text-(--oboon-text-muted) max-w-xs">
              위 선택창에서 비교하고 싶은 분양 현장을 2개 이상 선택하면 상세 비교 결과를 볼 수 있습니다.
            </p>
          </div>
        )}
      </div>
    </PageContainer>
  );
}

// ─── 선택된 현장 헤더 카드 ────────────────────────────────────────────────────

function CompareHeader({ items }: { items: Awaited<ReturnType<typeof getOfferingsForCompare>> }) {
  return (
    <div className="grid grid-cols-2 gap-2 md:gap-4 md:grid-cols-3">
      {items.map((item, i) => (
        <div
          key={item.id}
          className={cn(
            "flex flex-col rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) overflow-hidden",
            i >= 2 && "hidden md:flex",
          )}
        >
          {/* 현장 사진 — 16:9, 상태 배지 오버레이 */}
          <div className="relative w-full aspect-video bg-(--oboon-bg-subtle)">
            {item.imageUrl ? (
              <Image
                src={item.imageUrl}
                alt={item.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 50vw, 33vw"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="absolute inset-0 bg-linear-to-br from-(--oboon-bg-subtle) to-(--oboon-border-default) opacity-40" />
                <span className="relative ob-typo-caption text-(--oboon-text-muted)">사진 없음</span>
              </div>
            )}
          </div>

          {/* 텍스트 영역 — OfferingCard 기본 레이아웃 동일 */}
          <div className="px-4 pt-4 pb-4">
            <div className="min-h-[60px]">
              <h2 className="ob-typo-h3 text-(--oboon-text-title) truncate">
                {item.name}
              </h2>
              <p className="mt-0.5 line-clamp-1 ob-typo-body text-(--oboon-text-muted)">
                {item.location}
              </p>
            </div>
            <div className="mt-3">
              <p className="ob-typo-subtitle text-(--oboon-text-title)">
                {(() => {
                  const [min, max] = item.priceRange.split(" ~ ");
                  return max
                    ? <>{min}<br className="md:hidden" /><span className="md:before:content-['_~_'] before:content-['~_']">{max}</span></>
                    : item.priceRange;
                })()}
              </p>
              <p className="mt-0.5 ob-typo-caption text-(--oboon-text-muted)">
                {item.pricePerPyeong}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
