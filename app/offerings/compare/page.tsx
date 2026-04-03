// app/offerings/compare/page.tsx
import type { Metadata } from "next";
import Image from "next/image";
import { cn } from "@/lib/utils/cn";
import PageContainer from "@/components/shared/PageContainer";
import { Skeleton } from "@/components/ui/Skeleton";
import CompareSlotGrid from "@/features/offerings/components/compare/CompareSlotGrid.client";
import CompareTable from "@/features/offerings/components/compare/CompareTable";
import CompareCTA from "@/features/offerings/components/compare/CompareCTA";
import {
  COMPARE_SLOTS,
  type CompareSlot,
  type OfferingCompareItem,
} from "@/features/offerings/domain/offering.types";
import {
  getOfferingsForCompare,
  getAvailableOfferingsBasic,
  loadCompareViewerCustomer,
} from "@/features/offerings/services/offering.compare";
import { getScrapedPropertyIds } from "@/features/offerings/services/offeringScrap.service";
import { createSupabaseServer } from "@/lib/supabaseServer";
import { seoDefaultOgImage } from "@/shared/seo";

export const metadata: Metadata = {
  title: "현장 비교",
  description: "분양 현장을 나란히 비교해 최적의 현장을 찾아보세요.",
  alternates: {
    canonical: "/offerings/compare",
  },
  openGraph: {
    title: "현장 비교 | OBOON",
    description: "분양 현장을 나란히 비교해 최적의 현장을 찾아보세요.",
    url: "/offerings/compare",
    images: [seoDefaultOgImage],
  },
  twitter: {
    card: "summary_large_image",
    title: "현장 비교 | OBOON",
    description: "분양 현장을 나란히 비교해 최적의 현장을 찾아보세요.",
    images: [seoDefaultOgImage],
  },
};

interface ComparePageProps {
  searchParams: Promise<{ a?: string; b?: string; c?: string }>;
}

export default async function ComparePage({ searchParams }: ComparePageProps) {
  const params = await searchParams;

  const initialSlots: Partial<Record<CompareSlot, string>> = {};
  if (params.a) initialSlots.a = params.a;
  if (params.b) initialSlots.b = params.b;
  if (params.c) initialSlots.c = params.c;

  const slotIds = COMPARE_SLOTS.map((slot) => initialSlots[slot]).filter(
    (id): id is string => Boolean(id),
  );

  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  const viewerCustomer = user ? await loadCompareViewerCustomer(user.id) : null;

  const [compareItems, availableItems, scrapsResult] = await Promise.all([
    slotIds.length >= 1
      ? getOfferingsForCompare(slotIds, viewerCustomer)
      : Promise.resolve([]),
    getAvailableOfferingsBasic(),
    user
      ? getScrapedPropertyIds(supabase, user.id)
      : Promise.resolve(new Set<number>()),
  ]);

  const scrappedIds = new Set(
    [...scrapsResult].map((propertyId) => String(propertyId)),
  );
  const compareItemById = new Map(compareItems.map((item) => [item.id, item]));
  const slotItems = COMPARE_SLOTS.map((slot) => {
    const id = initialSlots[slot];
    return id ? compareItemById.get(id) ?? null : null;
  });
  const mobileVisibleIndices = slotItems
    .flatMap((item, index) => (item ? [index] : []))
    .slice(0, 2);
  const hasEnoughForTable =
    slotItems.filter((item): item is OfferingCompareItem => item !== null).length >= 2;

  return (
    <PageContainer>
      <div className="mb-4">
        <h1 className="ob-typo-h1 text-(--oboon-text-title)">현장 비교하기</h1>
        <p className="mt-1 ob-typo-body text-(--oboon-text-muted)">
          최대 <span className="md:hidden">2개</span><span className="hidden md:inline">3개</span> 현장을 나란히 비교하고 나에게 맞는 현장을 찾아보세요.
        </p>
      </div>

      <div className="sticky top-16 z-20 border-b border-(--oboon-border-default) backdrop-blur-sm">
        <div className="mx-auto w-full max-w-5xl py-3 md:py-4">
          <CompareSlotGrid
            key={COMPARE_SLOTS.map((slot) => initialSlots[slot] ?? "").join(":")}
            availableItems={availableItems}
            initialSlots={initialSlots}
            scrappedIds={[...scrappedIds]}
          />
        </div>
      </div>

      <div className="mx-auto w-full max-w-5xl">
        {hasEnoughForTable ? (
          <div className="space-y-12 py-12">
            <CompareHeader
              items={slotItems}
              mobileVisibleIndices={mobileVisibleIndices}
            />

            <CompareTable
              items={slotItems}
              mobileVisibleIndices={mobileVisibleIndices}
              viewerLoggedIn={Boolean(user)}
              viewerHasConditionPreset={Boolean(viewerCustomer)}
            />

            <CompareCTA
              items={slotItems}
              mobileVisibleIndices={mobileVisibleIndices}
            />
          </div>
        ) : (
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

function CompareHeader({
  items,
  mobileVisibleIndices,
}: {
  items: Array<OfferingCompareItem | null>;
  mobileVisibleIndices: number[];
}) {
  return (
    <div className="grid grid-cols-1 xs:grid-cols-2 gap-2 md:gap-4 md:grid-cols-3">
      {items.map((item, i) => {
        const hiddenOnMobile = !mobileVisibleIndices.includes(i);

        if (!item) {
          return (
            <div
              key={`empty-${i}`}
              className={cn(
                "rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle)/30 overflow-hidden",
                hiddenOnMobile && "hidden md:block",
              )}
            >
              <Skeleton animated={false} className="aspect-video w-full rounded-none" />
              <div className="px-4 pt-4 pb-4">
                <div className="min-h-[60px] space-y-2">
                  <Skeleton animated={false} className="h-7 w-3/4" />
                  <Skeleton animated={false} className="h-4 w-1/2" />
                </div>
                <div className="mt-3 space-y-2">
                  <Skeleton animated={false} className="h-6 w-2/3" />
                  <Skeleton animated={false} className="h-4 w-1/3" />
                </div>
              </div>
            </div>
          );
        }

        return (
          <div
            key={item.id}
            className={cn(
              "flex flex-col rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) overflow-hidden",
              hiddenOnMobile && "hidden md:flex",
            )}
          >
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
        );
      })}
    </div>
  );
}
