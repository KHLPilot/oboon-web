"use client";

import * as React from "react";
import { createPortal } from "react-dom";

import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";

export type DialogBaseProps = {
  open: boolean;
  title: string;
  description?: string | React.ReactNode;
  onClose: () => void;
  className?: string;
};

export type DialogAlertProps = DialogBaseProps & {
  confirmLabel?: string;
  onConfirm?: () => void;
};

export type DialogConfirmProps = DialogBaseProps & {
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  destructive?: boolean;
};

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function useDialogLifecycle(
  open: boolean,
  onClose: () => void,
) {
  const onCloseRef = React.useRef(onClose);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const previousActiveElementRef = React.useRef<HTMLElement | null>(null);
  const [portalEl] = React.useState<HTMLDivElement | null>(() => {
    if (typeof document === "undefined") return null;
    const el = document.createElement("div");
    el.setAttribute("data-oboon-dialog-root", "true");
    return el;
  });
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  React.useEffect(() => {
    if (!open || !portalEl) return;

    previousActiveElementRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    document.body.appendChild(portalEl);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInputElement =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      if (e.key === "Tab") {
        const panel = panelRef.current;
        if (!panel) return;

        const focusableElements = Array.from(
          panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
        );

        e.preventDefault();

        if (focusableElements.length === 0) {
          panel.focus();
          return;
        }

        const currentElement =
          document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;
        const currentIndex = currentElement
          ? focusableElements.indexOf(currentElement)
          : -1;
        const lastIndex = focusableElements.length - 1;

        if (e.shiftKey) {
          if (currentIndex <= 0) {
            focusableElements[lastIndex]?.focus();
            return;
          }
          focusableElements[currentIndex - 1]?.focus();
          return;
        }

        if (currentIndex === -1 || currentIndex >= lastIndex) {
          focusableElements[0]?.focus();
          return;
        }

        focusableElements[currentIndex + 1]?.focus();
        return;
      }

      if (e.key === "Escape" && !isInputElement) {
        onCloseRef.current();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    const rafId = window.requestAnimationFrame(() => {
      setIsVisible(true);
      const focusableElements = Array.from(
        panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? [],
      );
      if (focusableElements.length > 0) {
        focusableElements[0]?.focus();
      } else {
        panelRef.current?.focus();
      }
    });

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("keydown", onKeyDown);
      setIsVisible(false);
      document.body.style.overflow = prevOverflow;
      if (portalEl.parentNode) portalEl.parentNode.removeChild(portalEl);
      previousActiveElementRef.current?.focus();
    };
  }, [open, portalEl]);

  return {
    onCloseRef,
    panelRef,
    portalEl,
    isVisible,
  };
}

function DialogAlert({
  open,
  title,
  description,
  onClose,
  className,
  confirmLabel = "확인",
  onConfirm,
}: DialogAlertProps) {
  const { onCloseRef, panelRef, portalEl, isVisible } =
    useDialogLifecycle(open, onClose);

  if (!open || !portalEl) return null;

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-(--oboon-z-modal) flex items-center justify-center bg-(--oboon-overlay) opacity-0 transition-opacity duration-150",
        isVisible && "opacity-100",
      )}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCloseRef.current();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className={cn(
          "w-[min(100%-3rem,320px)] rounded-2xl bg-(--oboon-bg-surface) opacity-0 scale-95 transition-[transform,opacity] duration-150",
          isVisible && "opacity-100 scale-100",
          className,
        )}
      >
        <div className="px-6 pt-6">
          <h2 className="ob-typo-title3 text-center text-(--oboon-text-default)">
            {title}
          </h2>
          {description ? (
            typeof description === "string" ? (
              <p className="mt-2 text-center ob-typo-body2 text-(--oboon-text-muted)">
                {description}
              </p>
            ) : (
              <div className="mt-2 text-center ob-typo-body2 text-(--oboon-text-muted)">
                {description}
              </div>
            )
          ) : null}
        </div>

        <div className="mt-4 border-t border-(--oboon-border-subtle)">
          <Button
            type="button"
            variant="ghost"
            className="h-12 w-full rounded-none text-(--oboon-primary)"
            onClick={() => {
              if (onConfirm) {
                onConfirm();
                return;
              }
              onCloseRef.current();
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    portalEl,
  );
}

function DialogConfirm({
  open,
  title,
  description,
  onClose,
  className,
  confirmLabel = "확인",
  cancelLabel = "취소",
  onConfirm,
  destructive = false,
}: DialogConfirmProps) {
  const { onCloseRef, panelRef, portalEl, isVisible } =
    useDialogLifecycle(open, onClose);

  if (!open || !portalEl) return null;

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-(--oboon-z-modal) flex items-center justify-center bg-(--oboon-overlay) opacity-0 transition-opacity duration-150",
        isVisible && "opacity-100",
      )}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCloseRef.current();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className={cn(
          "w-[min(100%-3rem,320px)] rounded-2xl bg-(--oboon-bg-surface) opacity-0 scale-95 transition-[transform,opacity] duration-150",
          isVisible && "opacity-100 scale-100",
          className,
        )}
      >
        <div className="px-6 pt-6">
          <h2 className="ob-typo-title3 text-center text-(--oboon-text-default)">
            {title}
          </h2>
          {description ? (
            typeof description === "string" ? (
              <p className="mt-2 text-center ob-typo-body2 text-(--oboon-text-muted)">
                {description}
              </p>
            ) : (
              <div className="mt-2 text-center ob-typo-body2 text-(--oboon-text-muted)">
                {description}
              </div>
            )
          ) : null}
        </div>

        <div className="mt-4 flex border-t border-(--oboon-border-subtle)">
          <Button
            type="button"
            variant="ghost"
            className="h-12 flex-1 rounded-none border-r border-(--oboon-border-subtle) text-(--oboon-text-muted)"
            onClick={() => onCloseRef.current()}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className={cn("h-12 flex-1 rounded-none", destructive ? "text-(--oboon-danger)" : "text-(--oboon-primary)")}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    portalEl,
  );
}

type DialogCompound = {
  Alert: typeof DialogAlert;
  Confirm: typeof DialogConfirm;
};

const Dialog = {
  Alert: DialogAlert,
  Confirm: DialogConfirm,
} satisfies DialogCompound;

export default Dialog;
