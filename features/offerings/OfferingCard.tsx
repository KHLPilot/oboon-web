"use client";

// /features/offerings/OfferingCard.tsx
import Image from "next/image";
import Link from "next/link";

import type { Offering } from "@/types/index";
import { ROUTES } from "@/types/index";

import Card from "@/components/ui/Card";
import { UXCopy } from "@/shared/uxCopy";
import { formatPriceRange } from "@/shared/price";

import OfferingBadge from "@/features/offerings/OfferingBadges";

function isLikelyImageUrl(url: string | null | undefined) {
  if (!url) return false;
  if (url.startsWith("data:image/")) return true;
  return /\.(jpg|jpeg|png|webp|gif|avif|svg)(\?.*)?$/i.test(url);
}

export default function OfferingCard({ offering }: { offering: Offering }) {
  const priceRange = formatPriceRange(
    offering.priceMin억,
    offering.priceMax억,
    {
      unknownLabel: UXCopy.priceRangeShort,
    }
  );

  // next/image src 타입 안정화
  const normalizedImageUrl =
    typeof offering.imageUrl === "string" ? offering.imageUrl : "";
  const hasValidImage = isLikelyImageUrl(normalizedImageUrl);

  // 지역 배지 값: 프로젝트 내 Offering 형태가 섞여있을 수 있어 안전하게 폴백 처리
  const regionBadge =
    offering.regionLabel ?? offering.region ?? UXCopy.regionShort;

  return (
    <Link
      href={ROUTES.offerings.detail(offering.id)}
      className="group block h-full"
    >
      {/* hover shadow 책임은 Card로 (정책 일관성) */}
      <Card className="p-5 h-full transition hover:shadow-md">
        <div className="-m-5">
          {/* 이미지 영역 */}
          <div className="overflow-hidden rounded-t-2xl rounded-b-none">
            <div className="relative aspect-video w-full bg-(--oboon-bg-subtle)">
              {hasValidImage ? (
                <Image
                  src={normalizedImageUrl}
                  alt={offering.title || "offering"}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                  priority={false}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="absolute inset-0 bg-linear-to-br from-(--oboon-bg-subtle) to-(--oboon-border-default) opacity-40" />
                  <span className="relative ob-typo-caption text-(--oboon-text-muted)">
                    {UXCopy.imagePlaceholder}
                  </span>
                </div>
              )}

              {/* 좌상단 배지 */}
              <div className="absolute left-3 top-3 flex items-center gap-2">
                {/* 지역 배지 */}
                <OfferingBadge type="region" value={regionBadge} />

                {/* 상태 배지 */}
                <OfferingBadge
                  type="status"
                  value={offering.statusValue ?? undefined}
                />

                {/* ✅ type / tag 확장 */}
                {/*
                {offering.type ? (
                  <span className="shrink-0 rounded-full bg-(--oboon-bg-surface)/80 px-2.5 py-1 text-[11px] font-semibold text-(--oboon-text-muted) backdrop-blur">
                    {offering.type}
                  </span>
                ) : null}
                 */}
              </div>
            </div>
          </div>

          {/* 텍스트/배지 영역 */}
          <div className="px-5 pt-4 pb-5">
            <h3 className="ob-typo-h3 text-(--oboon-text-title) line-clamp-2">
              {offering.title}
            </h3>

            <p className="mt-1 ob-typo-body text-(--oboon-text-muted)">
              {offering.addressShort}
            </p>

            <div className="mt-4 flex items-end justify-between gap-3">
              <div>
                <p className="ob-typo-subtitle text-(--oboon-text-title)">
                  {priceRange}
                </p>
                <p className="mt-0.5 ob-typo-caption text-(--oboon-text-muted)">
                  분양가 기준
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
