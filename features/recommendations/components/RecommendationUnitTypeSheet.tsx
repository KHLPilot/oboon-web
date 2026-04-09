"use client";

import Link from "next/link";
import { X } from "lucide-react";

import Button from "@/components/ui/Button";
import type { RecommendationItem } from "@/features/recommendations/hooks/useRecommendations";
import { ROUTES } from "@/types/index";

import RecommendationUnitTypePanel from "./RecommendationUnitTypePanel";

type RecommendationUnitTypeSheetProps = {
  item: RecommendationItem | null;
  onClose: () => void;
};

export default function RecommendationUnitTypeSheet(
  props: RecommendationUnitTypeSheetProps,
) {
  const { item, onClose } = props;
  if (!item) return null;

  return (
    <div className="sm:hidden">
      <div
        className="fixed inset-0 z-(--oboon-z-modal) bg-(--oboon-overlay) backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="fixed inset-x-0 bottom-0 z-(--oboon-z-modal) max-h-[88dvh] rounded-t-2xl border border-b-0 border-(--oboon-border-default) bg-(--oboon-bg-surface) shadow-(--oboon-shadow-card)">
        <div className="flex items-center justify-between gap-3 border-b border-(--oboon-border-default) px-5 py-4">
          <div className="min-w-0">
            <p className="ob-typo-caption text-(--oboon-text-muted)">
              추천 순 타입별 정보
            </p>
            <h3 className="mt-1 line-clamp-2 ob-typo-subtitle text-(--oboon-text-title)">
              {item.property.name}
            </h3>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 rounded-full p-0"
            aria-label="닫기"
            onClick={onClose}
          >
            <X className="h-4 w-4 text-(--oboon-text-muted)" />
          </Button>
        </div>

        <div className="max-h-[64dvh] overflow-y-auto px-5 py-4">
          <RecommendationUnitTypePanel
            item={item}
            mobile
            maxItems={2}
            heading="추천 순 타입별 정보"
            showPropertyName={false}
            footerNote="더 많은 타입은 현장 상세에서 확인"
          />
        </div>

        <div className="border-t border-(--oboon-border-default) px-5 py-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          <Button asChild variant="primary" shape="pill" className="w-full">
            <Link href={ROUTES.offerings.detail(item.property.id)} onClick={onClose}>
              현장 상세 보기
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
