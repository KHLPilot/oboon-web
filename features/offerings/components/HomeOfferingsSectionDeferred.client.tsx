"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/Skeleton";

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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-3"
          >
            <Skeleton className="h-48 w-full rounded-xl" />
            <div className="mt-3 space-y-2">
              <Skeleton className="h-5 w-4/5" />
              <Skeleton className="h-4 w-3/5" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default HomeOfferingsSection;
