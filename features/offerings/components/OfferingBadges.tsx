// features/offerings/offeringBadges.tsx (또는 OfferingBadges.tsx)
import { Badge } from "@/components/ui/Badge";
import {
  getOfferingBadgeConfig,
  type OfferingBadgeType,
} from "@/features/offerings/domain/offering.badges";
import type { OfferingStatusValue } from "@/features/offerings/domain/offering.types";

type OfferingBadgeProps =
  | {
      type: "status";
      value?: OfferingStatusValue | null;
      className?: string;
    }
  | {
      type: Exclude<OfferingBadgeType, "status">;
      value?: string | null;
      className?: string;
    };

export default function OfferingBadge({
  type,
  value,
  className,
}: OfferingBadgeProps) {
  const config =
    type === "status"
      ? getOfferingBadgeConfig("status", value)
      : getOfferingBadgeConfig(type, value);

  return (
    <Badge
      variant="status"
      className={[config.className, className].filter(Boolean).join(" ")}
    >
      {config.label}
    </Badge>
  );
}
