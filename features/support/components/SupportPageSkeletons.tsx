import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils/cn";
import { FAQListSkeleton } from "@/features/support/components/faq/FAQListSkeleton";
import { QnADetailSkeleton } from "@/features/support/components/qna/QnADetailSkeleton";
import { QnAListSkeleton } from "@/features/support/components/qna/QnAListSkeleton";

function SupportHeaderSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-8 w-40 rounded-lg" />
      <Skeleton className="h-4 w-72 rounded-lg" />
    </div>
  );
}

function SupportTabsSkeleton() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {Array.from({ length: 6 }).map((_, index) => (
        <Skeleton
          key={`support-tab-${index}`}
          className={cn("h-9 rounded-full", index === 0 ? "w-16" : index % 2 === 0 ? "w-20" : "w-24")}
        />
      ))}
    </div>
  );
}

export function SupportPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <SupportHeaderSkeleton />
        <SupportTabsSkeleton />
      </div>
      <FAQListSkeleton />
    </div>
  );
}

export function SupportQnAListPageSkeleton() {
  return (
    <div className="space-y-6">
      <SupportHeaderSkeleton />
      <QnAListSkeleton />
    </div>
  );
}

export function SupportQnADetailPageSkeleton() {
  return (
    <QnADetailSkeleton />
  );
}
