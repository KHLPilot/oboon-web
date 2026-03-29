import { Skeleton } from "@/components/ui/Skeleton";
import Card from "@/components/ui/Card";
import { cn } from "@/lib/utils/cn";

const TITLE_WIDTHS = ["w-[72%]", "w-[84%]", "w-[68%]"] as const;
const META_WIDTHS = ["w-[56%]", "w-[64%]", "w-[48%]"] as const;
const PRICE_WIDTHS = ["w-[38%]", "w-[46%]", "w-[42%]"] as const;
const CAPTION_WIDTHS = ["w-16", "w-20", "w-14"] as const;
const PILL_WIDTHS = ["w-12", "w-14", "w-16", "w-20"] as const;

function pick<T>(values: readonly T[], seed: number, offset = 0): T {
  return values[(seed + offset) % values.length];
}

function SkeletonPill({
  width,
  className,
}: {
  width: string;
  className?: string;
}) {
  return <Skeleton className={cn("h-5 rounded-full", width, className)} />;
}

function OfferingImageSkeleton() {
  return (
    <div className="relative w-full aspect-video overflow-hidden bg-(--oboon-bg-subtle)">
      <Skeleton className="absolute inset-0 rounded-none" />
      <div className="absolute left-3 top-3 flex flex-wrap items-center gap-1.5">
        <SkeletonPill width="w-14" />
        <SkeletonPill width="w-16" />
      </div>
      <div className="absolute right-3 top-3">
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
    </div>
  );
}

function DefaultDesktopBody({ seed }: { seed: number }) {
  return (
    <div className="px-4 pt-4 pb-4">
      <div className="min-h-[76px] space-y-2">
        <Skeleton className={cn("h-5", pick(TITLE_WIDTHS, seed))} />
        <Skeleton className={cn("h-5", pick(TITLE_WIDTHS, seed, 1))} />
        <Skeleton className={cn("h-4", pick(META_WIDTHS, seed))} />
      </div>

      <div className="mt-4 space-y-1.5">
        <Skeleton className={cn("h-5", pick(PRICE_WIDTHS, seed))} />
        <Skeleton className={cn("h-3", pick(CAPTION_WIDTHS, seed))} />
      </div>
    </div>
  );
}

function DefaultMobileBody({ seed }: { seed: number }) {
  return (
    <div className="space-y-3 p-3 sm:hidden">
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
            <SkeletonPill width={pick(PILL_WIDTHS, seed)} className="shrink-0" />
          </div>
        </div>
      </div>

      <div className="h-px bg-(--oboon-border-default)" />

      <div className="flex flex-wrap items-center gap-1.5">
        <SkeletonPill width={pick(PILL_WIDTHS, seed, 1)} />
        <SkeletonPill width={pick(PILL_WIDTHS, seed, 2)} />
        <SkeletonPill width={pick(PILL_WIDTHS, seed, 3)} />
        <div className="ml-auto">
          <Skeleton className="h-7 w-7 rounded-full" />
        </div>
      </div>
    </div>
  );
}

function MatchedBody({
  compactLayout,
  seed,
}: {
  compactLayout: boolean;
  seed: number;
}) {
  return (
    <div className={cn("flex flex-1 px-3", compactLayout ? "gap-3 py-3" : "gap-3.5 py-3.5")}>
      <Skeleton className="w-[3px] shrink-0 self-stretch rounded-full" />

      <div className="min-w-0 flex-1">
        <div className="flex items-end gap-1.5">
          <Skeleton className={cn(compactLayout ? "h-5 w-16" : "h-6 w-20")} />
          <Skeleton className="h-4 w-12" />
        </div>

        <div className={cn(compactLayout ? "mt-2 min-h-[56px] space-y-2" : "mt-3 min-h-[76px] space-y-2.5")}>
          <Skeleton className={cn("h-5", pick(TITLE_WIDTHS, seed))} />
          <Skeleton className={cn("h-5", pick(TITLE_WIDTHS, seed, 1))} />
          <Skeleton className={cn("h-4", pick(META_WIDTHS, seed))} />
        </div>

        <div className={cn("h-px w-full bg-(--oboon-border-default)", compactLayout ? "mt-2" : "mt-3")} />

        <div className={cn(compactLayout ? "mt-2 space-y-1.5" : "mt-3 space-y-1.5")}>
          <Skeleton className={cn("h-5", pick(PRICE_WIDTHS, seed, 1))} />
          <Skeleton className={cn("h-3", pick(CAPTION_WIDTHS, seed))} />
        </div>

        <div className={cn("flex flex-wrap gap-1.5", compactLayout ? "mt-2" : "mt-3")}>
          <SkeletonPill width={pick(PILL_WIDTHS, seed)} />
          <SkeletonPill width={pick(PILL_WIDTHS, seed, 1)} />
          <SkeletonPill width={pick(PILL_WIDTHS, seed, 2)} />
        </div>
      </div>
    </div>
  );
}

export function OfferingCardSkeleton({
  variant = "default",
  compactLayout = false,
  mobileRecommendationLayout = false,
  seed = 0,
}: {
  variant?: "default" | "matched";
  compactLayout?: boolean;
  mobileRecommendationLayout?: boolean;
  seed?: number;
}) {
  if (variant === "matched") {
    return (
      <div className="h-full">
        <Card className="h-full overflow-hidden border-(--oboon-border-strong) p-0">
          <div className="flex h-full flex-col">
            <OfferingImageSkeleton />
            <MatchedBody compactLayout={compactLayout} seed={seed} />
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full">
      <Card className="h-full overflow-hidden p-0">
        {mobileRecommendationLayout ? (
          <>
            <DefaultMobileBody seed={seed} />

            <div className="hidden sm:block">
              <OfferingImageSkeleton />
              <DefaultDesktopBody seed={seed} />
            </div>
          </>
        ) : (
          <>
            <OfferingImageSkeleton />
            <DefaultDesktopBody seed={seed} />
          </>
        )}
      </Card>
    </div>
  );
}
