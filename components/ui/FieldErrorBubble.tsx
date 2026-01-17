"use client";

import React, { useLayoutEffect, useMemo, useState } from "react";

type BubblePosition = { top: number; left: number; width: number };

export type FieldErrorState<TField extends string = string> = {
  field: TField;
  message: string;
  anchorEl: HTMLElement | null;
} | null;

type Props = {
  open: boolean;
  containerEl: HTMLElement | null; // Card element
  anchorEl: HTMLElement | null; // Input element
  id: string; // aria-describedby target
  title?: string;
  message: string;
  offsetPx?: number;
  onClose?: () => void;
};

function cx(...cls: Array<string | false | null | undefined>) {
  return cls.filter(Boolean).join(" ");
}

export default function FieldErrorBubble({
  open,
  containerEl,
  anchorEl,
  id,
  title = "입력 오류",
  message,
  offsetPx = 8,
  onClose,
}: Props) {
  const [pos, setPos] = useState<BubblePosition | null>(null);

  const canMeasure = useMemo(
    () => open && containerEl && anchorEl,
    [open, containerEl, anchorEl]
  );

  useLayoutEffect(() => {
    if (!canMeasure) {
      setPos(null);
      return;
    }

    const measure = () => {
      if (!containerEl || !anchorEl) return;

      const c = containerEl.getBoundingClientRect();
      const a = anchorEl.getBoundingClientRect();

      setPos({
        top: a.bottom - c.top + offsetPx,
        left: a.left - c.left,
        width: a.width,
      });
    };

    measure();

    const onWin = () => measure();
    window.addEventListener("resize", onWin);
    window.addEventListener("scroll", onWin, true);

    return () => {
      window.removeEventListener("resize", onWin);
      window.removeEventListener("scroll", onWin, true);
    };
  }, [canMeasure, containerEl, anchorEl, offsetPx]);

  if (!open || !pos) return null;

  return (
    <div
      className="absolute z-(--oboon-z-header)"
      style={{ top: pos.top, left: pos.left, width: pos.width }}
      role="alert"
      aria-live="polite"
      id={id}
    >
      <div
        className={cx(
          "rounded-xl border px-4 py-3 shadow-(--oboon-shadow-card) backdrop-blur-md",
          "border-(--oboon-danger-border) bg-(--oboon-bg-surface)"
        )}
      >
        <div className="flex items-start gap-2">
          <span
            aria-hidden
            className={cx(
              "mt-1.5 h-2 w-2 rounded-full",
              "bg-(--oboon-danger)",
              "shadow-[0_0_0_2px_color-mix(in_srgb,var(--oboon-danger)_20%,transparent)]"
            )}
          />
          <div className="min-w-0">
            <div className="ob-typo-body text-(--oboon-text-title)">
              {title}
            </div>
            <div className="mt-1 ob-typo-caption text-(--oboon-text-muted)">
              {message}
            </div>
          </div>

          {onClose ? (
            <button
              type="button"
              className="ml-auto shrink-0 ob-typo-caption text-(--oboon-text-muted) hover:text-(--oboon-text-title) transition-colors"
              onClick={onClose}
            >
              닫기
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
