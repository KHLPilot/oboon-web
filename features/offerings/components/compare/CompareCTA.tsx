// features/offerings/components/compare/CompareCTA.tsx
import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import type {
  FinalGrade5,
  OfferingCompareItem,
} from "@/features/offerings/domain/offering.types";

interface CompareCTAProps {
  items: OfferingCompareItem[];
}

type CTAConfig = {
  label: string;
  href: string;
  isPrimary: boolean;
};

function resolveCTA(item: OfferingCompareItem): CTAConfig {
  const grade = item.conditionResult as FinalGrade5 | null;

  if (grade === "GREEN" || grade === "LIME") {
    return { label: "상담 예약하기", href: `/offerings/${item.id}`, isPrimary: true };
  }
  if (grade === "YELLOW" || grade === "ORANGE") {
    return { label: "다시 확인하기", href: `/offerings/${item.id}`, isPrimary: false };
  }
  if (grade === "RED") {
    return { label: "다시 검토하기", href: `/offerings/${item.id}`, isPrimary: false };
  }
  return { label: "현장 자세히 보기", href: `/offerings/${item.id}`, isPrimary: false };
}

export default function CompareCTA({ items }: CompareCTAProps) {
  if (items.length < 2) return null;

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
      {items.map((item, i) => {
        const cta = resolveCTA(item);

        return (
          <div key={item.id} className={cn("flex flex-col items-center gap-2 text-center", i >= 2 && "hidden md:flex")}>
            {/* 현장명 */}
            <span
              className="ob-typo-caption font-semibold text-(--oboon-text-muted) truncate max-w-[160px]"
              title={item.name}
            >
              {item.name}
            </span>

            {/* CTA 버튼 */}
            <Link
              href={cta.href}
              className={cn(
                "w-full rounded-full px-5 py-2.5 ob-typo-body font-semibold transition-all",
                cta.isPrimary
                  ? "bg-(--oboon-primary) text-white hover:opacity-90"
                  : "bg-(--oboon-bg-surface) border border-(--oboon-border-default) text-(--oboon-text-title) hover:border-(--oboon-border-hover)",
              )}
            >
              {cta.label}
            </Link>
          </div>
        );
      })}
    </div>
  );
}
