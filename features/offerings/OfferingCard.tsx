// /features/offerings/OfferingCard.tsx
import Link from "next/link";
import type { Offering } from "@/types/index";
import { Badge } from "@/components/ui/Badge";

function formatPrice(o: Offering) {
  const min = o.priceMin억;
  const max = o.priceMax억;
  if (min == null && max == null) return "-";
  if (min != null && max != null) return `${min}억 ~ ${max}억`;
  if (min != null) return `${min}억 ~`;
  return `~ ${max}억`;
}

function statusTone(status: Offering["status"]) {
  // 토스피드 느낌: 너무 튀지 않는 ‘필’ 색
  switch (status) {
    case "분양중":
      return "bg-(--oboon-bg-subtle) text-(--oboon-text-title)";
    case "청약예정":
      return "bg-(--oboon-bg-subtle) text-(--oboon-text-title)";
    case "모집공고":
      return "bg-(--oboon-bg-subtle) text-(--oboon-text-title)";
    case "마감":
      return "bg-(--oboon-bg-subtle) text-(--oboon-text-muted)";
    default:
      return "bg-(--oboon-bg-subtle) text-(--oboon-text-title)";
  }
}

export default function OfferingCard({ offering }: { offering: Offering }) {
  return (
    <Link
      href={`/offerings/${offering.id}`}
      className={[
        "group block overflow-hidden rounded-[16px]",
        "border border-(--oboon-border-default)",
        "bg-(--oboon-bg-surface)",
        "shadow-[0_12px_24px_rgba(0,0,0,0.06)]",
        "transition-transform duration-200",
        "hover:-translate-y-[2px]",
      ].join(" ")}
    >
      {/* 썸네일 */}
      <div className="relative aspect-[16/9] w-full bg-(--oboon-bg-subtle)">
        {offering.imageUrl ? (
          // next/image로 바꿔도 되지만, 우선 깨짐 없는 형태로
          <img
            src={offering.imageUrl}
            alt={offering.title}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full" />
        )}

        {/* 좌측 상단 상태 뱃지 */}
        <div className="absolute left-3 top-3">
          <Badge variant="status" className="backdrop-blur">
            {offering.status}
            {offering.deadlineLabel ? (
              <span className="ml-1 text-(--oboon-text-muted)">
                · {offering.deadlineLabel}
              </span>
            ) : null}
          </Badge>
        </div>

        {/* 우측 상단 메뉴 버튼(더미) */}
        <button
          type="button"
          className={[
            "absolute right-3 top-3",
            "h-9 w-9 rounded-full",
            "bg-(--oboon-bg-surface)/80",
            "border border-(--oboon-border-default)",
            "text-(--oboon-text-muted)",
            "backdrop-blur",
            "opacity-0 group-hover:opacity-100 transition-opacity",
          ].join(" ")}
          aria-label="더보기"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            // TODO: 메뉴/북마크 등
          }}
        >
          …
        </button>
      </div>

      {/* 본문 */}
      <div className="p-5">
        <div className="mb-2 line-clamp-1 text-[18px] font-semibold text-(--oboon-text-title)">
          {offering.title}
        </div>
        <div className="mb-4 line-clamp-1 text-[14px] text-(--oboon-text-muted)">
          {offering.addressShort}
        </div>

        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="text-[16px] font-semibold text-(--oboon-text-title)">
              {formatPrice(offering)}
            </div>
            <div className="text-[12px] text-(--oboon-text-muted)">
              분양가 기준
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
