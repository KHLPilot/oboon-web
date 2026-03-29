import { Skeleton } from "@/components/ui/Skeleton";
import { OfferingCardSkeleton } from "@/features/offerings/components/OfferingCardSkeleton";
import { cn } from "@/lib/utils/cn";

const TITLE_WIDTHS = ["w-[74%]", "w-[86%]", "w-[68%]"] as const;
const META_WIDTHS = ["w-[58%]", "w-[64%]", "w-[52%]"] as const;
const PRICE_WIDTHS = ["w-[42%]", "w-[50%]", "w-[38%]"] as const;
const METRIC_WIDTHS = ["w-[76%]", "w-[62%]", "w-[70%]"] as const;

function pick<T>(values: readonly T[], seed: number, offset = 0): T {
  return values[(seed + offset) % values.length];
}

export default function RecommendationCardSkeleton({
  size,
  seed = 0,
}: {
  size: "mobile" | "desktop";
  seed?: number;
}) {
  if (size === "desktop") {
    return (
      <div className="h-[29rem] xl:h-[29.5rem]">
        <OfferingCardSkeleton variant="matched" seed={seed} />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-3">
      <div className="space-y-3">
        <div className="grid grid-cols-[72px_minmax(0,1fr)] items-start gap-3">
          <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-xl bg-(--oboon-bg-subtle)">
            <Skeleton className="absolute inset-0 rounded-none" />
          </div>

          <div className="min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className={cn("h-[18px]", pick(TITLE_WIDTHS, seed))} />
                <Skeleton className={cn("h-3.5", pick(META_WIDTHS, seed))} />
                <Skeleton className={cn("mt-2 h-[17px]", pick(PRICE_WIDTHS, seed))} />
              </div>
              <Skeleton className="h-6 w-16 shrink-0 rounded-full" />
            </div>
          </div>
        </div>

        <div className="h-px bg-(--oboon-border-default)" />

        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2.5">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="flex items-center gap-1.5">
                <Skeleton className="h-2.5 w-2.5 shrink-0 rounded-full" />
                <Skeleton
                  className={cn("h-4 flex-1", pick(METRIC_WIDTHS, seed, index))}
                />
              </div>
            ))}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-4 w-14" />
              <Skeleton className="h-4 w-10" />
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
