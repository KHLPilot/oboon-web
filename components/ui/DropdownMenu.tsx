// components/ui/DropdownMenu.tsx
"use client";

import React, {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { createPortal } from "react-dom";

type Align = "start" | "end" | "center";

type Ctx = {
  open: boolean;
  setOpen: (v: boolean) => void;
  triggerRef: React.RefObject<HTMLElement>;
  triggerClassName?: string;
};

const DropdownMenuContext = createContext<Ctx | null>(null);

function useDropdownMenu() {
  const ctx = useContext(DropdownMenuContext);
  if (!ctx)
    throw new Error(
      "DropdownMenu components must be used within <DropdownMenu />"
    );
  return ctx;
}

export function DropdownMenu({
  children,
  defaultOpen = false,
  onOpenChange,
  triggerClassName,
}: {
  children: React.ReactNode;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  triggerClassName?: string;
}) {
  const [open, setOpenState] = useState(defaultOpen);
  const triggerRef = useRef<HTMLElement>(null);

  const setOpen = useCallback(
    (v: boolean) => {
      setOpenState(v);
      onOpenChange?.(v);
    },
    [onOpenChange]
  );

  const value = useMemo(
    () => ({ open, setOpen, triggerRef, triggerClassName }),
    [open, setOpen, triggerClassName]
  );

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, setOpen]);

  return (
    <DropdownMenuContext.Provider value={value}>
      {children}
    </DropdownMenuContext.Provider>
  );
}

export function DropdownMenuTrigger({
  children,
  asChild = false,
  className = "",
}: {
  children: React.ReactNode;
  asChild?: boolean;
  className?: string;
}) {
  const { open, setOpen, triggerRef, triggerClassName } = useDropdownMenu();
  const mergedClassName = [triggerClassName, className].filter(Boolean).join(" ");

  const onToggle = (e: React.MouseEvent<HTMLElement>) => {
    e.preventDefault();
    setOpen(!open);
  };

  if (asChild) {
    type TriggerElement = React.ReactElement<
      React.HTMLAttributes<HTMLElement> & React.RefAttributes<HTMLElement>
    >;
    const child = React.Children.only(children) as TriggerElement;
    // eslint-disable-next-line react-hooks/refs
    return React.cloneElement(child, {
      ref: (node: HTMLElement | null) => {
        // keep original ref if any
        const originalRef = (
          child as TriggerElement & {
            ref?: React.Ref<HTMLElement>;
          }
        ).ref;
        if (typeof originalRef === "function") originalRef(node);
        else if (originalRef && typeof originalRef === "object")
          (originalRef as React.MutableRefObject<HTMLElement | null>).current =
            node;
        (triggerRef as React.MutableRefObject<HTMLElement | null>).current =
          node;
      },
      className: [child.props?.className, mergedClassName]
        .filter(Boolean)
        .join(" "),
      onClick: (e: React.MouseEvent<HTMLElement>) => {
        child.props?.onClick?.(e);
        if (!e.defaultPrevented) onToggle(e);
      },
      "aria-haspopup": "menu",
      "aria-expanded": open ? "true" : "false",
    });
  }

  return (
    <button
      ref={triggerRef as React.Ref<HTMLButtonElement>}
      type="button"
      className={mergedClassName}
      onClick={onToggle}
      aria-haspopup="menu"
      aria-expanded={open ? "true" : "false"}
    >
      {children}
    </button>
  );
}

export function DropdownMenuContent({
  children,
  align = "end",
  matchTriggerWidth = false,
  className = "",
}: {
  children: React.ReactNode;
  align?: Align;
  matchTriggerWidth?: boolean;
  className?: string;
}) {
  const { open, setOpen, triggerRef } = useDropdownMenu();
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  // click outside to close
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node | null;
      const panel = panelRef.current;
      const trigger = triggerRef.current;

      if (!t) return;
      if (panel?.contains(t)) return;
      if (trigger?.contains(t)) return;
      setOpen(false);
    };

    const captureOptions: AddEventListenerOptions = { capture: true };
    window.addEventListener("pointerdown", onPointerDown, captureOptions);
    return () =>
      window.removeEventListener("pointerdown", onPointerDown, captureOptions);
  }, [open, setOpen, triggerRef]);

  // position: fixed 기준 계산 (open 시 + resize/scroll 반영)
  useEffect(() => {
    if (!open) return;

    const calc = () => {
      const el = triggerRef.current;
      if (!el) return;

      const r = el.getBoundingClientRect();
      const gap = 8;

      // 기본: 트리거 아래로
      const top = r.bottom + gap;

      // align 처리: end는 우측 정렬, start는 좌측 정렬, center는 중앙
      let left = r.left;
      if (align === "end") left = r.right;
      else if (align === "center") left = r.left + r.width / 2;

      setPos({ top, left, width: r.width });
    };

    calc();

    window.addEventListener("resize", calc);
    window.addEventListener("scroll", calc, true); // nested scroll 대응
    return () => {
      window.removeEventListener("resize", calc);
      window.removeEventListener("scroll", calc, true);
    };
  }, [open, align, triggerRef]);

  if (!open || !pos) return null;

  const base =
    "fixed z-[9999] overflow-hidden rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) shadow-lg";

  // 실제 좌표: end는 right 정렬이므로 transform으로 당김
  const style: React.CSSProperties =
    align === "start"
      ? { top: pos.top, left: pos.left, width: matchTriggerWidth ? pos.width : undefined }
      : align === "center"
      ? {
          top: pos.top,
          left: pos.left,
          transform: "translateX(-50%)",
          width: matchTriggerWidth ? pos.width : undefined,
        }
      : {
          top: pos.top,
          left: pos.left,
          transform: "translateX(-100%)",
          width: matchTriggerWidth ? pos.width : undefined,
        };

  return createPortal(
    <div
      ref={panelRef}
      role="menu"
      style={style}
      className={[base, "min-w-40 p-1", className].join(" ")}
    >
      {children}
    </div>,
    document.body
  );
}

export function DropdownMenuItem({
  children,
  onClick,
  className = "",
  destructive = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  destructive?: boolean;
}) {
  const { setOpen } = useDropdownMenu();

  return (
    <button
      type="button"
      role="menuitem"
      className={[
        "w-full px-3 py-2 text-left ob-typo-body",
        destructive
          ? "text-(--oboon-danger) hover:bg-(--oboon-danger-bg)"
          : "text-(--oboon-text-title) hover:bg-(--oboon-bg-subtle)/60",
        className,
      ].join(" ")}
      onClick={() => {
        onClick?.();
        setOpen(false);
      }}
    >
      {children}
    </button>
  );
}
