"use client";

import { useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import Button from "@/components/ui/Button";

export default function Modal({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const portalEl = useMemo(() => {
    if (typeof document === "undefined") return null;
    const el = document.createElement("div");
    el.setAttribute("data-oboon-modal-root", "true");
    return el;
  }, []);

  useEffect(() => {
    if (!open || !portalEl) return;

    document.body.appendChild(portalEl);

    // 배경 스크롤 잠금
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

  if (!open || !portalEl) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/60 backdrop-blur"
      onMouseDown={(e) => {
        // 오버레이 클릭 시 닫기 (패널 클릭은 무시)
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-6 shadow-(--oboon-shadow-card)">
        {children}

        <div className="mt-4">
          <Button className="w-full" variant="secondary" onClick={onClose}>
            닫기
          </Button>
        </div>
      </div>
    </div>,
    portalEl
  );
}
