"use client";

import { cn } from "@/lib/utils/cn";

type ConditionDirtyBannerProps = {
  onRestoreDefault?: () => void | boolean;
  className?: string;
  message?: string;
  buttonLabel?: string;
};

export default function ConditionDirtyBanner({
  onRestoreDefault,
  className,
  message = "저장된 조건과 다릅니다.",
  buttonLabel = "기본 조건으로",
}: ConditionDirtyBannerProps) {
  if (!onRestoreDefault) return null;

  return (
    <div
      className={cn(
        "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle) px-2.5 py-1.5 sm:px-3 sm:py-2",
        className,
      )}
    >
      <p className="min-w-0 whitespace-nowrap text-[13px] leading-tight text-(--oboon-text-muted) sm:ob-typo-caption">
        {message}
      </p>
      <button
        type="button"
        onClick={() => {
          void onRestoreDefault();
        }}
        className="justify-self-end whitespace-nowrap text-right text-[13px] leading-tight font-medium text-(--oboon-primary) underline underline-offset-4 hover:opacity-70 sm:ob-typo-caption"
      >
        {buttonLabel}
      </button>
    </div>
  );
}
