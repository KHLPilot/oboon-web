"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import type { UnitTypeResultItem } from "@/features/condition-validation/domain/types";

export type UnitTypeRow = {
  id: number;
  type_name: string | null;
  price_min: number | null;
  price_max: number | null;
  is_price_public?: boolean | null;
  is_public?: boolean | null;
  floor_plan_url: string | null;
  exclusive_area: number | null;
  supply_area: number | null;
  rooms: number | null;
  bathrooms: number | null;
  building_layout: string | null;
  orientation: string | null;
  unit_count: number | null;
  supply_count: number | null;
};

type Props = {
  open: boolean;
  unit: UnitTypeRow | null;
  validation: UnitTypeResultItem | null;
  imagePlaceholderText: string;
  onClose: () => void;
  onScrollToConditionValidation: () => void;
};

function cn(...classes: Array<string | undefined | false | null>) {
  return classes.filter(Boolean).join(" ");
}

// Placeholder — filled in Task 3
function ImageModal(_: { open: boolean; onClose: () => void; title: string; src: string | null }) {
  return null;
}

export default function UnitTypeDetailSheet({
  open,
  unit,
  validation,
  onClose,
  onScrollToConditionValidation,
}: Props) {
  const [setZoom] = [(_: { open: boolean; src: string | null }) => {}];

  // Body scroll lock
  useEffect(() => {
    if (!open) return;
    const scrollY = window.scrollY;
    const prev = {
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
    };
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";

    return () => {
      document.body.style.overflow = prev.overflow;
      document.body.style.position = prev.position;
      document.body.style.top = prev.top;
      document.body.style.width = prev.width;
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  // ESC key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!unit) return null;

  const title = (unit.type_name ?? "").trim() || "타입";

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/40 transition-opacity duration-300",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${title} 상세`}
        className={cn(
          "fixed z-50 bg-(--oboon-bg-surface) overflow-y-auto transition-transform duration-300",
          "bottom-0 left-0 right-0 max-h-[85dvh] rounded-t-2xl",
          "lg:inset-y-0 lg:left-auto lg:right-0 lg:w-[420px] lg:max-h-none lg:rounded-none lg:rounded-l-2xl",
          open ? "translate-y-0 lg:translate-x-0" : "translate-y-full lg:translate-x-full",
        )}
      >
        <div className="flex justify-center pt-3 lg:hidden">
          <div className="h-1 w-10 rounded-full bg-(--oboon-border-default)" />
        </div>

        <div className="flex items-center justify-between px-4 py-3">
          <span className="ob-typo-h3 text-(--oboon-text-title)">{title}</span>
          <button
            type="button"
            aria-label="닫기"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-(--oboon-bg-subtle)"
          >
            <X className="h-5 w-5 text-(--oboon-text-title)" />
          </button>
        </div>

        <div className="px-4 pb-8 space-y-4">
          <section className="space-y-2">
            <h4 className="ob-typo-h4 text-(--oboon-text-title)">분양가 정보</h4>
          </section>

          {validation && (
            <section className="space-y-2">
              <h4 className="ob-typo-h4 text-(--oboon-text-title)">내 조건 기준</h4>
            </section>
          )}

          {validation && (
            <section className="space-y-2">
              <h4 className="ob-typo-h4 text-(--oboon-text-title)">판정 이유</h4>
            </section>
          )}

          {!validation && (
            <button type="button" onClick={onScrollToConditionValidation}>
              내 조건으로 확인
            </button>
          )}

          <section className="space-y-2">
            <h4 className="ob-typo-h4 text-(--oboon-text-title)">타입 정보</h4>
          </section>

          <section className="space-y-2">
            <h4 className="ob-typo-h4 text-(--oboon-text-title)">평면도</h4>
          </section>
        </div>
      </div>

      <ImageModal open={false} onClose={onClose} title={title} src={null} />
    </>
  );
}
