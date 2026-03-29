import { cn } from "@/lib/utils/cn";

export function Skeleton({
  className,
  animated = true,
}: {
  className?: string;
  animated?: boolean;
}) {
  return (
    <div
      className={cn(animated ? "animate-shimmer" : "", "rounded", className)}
      aria-hidden="true"
    />
  );
}
