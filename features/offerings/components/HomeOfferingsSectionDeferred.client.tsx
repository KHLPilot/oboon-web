"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/Skeleton";
import { OfferingCardSkeleton } from "@/features/offerings/components/OfferingCardSkeleton";

const HomeOfferingsSection = dynamic(
  () => import("@/features/offerings/components/HomeOfferingsSection.client"),
  {
    ssr: false,
    loading: () => <HomeOfferingsSectionSkeleton />,
  },
);

function HomeOfferingsSectionSkeleton() {
  return (
    <section className="space-y-4 rounded-3xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-4 sm:p-6">
      <div className="space-y-2">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>

      <div className="md:hidden">
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <OfferingCardSkeleton
              key={`home-offerings-mobile-${index}`}
              mobileRecommendationLayout
              seed={index}
            />
          ))}
        </div>
      </div>

      <div className="hidden md:block lg:hidden">
        <div className="-mx-4 overflow-visible md:-mx-5">
          <div
            className={[
              "flex gap-3 overflow-x-auto overflow-y-visible px-4 py-3 pb-8 md:gap-4 md:px-5",
              "snap-x snap-mandatory",
              "[-webkit-overflow-scrolling:touch]",
              "scrollbar-none",
              "scroll-pl-4 scroll-pr-4 scroll-pb-8 md:scroll-pl-5 md:scroll-pr-5",
            ].join(" ")}
          >
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={`home-offerings-tablet-${index}`}
                className="w-[calc((100%-1rem)/2)] shrink-0 snap-start"
              >
                <OfferingCardSkeleton seed={index} />
              </div>
            ))}

            <div className="shrink-0 w-4" />
          </div>
        </div>
      </div>

      <div className="hidden lg:grid gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <OfferingCardSkeleton key={`home-offerings-desktop-${index}`} seed={index} />
        ))}
      </div>
    </section>
  );
}

export default HomeOfferingsSection;
