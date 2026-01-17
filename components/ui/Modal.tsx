"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export type ModalSize = "sm" | "md" | "lg";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;

  /** 기본값 true: 우상단 닫기(X) 표시 */
  showCloseIcon?: boolean;

  /**
   * 패널 사이즈 프리셋
   * - sm: 확인/오류 안내 (추천)
   * - md: 기본
   * - lg: 긴 본문/폼
   */
  size?: ModalSize;

  /**
   * 추가 패널 스타일 오버라이드(예: "p-8" 또는 "w-[min(100%-2rem,720px)]")
   * size와 함께 적용되며, 뒤에 붙으므로 같은 속성은 panelClassName이 우선합니다.
   */
  panelClassName?: string;
};

/**
 * 모바일에서도 좌우 여백(=2rem)을 확보하고,
 * 데스크탑에서는 px 기준 max width로 제한합니다.
 * - sm: min(100%-2rem, 420px)
 * - md: min(100%-2rem, 480px)
 * - lg: min(100%-2rem, 560px)
 */
const SIZE_CLASS: Record<ModalSize, string> = {
  sm: "w-[min(100%-2rem,420px)]",
  md: "w-[min(100%-2rem,480px)]",
  lg: "w-[min(100%-2rem,560px)]",
};

export default function Modal({
  open,
  onClose,
  children,
  showCloseIcon = true,
  size = "md",
  panelClassName,
}: ModalProps) {
  const [portalEl, setPortalEl] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = document.createElement("div");
    el.setAttribute("data-oboon-modal-root", "true");
    setPortalEl(el);

    return () => {
      if (el.parentNode) el.parentNode.removeChild(el);
    };
  }, []);

  useEffect(() => {
    if (!open || !portalEl) return;

    document.body.appendChild(portalEl);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
      if (portalEl.parentNode) portalEl.parentNode.removeChild(portalEl);
    };
  }, [open, portalEl, onClose]);

  const panelSizeClass = useMemo(() => SIZE_CLASS[size], [size]);

  if (!open || !portalEl) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-(--oboon-z-modal) flex items-center justify-center bg-(--oboon-overlay) backdrop-blur"
      onMouseDown={(e) => {
        // 배경 클릭 닫기 (패널 클릭은 무시)
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={[
          "relative rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-6 shadow-(--oboon-shadow-card)",
          panelSizeClass,
          panelClassName ?? "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {showCloseIcon ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-(--oboon-bg-surface) hover:bg-(--oboon-bg-subtle)"
          >
            <X className="h-4 w-4 text-(--oboon-text-muted)" />
          </button>
        ) : null}

        {children}
      </div>
    </div>,
    portalEl
  );
}
