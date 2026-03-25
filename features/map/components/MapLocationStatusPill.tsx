import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils/cn";
import type { GeoLocationStatus } from "@/features/map/hooks/useCurrentLocationCenter";

type MapLocationStatusPillProps = {
  status: GeoLocationStatus;
  className?: string;
};

export default function MapLocationStatusPill({
  status,
  className,
}: MapLocationStatusPillProps) {
  if (status !== "pending") return null;

  return (
    <div
      className={cn("pointer-events-none absolute left-4 top-4 z-20", className)}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="inline-flex items-center gap-2 rounded-full border border-(--oboon-primary)/30 bg-(--oboon-bg-surface)/85 px-3 py-2 shadow-[0_12px_28px_rgba(0,0,0,0.28)] backdrop-blur-md">
        <Loader2 className="h-4 w-4 animate-spin text-(--oboon-primary)" />
        <span className="ob-typo-caption whitespace-nowrap font-medium text-(--oboon-text-title)">
          내 위치를 찾는 중
        </span>
      </div>
    </div>
  );
}
