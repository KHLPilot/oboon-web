"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

type BottomSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
};

const EXIT_DURATION_MS = 220;

export default function BottomSheet({
  isOpen,
  onClose,
  children,
  title,
}: BottomSheetProps) {
  const onCloseRef = useRef(onClose);
  const closeTimerRef = useRef<number | null>(null);
  const [portalEl] = useState<HTMLDivElement | null>(() => {
    if (typeof document === "undefined") return null;
    const el = document.createElement("div");
    el.setAttribute("data-oboon-bottom-sheet-root", "true");
    return el;
  });
  const [shouldRender, setShouldRender] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const titleId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!portalEl) return;

    if (isOpen) {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }

      setShouldRender(true);
      const rafId = window.requestAnimationFrame(() => {
        setIsVisible(true);
      });

      return () => {
        window.cancelAnimationFrame(rafId);
      };
    }

    setIsVisible(false);

    if (shouldRender) {
      closeTimerRef.current = window.setTimeout(() => {
        setShouldRender(false);
        closeTimerRef.current = null;
      }, EXIT_DURATION_MS);
    }
  }, [isOpen, portalEl, shouldRender]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!shouldRender || !portalEl) return;

    document.body.appendChild(portalEl);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
      if (portalEl.parentNode) portalEl.parentNode.removeChild(portalEl);
    };
  }, [shouldRender, portalEl]);

  if (!shouldRender || !portalEl) return null;

  return createPortal(
    <div
      className={[
        "fixed inset-0 z-(--oboon-z-modal) flex items-end justify-center bg-(--oboon-overlay) backdrop-blur-sm transition-opacity duration-200 ease-out sm:items-center sm:justify-center sm:p-4",
        isVisible ? "opacity-100" : "opacity-0",
      ]
        .filter(Boolean)
        .join(" ")}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCloseRef.current();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        className={[
          "flex w-full max-h-[90vh] min-h-0 flex-col overflow-hidden border border-b-0 border-(--oboon-border-default) bg-(--oboon-bg-surface) shadow-(--oboon-shadow-card) transition-[transform,opacity] duration-300 ease-out will-change-transform",
          isVisible ? "translate-y-0 opacity-100" : "translate-y-full opacity-0",
          "rounded-t-2xl pb-[calc(env(safe-area-inset-bottom)+1rem)]",
          "sm:w-[min(100%-2rem,560px)] sm:rounded-2xl sm:border sm:pb-0 sm:translate-y-0",
          isVisible ? "sm:scale-100 sm:opacity-100" : "sm:scale-95 sm:opacity-0",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="shrink-0 px-4 pt-3 sm:px-6 sm:pt-6">
          <div className="mx-auto h-1.5 w-12 rounded-full bg-(--oboon-border-default) sm:hidden" />
          {title ? (
            <h2
              id={titleId}
              className="mt-3 ob-typo-h3 text-center text-(--oboon-text-title) sm:mt-0 sm:text-left"
            >
              {title}
            </h2>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-4 sm:px-6 sm:pb-6">
          {children}
        </div>
      </div>
    </div>,
    portalEl,
  );
}
