//  components/ui/Toast.tsx

"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

type ToastVariant = "success" | "error" | "warning" | "info";

type ToastItem = {
  id: string;
  title?: string;
  message: string;
  variant: ToastVariant;
  durationMs: number;
};

type ToastAPI = {
  push: (input: Omit<ToastItem, "id">) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
};

const ToastContext = createContext<ToastAPI | null>(null);

function variantStyle(variant: ToastVariant) {
  switch (variant) {
    case "success":
      return {
        border: "border-(--oboon-border-default)",
        bg: "bg-(--oboon-bg-surface)",
        title: "text-(--oboon-text-title)",
        body: "text-(--oboon-text-body)",
        dot: "bg-(--oboon-primary)",
      };
    case "error":
      return {
        border: "border-(--oboon-danger-border)",
        bg: "bg-(--oboon-bg-surface)",
        title: "text-(--oboon-text-title)",
        body: "text-(--oboon-text-body)",
        dot: "bg-(--oboon-danger)",
      };
    case "warning":
      return {
        border: "border-(--oboon-warning-border)",
        bg: "bg-(--oboon-bg-surface)",
        title: "text-(--oboon-text-title)",
        body: "text-(--oboon-text-body)",
        dot: "bg-(--oboon-warning)",
      };
    case "info":
    default:
      return {
        border: "border-(--oboon-border-default)",
        bg: "bg-(--oboon-bg-surface)",
        title: "text-(--oboon-text-title)",
        body: "text-(--oboon-text-body)",
        dot: "bg-(--oboon-text-muted)",
      };
  }
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const timersRef = useRef<Record<string, number>>({});

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
    const timer = timersRef.current[id];
    if (timer) {
      window.clearTimeout(timer);
      delete timersRef.current[id];
    }
  }, []);

  const push = useCallback(
    (input: Omit<ToastItem, "id">) => {
      const id = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
      const toast: ToastItem = { id, ...input };
      setItems((prev) => [toast, ...prev].slice(0, 5));

      timersRef.current[id] = window.setTimeout(() => {
        remove(id);
      }, toast.durationMs);
    },
    [remove]
  );

  const api: ToastAPI = useMemo(
    () => ({
      push,
      success: (message, title) =>
        push({ message, title, variant: "success", durationMs: 2500 }),
      error: (message, title) =>
        push({ message, title, variant: "error", durationMs: 3500 }),
      warning: (message, title) =>
        push({ message, title, variant: "warning", durationMs: 3000 }),
      info: (message, title) =>
        push({ message, title, variant: "info", durationMs: 2500 }),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}

      {/* Viewport */}
      <div className="fixed bottom-4 right-4 z-999999 flex w-[320px] max-w-[calc(100vw-2rem)] flex-col gap-2">
        {items.map((t) => {
          const s = variantStyle(t.variant);
          return (
            <div
              key={t.id}
              className={`rounded-2xl border p-4 shadow-(--oboon-shadow-card) backdrop-blur ${s.border} ${s.bg}`}
              role="status"
              aria-live="polite"
            >
              <div className="flex items-start gap-3">
                <span
                  className={`mt-1 inline-block h-2 w-2 rounded-full ${s.dot}`}
                  aria-hidden
                />

                <div className="min-w-0 flex-1">
                  {t.title ? (
                    <div className={`ob-typo-body2 ${s.title}`}>
                      {t.title}
                    </div>
                  ) : null}
                  <div className={`mt-0.5 ob-typo-body ${s.body}`}>
                    {t.message}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => remove(t.id)}
                  className="rounded-md px-2 py-1 ob-typo-caption text-(--oboon-text-muted) transition-colors hover:bg-(--oboon-bg-subtle)"
                  aria-label="닫기"
                >
                  닫기
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}
