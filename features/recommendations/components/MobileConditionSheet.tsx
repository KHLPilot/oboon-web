"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import RecommendationConditionPanel from "@/features/recommendations/components/RecommendationConditionPanel";
import type {
  OwnedHouseCount,
  RecommendationCondition,
  RecommendationMode,
} from "@/features/recommendations/hooks/useRecommendations";
import { formatManwonPreview } from "@/lib/format/currency";

type MobileConditionSheetProps = {
  condition: RecommendationCondition;
  mode: RecommendationMode;
  errorMessage?: string | null;
  isLoading?: boolean;
  onChange: (patch: Partial<RecommendationCondition>) => void;
  onEvaluate: () => Promise<boolean>;
  onModeChange: (mode: RecommendationMode) => void;
};

function ownedHouseCountLabel(value: OwnedHouseCount) {
  if (value === 0) return "무주택";
  if (value === 1) return "1주택";
  return "2주택 이상";
}

function modeLabel(value: RecommendationMode) {
  return value === "input" ? "직접 입력" : "시뮬레이터";
}

export default function MobileConditionSheet(props: MobileConditionSheetProps) {
  const {
    condition,
    mode,
    errorMessage = null,
    isLoading = false,
    onChange,
    onEvaluate,
    onModeChange,
  } = props;
  const [open, setOpen] = useState(false);

  const summaryLabel = useMemo(
    () =>
      [
        `현금 ${formatManwonPreview(condition.availableCash)}`,
        `소득 ${formatManwonPreview(condition.monthlyIncome)}`,
        ownedHouseCountLabel(condition.ownedHouseCount),
      ].join(" · "),
    [condition.availableCash, condition.monthlyIncome, condition.ownedHouseCount],
  );

  useEffect(() => {
    if (!open) return;

    const mediaQuery = window.matchMedia("(min-width: 640px)");
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleViewportChange = (event: MediaQueryListEvent) => {
      if (event.matches) {
        setOpen(false);
      }
    };

    mediaQuery.addEventListener?.("change", handleViewportChange);

    return () => {
      document.body.style.overflow = previousOverflow;
      mediaQuery.removeEventListener?.("change", handleViewportChange);
    };
  }, [open]);

  async function handleEvaluate() {
    const ok = await onEvaluate();
    if (ok) {
      setOpen(false);
    }
    return ok;
  }

  return (
    <div className="sm:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-3 rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) px-4 py-3 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="ob-typo-body2 text-(--oboon-text-title)">
              추천 조건
            </span>
            <span className="rounded-full bg-(--oboon-bg-subtle) px-2 py-0.5 ob-typo-caption text-(--oboon-text-muted)">
              {modeLabel(mode)}
            </span>
          </div>
          <p className="mt-1 line-clamp-2 ob-typo-caption text-(--oboon-text-muted)">
            {summaryLabel}
          </p>
        </div>
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-(--oboon-border-default) bg-(--oboon-bg-page)">
          <SlidersHorizontal className="h-4 w-4 text-(--oboon-text-muted)" />
        </span>
      </button>

      {open ? (
        <div className="sm:hidden">
          <div
            className="fixed inset-0 z-(--oboon-z-modal) bg-(--oboon-overlay) backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="fixed inset-x-0 bottom-0 z-(--oboon-z-modal) max-h-[88dvh] overflow-y-auto rounded-t-xl border border-b-0 border-(--oboon-border-default) bg-(--oboon-bg-surface) p-5 shadow-(--oboon-shadow-card) pb-[calc(env(safe-area-inset-bottom)+1.25rem)]">
            <div className="mb-4 flex items-center justify-between">
              <div className="ob-typo-h3 text-(--oboon-text-title)">조건 설정</div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-(--oboon-border-default) bg-(--oboon-bg-page)"
                aria-label="조건 설정 닫기"
              >
                <X className="h-4 w-4 text-(--oboon-text-muted)" />
              </button>
            </div>

            <RecommendationConditionPanel
              condition={condition}
              mode={mode}
              errorMessage={errorMessage}
              isLoading={isLoading}
              onChange={onChange}
              onEvaluate={handleEvaluate}
              onModeChange={onModeChange}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
