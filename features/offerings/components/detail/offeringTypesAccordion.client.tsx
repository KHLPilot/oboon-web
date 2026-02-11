"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { ChevronDown, Maximize2, X } from "lucide-react";
import Button from "@/components/ui/Button";
import { UXCopy } from "@/shared/uxCopy";
import { formatPriceRange } from "@/shared/price";

type UnitTypeRow = {
  id: number;
  type_name: string | null;
  price_min: number | null;
  price_max: number | null;
  is_price_public?: boolean | null;

  // 이미지 URL (둘 중 하나 또는 둘 다 올 수 있음)
  floor_plan_url: string | null;
  image_url: string | null;

  // 8개 메타 정보
  exclusive_area: number | null; // 전용면적
  supply_area: number | null; // 공급면적
  rooms: number | null; // 방
  bathrooms: number | null; // 욕실
  building_layout: string | null; // 구조
  orientation: string | null; // 향
  unit_count: number | null; // 세대수
  supply_count: number | null; // 공급
};

function cn(...classes: Array<string | undefined | false | null>) {
  return classes.filter(Boolean).join(" ");
}

function fallbackText() {
  return (
    (UXCopy as unknown as { checkingShort?: string }).checkingShort ??
    UXCopy.checking ??
    "확인중이에요"
  );
}

function fmtArea(n: number | null) {
  if (n === null) return fallbackText();
  const v = Math.round(n * 10) / 10;
  return `${v}㎡`;
}

function fmtCount(n: number | null, unitLabel = "개") {
  if (n === null) return fallbackText();
  return `${n}${unitLabel}`;
}

function fmtGenCount(n: number | null, unitLabel = "세대") {
  if (n == null) return fallbackText();
  return `${n}${unitLabel}`;
}

function fmtText(s: string | null) {
  const t = (s ?? "").trim();
  return t ? t : fallbackText();
}

function pickImageUrl(u: UnitTypeRow) {
  const a = typeof u.floor_plan_url === "string" ? u.floor_plan_url.trim() : "";
  const b = typeof u.image_url === "string" ? u.image_url.trim() : "";
  if (a) return a;
  if (b) return b;
  return null;
}

function formatTypeTitle(typeName: string | null) {
  const raw = (typeName ?? "").trim();
  if (!raw) return "타입";
  if (/(㎡|m²|m2)\s*$/i.test(raw)) return raw;
  return `${raw}㎡`;
}

/* -----------------------------
   Local modal (이미지 확대)
-------------------------------- */
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

  // pan state
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const draggingRef = useRef(false);
  const didDragRef = useRef(false);
  const startRef = useRef({ px: 0, py: 0, x: 0, y: 0 });

  const viewportRef = useRef<HTMLDivElement | null>(null);

  const isMobile =
    typeof window !== "undefined" &&
    window.matchMedia("(max-width: 768px)").matches;

  // drag 정도
  const DRAG_GAIN = isMobile ? 1.6 : 1.0;

  // zoom 배율
  const ZOOM = isMobile ? 2.8 : 2.2;

  // 모달이 닫히면 상태 초기화
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

  // zoom 토글 시 pan 초기화(확대 시는 중앙부터 시작)
  useEffect(() => {
    queueMicrotask(() => setPos({ x: 0, y: 0 }));
  }, [zoomed]);

  // 모달 외부 클릭 차단
  useEffect(() => {
    if (!open) return;

    const scrollY = window.scrollY;
    const prev = {
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
      touchAction: document.body.style.touchAction,
    };

    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    document.body.style.touchAction = "none";

    return () => {
      document.body.style.overflow = prev.overflow;
      document.body.style.position = prev.position;
      document.body.style.top = prev.top;
      document.body.style.width = prev.width;
      document.body.style.touchAction = prev.touchAction;

      window.scrollTo(0, scrollY);
    };
  }, [open]);

  const panBounds = useMemo(() => {
    const w = viewportSize.width;
    const h = viewportSize.height;

    // "fill" + cover 기준으로 컨테이너를 꽉 채우고,
    // 확대(scale)되면 추가로 넘치는 만큼만 이동을 허용
    const maxX = Math.max(0, (w * (ZOOM - 1)) / 2);
    const maxY = Math.max(0, (h * (ZOOM - 1)) / 2);

    return { maxX, maxY };
  }, [viewportSize.height, viewportSize.width, ZOOM]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-999999 flex items-center justify-center bg-black/70 backdrop-blur pointer-events-auto touch-none overscroll-none"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onWheel={(e) => e.preventDefault()}
      onTouchMove={(e) => e.preventDefault()}
      onPointerMove={(e) => {
        // 확대(pan) 중이 아니라면 배경 드래그 스크롤을 막는다
        if (e.cancelable) e.preventDefault();
      }}
    >
      <div className="relative w-[92vw] max-w-4xl pointer-events-auto touch-auto">
        {/* Header: 제목 + 닫기 버튼 같은 높이 */}
        <div className="mb-3 flex items-center">
          <div className="min-w-0 ob-typo-h2 text-(--oboon-text-title) truncate">
            {title}
          </div>

          <button
            type="button"
            aria-label="닫기"
            onClick={onClose}
            className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-(--oboon-bg-subtle)"
          >
            <X className="h-5 w-5 text-(--oboon-text-title)" />
          </button>
        </div>

        {/* Image viewport */}
        <div
          ref={viewportRef}
          className={cn(
            "relative overflow-hidden rounded-2xl bg-black",
            zoomed ? "cursor-grab" : "cursor-zoom-in",
            zoomed && isDragging ? "cursor-grabbing" : ""
          )}
          // 확대 상태에서만 pan 활성화
          onPointerDown={(e) => {
            if (!zoomed) return;
            didDragRef.current = false;
            draggingRef.current = true;
            setIsDragging(true);
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            startRef.current = {
              px: e.clientX,
              py: e.clientY,
              x: pos.x,
              y: pos.y,
            };
          }}
          onPointerMove={(e) => {
            if (!zoomed || !draggingRef.current) return;

            const dx = (e.clientX - startRef.current.px) * DRAG_GAIN;
            const dy = (e.clientY - startRef.current.py) * DRAG_GAIN;

            if (!didDragRef.current && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
              didDragRef.current = true;
            }
            const nextX = startRef.current.x + dx;
            const nextY = startRef.current.y + dy;

            setPos({
              x: clamp(nextX, -panBounds.maxX, panBounds.maxX),
              y: clamp(nextY, -panBounds.maxY, panBounds.maxY),
            });
          }}
          onPointerUp={(e) => {
            if (!zoomed) return;
            draggingRef.current = false;
            setIsDragging(false);
            try {
              (e.currentTarget as HTMLElement).releasePointerCapture(
                e.pointerId
              );
            } catch {}
            window.setTimeout(() => {
              didDragRef.current = false;
            }, 0);
          }}
          onPointerCancel={(e) => {
            draggingRef.current = false;
            setIsDragging(false);
            try {
              (e.currentTarget as HTMLElement).releasePointerCapture(
                e.pointerId
              );
            } catch {}
          }}
          // 클릭(탭)으로 확대/축소 토글
          onClick={() => {
            if (didDragRef.current) {
              didDragRef.current = false;
              return;
            }
            setZoomed((v) => !v);
          }}
        >
          <div className="relative aspect-16/10 w-full select-none">
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
                  className={cn(
                    "select-none",
                    // 기본은 꽉 채우기
                    zoomed ? "object-cover" : "object-cover"
                  )}
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

        {/* Hint */}
        <div className="mt-2 text-center text-xs text-white/60">
          {zoomed ? "드래그로 이동, 클릭하면 축소" : "클릭하면 확대"}
        </div>
      </div>
    </div>
  );
}

/* -----------------------------
  MetaCard (8개 카드 공통)
-------------------------------- */
function MetaCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) px-3 py-2">
      <div className="ob-typo-caption font-medium text-(--oboon-text-muted)">
        {label}
      </div>
      <div className="mt-1 ob-typo-h4 text-(--oboon-text-title)">{value}</div>
    </div>
  );
}

function MetaGrid({ u }: { u: UnitTypeRow }) {
  return (
    <div className="mt-3 grid grid-cols-2 gap-2">
      <MetaCard label="전용면적" value={fmtArea(u.exclusive_area)} />
      <MetaCard label="공급면적" value={fmtArea(u.supply_area)} />
      <MetaCard label="방" value={fmtCount(u.rooms)} />
      <MetaCard label="욕실" value={fmtCount(u.bathrooms)} />
      <MetaCard label="구조" value={fmtText(u.building_layout)} />
      <MetaCard label="향" value={fmtText(u.orientation)} />
      <MetaCard label="세대수" value={fmtGenCount(u.unit_count)} />
      <MetaCard label="공급 규모" value={fmtGenCount(u.supply_count)} />
    </div>
  );
}

export default function OfferingUnitTypesAccordion({
  unitTypes,
  emptyText,
  imagePlaceholderText,
}: {
  unitTypes: UnitTypeRow[];
  emptyText: string;
  imagePlaceholderText: string;
}) {
  const rows = useMemo(() => {
    return (unitTypes ?? [])
      .slice()
      .sort((a, b) => (a.type_name ?? "").localeCompare(b.type_name ?? ""));
  }, [unitTypes]);

  const [openId, setOpenId] = useState<number | null>(null);
  const [zoom, setZoom] = useState<{
    open: boolean;
    title: string;
    src: string | null;
  }>({ open: false, title: "", src: null });

  if (!rows.length) {
    return (
      <div className="ob-typo-h4 text-(--oboon-text-muted)">{emptyText}</div>
    );
  }

  return (
    <>
      <div className="divide-y divide-(--oboon-border-default)">
        {rows.map((u) => {
          const isOpen = openId === u.id;
          const title = formatTypeTitle(u.type_name);

          const img = pickImageUrl(u);

          return (
            <div key={u.id}>
              {/* Header row */}
              <button
                type="button"
                className={cn(
                  "w-full rounded-xl px-2 py-2 text-left",
                  "hover:bg-(--oboon-bg-subtle) transition-colors"
                )}
                onClick={() => setOpenId(isOpen ? null : u.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1 pl-1">
                    <div className="ob-typo-h4 text-(--oboon-text-title) truncate">
                      {title}
                    </div>
                  </div>
                  <div className="ob-typo-h4 text-(--oboon-text-muted) whitespace-nowrap">
                    {formatPriceRange(u.price_min, u.price_max, {
                      unknownLabel:
                        u.is_price_public === false
                          ? UXCopy.pricePrivate
                          : UXCopy.priceRange,
                    })}
                  </div>

                  <ChevronDown
                    className={cn(
                      "h-5 w-5 shrink-0 text-(--oboon-text-muted) transition-transform",
                      isOpen ? "rotate-180" : "rotate-0"
                    )}
                  />
                </div>
              </button>

              {/* Accordion body */}
              <div
                className={cn(
                  "grid transition-[grid-template-rows] duration-200 ease-out",
                  isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                )}
              >
                <div className="min-h-0 overflow-hidden">
                  <div className="mt-3 rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-3">
                    {/* Image (click -> modal) */}
                    <div className="relative mx-auto h-full w-full max-w-4xl pointer-events-auto touch-auto">
                      <div
                        className={cn(
                          "relative w-full overflow-hidden rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-default)",
                          img ? "" : "aspect-video",
                        )}
                      >
                        {img ? (
                          <Button
                            type="button"
                            variant="ghost"
                            className="relative h-auto w-full p-0"
                            onClick={() =>
                              setZoom({ open: true, title, src: img })
                            }
                            aria-label={`${title} 평면도 확대`}
                          >
                            <Image
                              src={img}
                              alt={`${title} 평면도`}
                              width={1600}
                              height={1200}
                              className="h-auto w-full object-contain"
                              sizes="(max-width: 768px) 100vw, 700px"
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
                    </div>

                    {/* 8 Meta cards */}
                    <MetaGrid u={u} />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      <ImageModal
        open={zoom.open}
        onClose={() => setZoom({ open: false, title: "", src: null })}
        title={zoom.title}
        src={zoom.src}
      />
    </>
  );
}
