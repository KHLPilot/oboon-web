"use client";

import { useEffect, useState } from "react";
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
  const [portalEl, setPortalEl] = useState<HTMLDivElement | null>(null);

  // ✅ 마운트 이후에만 portal root 생성 (서버/클라 초기 렌더 일치)
  useEffect(() => {
    const el = document.createElement("div");
    el.setAttribute("data-oboon-modal-root", "true");
    setPortalEl(el);

    return () => {
      // 혹시 남아있으면 정리
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

  // ✅ portalEl이 준비되기 전(서버/초기 클라 렌더)에는 항상 null
  if (!open || !portalEl) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/60 backdrop-blur"
      onMouseDown={(e) => {
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
