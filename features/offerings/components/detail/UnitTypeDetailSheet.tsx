"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { ArrowRightLeft, Maximize2, X } from "lucide-react";
import Button from "@/components/ui/Button";
import type { UnitTypeResultItem } from "@/features/condition-validation/domain/types";
import { UXCopy } from "@/shared/uxCopy";
import { formatPriceRange } from "@/shared/price";
import ConditionValidationCategoryPanel from "./ConditionValidationCategoryPanel";
import {
  buildFullConditionCategoryDisplay,
  buildGuestConditionCategoryDisplay,
} from "./conditionValidationDisplay";
import { buildOfferingUnitConditionState, validationMeta } from "./offeringPriceTableLayout";

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

type AreaUnit = "sqm" | "pyeong";

function cn(...classes: Array<string | undefined | false | null>) {
  return classes.filter(Boolean).join(" ");
}

function fmtArea(n: number | null, unit: AreaUnit) {
  if (n === null) return null;
  if (unit === "sqm") return `${Math.round(n * 10) / 10}㎡`;
  return `${Math.round((n / 3.305785) * 10) / 10}평`;
}

function fmtCount(n: number | null, unitLabel = "개") {
  if (n === null) return null;
  return `${n}${unitLabel}`;
}

function fmtGenCount(n: number | null, unitLabel = "세대") {
  if (n == null) return null;
  return `${n}${unitLabel}`;
}

function fmtText(s: string | null) {
  const t = (s ?? "").trim();
  return t ? t : null;
}

function formatDetailMoney(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value) || value <= 0) return "확인 필요";
  const manwon = Math.round(value);
  const eok = Math.floor(manwon / 10000);
  const restManwon = manwon % 10000;

  if (eok === 0) {
    return `${manwon.toLocaleString("ko-KR")}만원`;
  }

  if (restManwon === 0) {
    return `${eok.toLocaleString("ko-KR")}억원`;
  }

  return `${eok.toLocaleString("ko-KR")}억 ${restManwon.toLocaleString("ko-KR")}만원`;
}

function formatRangeBucket(remainder: number, thresholds: [number, number]) {
  if (remainder < thresholds[0]) return "초반";
  if (remainder < thresholds[1]) return "중반";
  return "후반";
}

function formatApproxMoneyValue(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value) || value <= 0) return "확인 필요";

  const manwon = Math.round(value);
  if (manwon < 100) return "100만원 미만";

  if (manwon < 1000) {
    const band = Math.floor(manwon / 100) * 100;
    const bucket = formatRangeBucket(manwon % 100, [25, 75]);
    return `${band.toLocaleString("ko-KR")}만원대 ${bucket}`;
  }

  if (manwon < 10000) {
    const band = Math.floor(manwon / 1000);
    const bucket = formatRangeBucket(manwon % 1000, [250, 750]);
    return `${band.toLocaleString("ko-KR")}천만원대 ${bucket}`;
  }

  const eok = Math.floor(manwon / 10000);
  const restManwon = manwon % 10000;
  if (restManwon === 0) {
    return `${eok.toLocaleString("ko-KR")}억원대`;
  }

  if (restManwon < 1000) {
    const band = Math.floor(restManwon / 100) * 100;
    const bucket = formatRangeBucket(restManwon % 100, [25, 75]);
    return `${eok.toLocaleString("ko-KR")}억 ${band.toLocaleString("ko-KR")}만원대 ${bucket}`;
  }

  const band = Math.floor(restManwon / 1000);
  const bucket = formatRangeBucket(restManwon % 1000, [250, 750]);
  return `${eok.toLocaleString("ko-KR")}억 ${band.toLocaleString("ko-KR")}천만원대 ${bucket}`;
}

function normalizePriceToManwon(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value) || value <= 0) return null;
  // 일부 원시 가격은 원 단위로 내려오므로, 계산용으로만 만원 단위로 정규화한다.
  return Math.abs(value) >= 10_000_000 ? value / 10_000 : value;
}

function scaleDetailMoney(value: number | null | undefined, ratio: number) {
  if (value == null || !Number.isFinite(value) || value <= 0) return null;
  if (!Number.isFinite(ratio) || ratio <= 0) return null;
  return Math.round(value * ratio);
}

function formatDetailMoneyRange(
  value: number | null | undefined,
  basePrice: number | null | undefined,
  minPrice: number | null | undefined,
  maxPrice: number | null | undefined,
) {
  if (value == null || !Number.isFinite(value) || value <= 0) return "확인 필요";
  if (
    basePrice == null ||
    !Number.isFinite(basePrice) ||
    basePrice <= 0 ||
    minPrice == null ||
    maxPrice == null ||
    !Number.isFinite(minPrice) ||
    !Number.isFinite(maxPrice) ||
    minPrice <= 0 ||
    maxPrice <= 0
  ) {
    return formatDetailMoney(value);
  }

  const minValue = scaleDetailMoney(value, minPrice / basePrice);
  const maxValue = scaleDetailMoney(value, maxPrice / basePrice);
  if (minValue == null || maxValue == null) return formatDetailMoney(value);
  if (minValue === maxValue) return formatDetailMoney(minValue);
  return `${formatDetailMoney(minValue)} ~ ${formatDetailMoney(maxValue)}`;
}

function formatApproxMoneyRange(
  value: number | null | undefined,
  basePrice: number | null | undefined,
  minPrice: number | null | undefined,
  maxPrice: number | null | undefined,
) {
  if (value == null || !Number.isFinite(value) || value <= 0) return "확인 필요";
  if (
    basePrice == null ||
    !Number.isFinite(basePrice) ||
    basePrice <= 0 ||
    minPrice == null ||
    maxPrice == null ||
    !Number.isFinite(minPrice) ||
    !Number.isFinite(maxPrice) ||
    minPrice <= 0 ||
    maxPrice <= 0
  ) {
    return formatApproxMoneyValue(value);
  }

  const minValue = scaleDetailMoney(value, minPrice / basePrice);
  const maxValue = scaleDetailMoney(value, maxPrice / basePrice);
  if (minValue == null || maxValue == null) return formatApproxMoneyValue(value);
  if (minValue === maxValue) return formatApproxMoneyValue(minValue);
  return `${formatApproxMoneyValue(minValue)} ~ ${formatApproxMoneyValue(maxValue)}`;
}

function formatDetailPercent(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "계산 불가";
  const rounded = Math.round(value * 10) / 10;
  return `${rounded.toFixed(1).replace(/\.0+$/, "")}%`;
}

function formatApproxPercent(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "계산 불가";
  if (value < 10) return `${Math.round(value)}%대`;

  const rounded = Math.round(value);
  const band = Math.floor(rounded / 10) * 10;
  const bucket = formatRangeBucket(rounded % 10, [4, 7]);
  return `${band}%대 ${bucket}`;
}

function buildCategoryDisplayItems(validation: UnitTypeResultItem | null) {
  if (!validation?.categories) return [];

  const availableCash = validation.recommendation_context?.available_cash_manwon ?? null;
  const monthlyIncome = validation.recommendation_context?.monthly_income_manwon ?? null;
  const houseOwnership = validation.recommendation_context?.house_ownership ?? null;
  const purchasePurpose = validation.recommendation_context?.purchase_purpose ?? null;
  const isPricePublic = validation.is_price_public !== false;

  if (
    validation.categories.cash &&
    validation.categories.income &&
    validation.categories.credit &&
    validation.categories.ownership &&
    validation.categories.purpose
  ) {
    return buildGuestConditionCategoryDisplay({
      categories: {
        cash: validation.categories.cash,
        income: validation.categories.income,
        credit: validation.categories.credit,
        ownership: validation.categories.ownership,
        purpose: validation.categories.purpose,
      },
      metrics: validation.metrics as Parameters<typeof buildGuestConditionCategoryDisplay>[0]["metrics"],
      inputs: { availableCash, houseOwnership, purchasePurpose },
      isPricePublic,
    });
  }

  if (
    validation.categories.cash &&
    validation.categories.income &&
    validation.categories.ltv_dsr &&
    validation.categories.ownership &&
    validation.categories.purpose &&
    validation.categories.timing
  ) {
    return buildFullConditionCategoryDisplay({
      categories: {
        cash: validation.categories.cash,
        income: validation.categories.income,
        ltv_dsr: validation.categories.ltv_dsr,
        ownership: validation.categories.ownership,
        purpose: validation.categories.purpose,
        timing: validation.categories.timing,
      },
      metrics: validation.metrics as Parameters<typeof buildFullConditionCategoryDisplay>[0]["metrics"],
      inputs: {
        availableCash,
        monthlyIncome,
        employmentType: null,
        houseOwnership,
        purchasePurpose,
      },
      isPricePublic,
    });
  }

  return [];
}

/* --- ImageModal (평면도 확대) --- */
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function ImageModal({
  open,
  onClose,
  title,
  src,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  src: string | null;
}) {
  const [zoomed, setZoomed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [imageNatural, setImageNatural] = useState({ width: 0, height: 0 });
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const draggingRef = useRef(false);
  const didDragRef = useRef(false);
  const startRef = useRef({ px: 0, py: 0, x: 0, y: 0 });
  const viewportRef = useRef<HTMLDivElement | null>(null);

  const isMobile = typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches;
  const DRAG_GAIN = isMobile ? 1.6 : 1.0;
  const ZOOM = isMobile ? 2.8 : 2.2;

  useEffect(() => {
    if (!open) {
      queueMicrotask(() => {
        setZoomed(false);
        setPos({ x: 0, y: 0 });
        setIsDragging(false);
      });
      draggingRef.current = false;
    }
  }, [open]);

  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!open || !el) return;
    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      setViewportSize({ width: rect.width, height: rect.height });
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(el);
    window.addEventListener("resize", updateSize);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateSize);
    };
  }, [open]);

  useEffect(() => {
    queueMicrotask(() => setPos({ x: 0, y: 0 }));
  }, [zoomed]);

  const panBounds = useMemo(() => {
    const vw = viewportSize.width;
    const vh = viewportSize.height;
    const iw = imageNatural.width;
    const ih = imageNatural.height;
    if (!vw || !vh || !iw || !ih) return { maxX: 0, maxY: 0 };
    const imageRatio = iw / ih;
    const viewportRatio = vw / vh;
    let baseW = 0;
    let baseH = 0;
    if (imageRatio > viewportRatio) {
      baseW = vw;
      baseH = vw / imageRatio;
    } else {
      baseH = vh;
      baseW = vh * imageRatio;
    }
    return {
      maxX: Math.max(0, (baseW * ZOOM - vw) / 2),
      maxY: Math.max(0, (baseH * ZOOM - vh) / 2),
    };
  }, [viewportSize, imageNatural, ZOOM]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/70 backdrop-blur pointer-events-auto touch-none overscroll-none"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onWheel={(e) => e.preventDefault()}
      onPointerMove={(e) => {
        if (e.cancelable) e.preventDefault();
      }}
    >
      <div className="relative w-[92vw] max-w-4xl pointer-events-auto touch-auto">
        <div className="mb-3 flex items-center">
          <div className="min-w-0 ob-typo-h2 text-(--oboon-text-title) truncate">{title}</div>
          <button
            type="button"
            aria-label="닫기"
            onClick={onClose}
            className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-(--oboon-bg-subtle)"
          >
            <X className="h-5 w-5 text-(--oboon-text-title)" />
          </button>
        </div>
        <div
          ref={viewportRef}
          className={cn(
            "relative overflow-hidden rounded-2xl bg-black",
            zoomed ? "cursor-grab" : "cursor-zoom-in",
            zoomed && isDragging ? "cursor-grabbing" : "",
          )}
          onPointerDown={(e) => {
            if (!zoomed) return;
            didDragRef.current = false;
            draggingRef.current = true;
            setIsDragging(true);
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            startRef.current = { px: e.clientX, py: e.clientY, x: pos.x, y: pos.y };
          }}
          onPointerMove={(e) => {
            if (!zoomed || !draggingRef.current) return;
            const dx = (e.clientX - startRef.current.px) * DRAG_GAIN;
            const dy = (e.clientY - startRef.current.py) * DRAG_GAIN;
            if (!didDragRef.current && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
              didDragRef.current = true;
            }
            setPos({
              x: clamp(startRef.current.x + dx, -panBounds.maxX, panBounds.maxX),
              y: clamp(startRef.current.y + dy, -panBounds.maxY, panBounds.maxY),
            });
          }}
          onPointerUp={(e) => {
            if (!zoomed) return;
            draggingRef.current = false;
            setIsDragging(false);
            try {
              (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
            } catch {}
            window.setTimeout(() => {
              didDragRef.current = false;
            }, 0);
          }}
          onPointerCancel={(e) => {
            draggingRef.current = false;
            setIsDragging(false);
            try {
              (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
            } catch {}
          }}
          onClick={() => {
            if (didDragRef.current) {
              didDragRef.current = false;
              return;
            }
            setZoomed((v) => !v);
          }}
        >
          <div className="relative h-[68vh] w-full max-h-[78vh] select-none sm:h-[74vh]">
            {src ? (
              <div
                className="absolute inset-0"
                style={{
                  touchAction: "none",
                  transform: zoomed
                    ? `translate3d(${pos.x}px, ${pos.y}px, 0) scale(${ZOOM})`
                    : "translate3d(0,0,0) scale(1)",
                  transformOrigin: "center",
                  transition: isDragging ? "none" : "transform 260ms ease-out",
                }}
              >
                <Image
                  src={src}
                  alt={`${title} 평면도`}
                  fill
                  draggable={false}
                  onLoad={(event) =>
                    setImageNatural({
                      width: event.currentTarget.naturalWidth || 0,
                      height: event.currentTarget.naturalHeight || 0,
                    })
                  }
                  className="select-none object-contain"
                  sizes="(max-width: 768px) 92vw, 1000px"
                />
              </div>
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm text-white/70">
                이미지가 없습니다.
              </div>
            )}
          </div>
        </div>
        <div className="mt-2 text-center text-xs text-white/60">
          {zoomed ? "드래그로 이동, 클릭하면 축소" : "클릭하면 확대"}
        </div>
      </div>
    </div>
  );
}

/* --- TypeInfoTable --- */
function getTypeInfoRows(u: UnitTypeRow, areaUnit: AreaUnit) {
  return [
    { label: "전용면적", value: fmtArea(u.exclusive_area, areaUnit) },
    { label: "공급면적", value: fmtArea(u.supply_area, areaUnit) },
    { label: "방", value: fmtCount(u.rooms) },
    { label: "욕실", value: fmtCount(u.bathrooms) },
    { label: "구조", value: fmtText(u.building_layout) },
    { label: "향", value: fmtText(u.orientation) },
    { label: "세대수", value: fmtGenCount(u.unit_count) },
    { label: "공급 규모", value: fmtGenCount(u.supply_count) },
  ].filter((row): row is { label: string; value: string } => Boolean(row.value));
}

function TypeInfoTable({ rows }: { rows: Array<{ label: string; value: string }> }) {
  if (rows.length === 0) return null;

  return (
    <div className="rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-default) p-4">
      <div className="grid grid-cols-2 gap-3">
        {rows.map((row) => (
          <div key={row.label} className="space-y-0.5">
            <p className="ob-typo-caption text-(--oboon-text-muted)">{row.label}</p>
            <p className="ob-typo-body2 text-(--oboon-text-title)">{row.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* --- Main Component --- */
export default function UnitTypeDetailSheet({
  open,
  unit,
  validation,
  imagePlaceholderText,
  onClose,
  onScrollToConditionValidation,
}: Props) {
  const [areaUnit, setAreaUnit] = useState<AreaUnit>("sqm");
  const [zoom, setZoom] = useState<{ open: boolean; src: string | null }>({
    open: false,
    src: null,
  });

  const conditionState = buildOfferingUnitConditionState(validation);
  const categoryDisplayItems = buildCategoryDisplayItems(validation);
  const meta =
    validation && conditionState.mode === "result"
      ? validationMeta(validation.final_grade)
      : null;

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

  const img =
    typeof unit.floor_plan_url === "string" && unit.floor_plan_url.trim()
      ? unit.floor_plan_url.trim()
      : null;
  const title = (unit.type_name ?? "").trim() || "타입";
  const basePrice = validation?.list_price_manwon ?? null;
  const minPrice = normalizePriceToManwon(unit.price_min);
  const maxPrice = normalizePriceToManwon(unit.price_max);
  const isPricePublic = validation?.is_price_public !== false;
  const formatMoneyValue = isPricePublic ? formatDetailMoneyRange : formatApproxMoneyRange;
  const formatMoneySingle = isPricePublic ? formatDetailMoney : formatApproxMoneyValue;
  const formatPercentValue = isPricePublic ? formatDetailPercent : formatApproxPercent;
  const typeInfoRows = getTypeInfoRows(unit, areaUnit);

  return (
    <>
      {/* Overlay */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/40 transition-opacity duration-300",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet / Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${title} 상세`}
        className={cn(
          "fixed z-50 bg-(--oboon-bg-surface) overflow-y-auto transition-transform duration-300",
          // Mobile: bottom sheet
          "bottom-0 left-0 right-0 max-h-[85dvh] rounded-t-2xl",
          // Desktop: right panel
          "lg:top-[var(--oboon-header-offset)] lg:bottom-0 lg:left-auto lg:right-0 lg:w-[420px] lg:rounded-none lg:rounded-l-2xl",
          "lg:max-h-[calc(100dvh-var(--oboon-header-offset))]",
          // Animation
          open ? "translate-y-0 lg:translate-x-0" : "translate-y-full lg:translate-x-full",
        )}
      >
        {/* Drag handle (mobile only) */}
        <div className="flex justify-center pt-3 lg:hidden">
          <div className="h-1 w-10 rounded-full bg-(--oboon-border-default)" />
        </div>

        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-(--oboon-border-default) bg-(--oboon-bg-surface)/95 backdrop-blur">
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
        </div>

        <div className="px-4 pb-8 pt-5 space-y-4">
          {/* 1. 분양가 정보 */}
          <section className="space-y-2">
            <h4 className="ob-typo-h4 text-(--oboon-text-title)">분양가 정보</h4>
            <p className="ob-typo-h2 text-(--oboon-text-title)">
              {formatPriceRange(unit.price_min, unit.price_max, {
                unknownLabel:
                  unit.is_price_public === false ? UXCopy.pricePrivate : UXCopy.priceRange,
              })}
            </p>
          </section>

          {/* 2. 내 조건 기준 (검증 완료) */}
          {validation && (
            <section className="space-y-2">
              <div className="flex items-center gap-2">
                <h4 className="ob-typo-h4 text-(--oboon-text-title)">내 조건 기준</h4>
                {meta && conditionState.mode === "result" ? (
                  <span
                    className="rounded-full px-2 py-0.5 ob-typo-caption font-semibold"
                    style={{ color: meta.color, backgroundColor: meta.bgColor }}
                  >
                    {conditionState.badgeLabel}
                  </span>
                ) : null}
              </div>
              <div className="rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-default) p-4">
                <dl className="space-y-3">
                  {[
                    {
                      label: "계약금",
                      value: formatMoneyValue(
                        validation.metrics?.contract_amount,
                        basePrice,
                        minPrice,
                        maxPrice,
                      ),
                    },
                    {
                      label: "초기 필요 자금",
                      value: formatMoneyValue(
                        validation.metrics?.min_cash,
                        basePrice,
                        minPrice,
                        maxPrice,
                      ),
                    },
                    {
                      label: "권장 보유 현금",
                      value: formatMoneyValue(
                        validation.metrics?.recommended_cash,
                        basePrice,
                        minPrice,
                        maxPrice,
                      ),
                    },
                    {
                      label: "예상 대출",
                      value: formatMoneyValue(
                        validation.metrics?.loan_amount,
                        basePrice,
                        minPrice,
                        maxPrice,
                      ),
                    },
                    {
                      label: "예상 월 상환액",
                      value: formatMoneySingle(validation.metrics?.monthly_payment_est),
                    },
                    { label: "월 부담률", value: formatPercentValue(validation.metrics?.monthly_burden_percent) },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between gap-3">
                      <dt className="ob-typo-caption text-(--oboon-text-muted)">{label}</dt>
                      <dd className="ob-typo-caption text-(--oboon-text-title)">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </section>
          )}

          {/* 3. 판정 이유 (검증 완료 + 카테고리 있을 때) */}
          {validation && categoryDisplayItems.length > 0 && (
            <section className="space-y-2">
              <h4 className="ob-typo-h4 text-(--oboon-text-title)">판정 이유</h4>
              <ConditionValidationCategoryPanel items={categoryDisplayItems} />
            </section>
          )}

          {/* 미검증 CTA */}
          {!validation && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              shape="pill"
              onClick={onScrollToConditionValidation}
            >
              내 조건으로 확인
            </Button>
          )}

          {/* 4. 타입 정보 */}
          {typeInfoRows.length > 0 ? (
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="ob-typo-h4 text-(--oboon-text-title)">타입 정보</h4>
                <Button
                  onClick={() => setAreaUnit((prev) => (prev === "sqm" ? "pyeong" : "sqm"))}
                  variant="secondary"
                  size="sm"
                  shape="pill"
                  className="h-5 px-1.5 text-[11px] shrink-0"
                  aria-label={areaUnit === "sqm" ? "평 단위로 보기" : "제곱미터 단위로 보기"}
                >
                  <ArrowRightLeft className="h-3 w-3" />
                  {areaUnit === "sqm" ? "평" : "㎡"}
                </Button>
              </div>
              <TypeInfoTable rows={typeInfoRows} />
            </section>
          ) : null}

          {/* 5. 평면도 */}
          <section className="space-y-2">
            <h4 className="ob-typo-h4 text-(--oboon-text-title)">평면도</h4>
            <div className="relative flex h-[240px] w-full items-center justify-center overflow-hidden rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-default)">
              {img ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="relative flex h-full w-full items-center justify-center p-0"
                  onClick={() => setZoom({ open: true, src: img })}
                  aria-label={`${title} 평면도 확대`}
                >
                  <Image
                    src={img}
                    alt={`${title} 평면도`}
                    width={1600}
                    height={1200}
                    className="h-auto w-full object-contain"
                    sizes="(max-width: 768px) 100vw, 420px"
                  />
                  <div className="absolute right-2 top-2 inline-flex items-center gap-2 rounded-full border border-(--oboon-border-default) bg-(--oboon-bg-surface)/90 px-3 py-1.5 ob-typo-caption text-(--oboon-text-muted)">
                    <Maximize2 className="h-4 w-4" />
                    확대
                  </div>
                </Button>
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm text-(--oboon-text-muted)">
                  {imagePlaceholderText}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* 평면도 확대 모달 */}
      <ImageModal
        open={zoom.open}
        onClose={() => setZoom({ open: false, src: null })}
        title={title}
        src={zoom.src}
      />
    </>
  );
}
