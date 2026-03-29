// features/offerings/components/compare/CompareCTA.tsx
import Link from "next/link";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
import type {
  OfferingCompareItem,
} from "@/features/offerings/domain/offering.types";

interface CompareCTAProps {
  items: Array<OfferingCompareItem | null>;
  mobileVisibleIndices: number[];
}

type CTAConfig = {
  label: string;
  href: string;
  isPrimary: boolean;
};

function resolveCTA(item: OfferingCompareItem): CTAConfig {
  return {
    label: "현장 상세보기",
    href: `/offerings/${item.id}`,
    isPrimary: true,
  };
}

export default function CompareCTA({
  items,
  mobileVisibleIndices,
}: CompareCTAProps) {
  const selectedCount = items.filter(
    (item): item is OfferingCompareItem => item !== null,
  ).length;
  if (selectedCount < 2) return null;

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
      {items.map((item, i) => {
        const hiddenOnMobile = !mobileVisibleIndices.includes(i);

        if (!item) {
          return (
            <div
              key={`empty-${i}`}
              className={cn(hiddenOnMobile && "hidden md:block")}
            />
          );
        }

        const cta = resolveCTA(item);

        return (
          <div
            key={item.id}
            className={cn(
              "flex flex-col items-center gap-2 text-center",
              hiddenOnMobile && "hidden md:flex",
            )}
          >
            <span
              className="w-full px-2 ob-typo-body font-semibold text-(--oboon-text-muted) truncate"
              title={item.name}
            >
              {item.name}
            </span>

            <Button
              asChild
              variant={cta.isPrimary ? "primary" : "secondary"}
              size="lg"
              shape="pill"
              className="w-full"
            >
              <Link href={cta.href}>{cta.label}</Link>
            </Button>
          </div>
        );
      })}
    </div>
  );
}
