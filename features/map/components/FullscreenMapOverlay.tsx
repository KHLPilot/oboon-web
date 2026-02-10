// features/map/FullscreenMapOverlay.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { formatPriceRange } from "@/shared/price";
import { X, Plus, Minus } from "lucide-react";

import Button from "@/components/ui/Button";
import NaverMap, {
  type MapMarker,
  type NaverMapHandle,
} from "@/features/map/components/NaverMap";
import type { DbOffering } from "@/features/map/mappers/mapOffering.mapper";
import { useRouter } from "next/navigation";

import OfferingBadge from "@/features/offerings/components/OfferingBadges";
import type { OfferingStatusValue } from "@/features/offerings/domain/offering.types";

export default function FullscreenMapOverlay({
  open,
  title = "지도",
  markers,
  offerings,
  filtersSlot,
  hoveredId,
  focusedId,
  onHoverChange,
  onSelect,
  onClose,
}: {
  open: boolean;
  title?: string;

  markers: MapMarker[];
  offerings: DbOffering[];

  filtersSlot?: React.ReactNode;

  hoveredId: number | null;
  focusedId: number | null;
  onHoverChange: (id: number | null) => void;
  onSelect: (id: number) => void;

  onClose: () => void;
}) {
  const router = useRouter();
  const [portalEl] = useState<HTMLDivElement | null>(() => {
    if (typeof document === "undefined") return null;
    const el = document.createElement("div");
    el.setAttribute("data-oboon-map-overlay-root", "true");
    return el;
  });
  const mapRef = useRef<NaverMapHandle | null>(null);
  const [sheetId, setSheetId] = useState<number | null>(null);

  const offeringById = useMemo(() => {
    const m = new Map<number, DbOffering>();
    offerings.forEach((o) => m.set(o.id, o));
    return m;
  }, [offerings]);

  const sheetOffering = useMemo(() => {
    if (sheetId && sheetId > 0) return offeringById.get(sheetId) ?? null;
    if (focusedId && focusedId > 0) return offeringById.get(focusedId) ?? null;
    return null;
  }, [sheetId, focusedId, offeringById]);

  useEffect(() => {
    if (!open || !portalEl) return;

    document.body.appendChild(portalEl);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);

    requestAnimationFrame(() => {
      mapRef.current?.resize();
      mapRef.current?.refreshMarkers();
    });

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
      if (portalEl.parentNode) portalEl.parentNode.removeChild(portalEl);
    };
  }, [open, portalEl, onClose, mapRef]);

  if (!open || !portalEl) return null;

  return createPortal(
    <div className="fixed inset-0 z-99999">
      {/* dim */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden
      />

      {/* panel */}
      <div className="absolute inset-0 flex flex-col bg-(--oboon-bg-page)">
        {/* top bar */}
        <div className="shrink-0 border-b border-(--oboon-border-default) bg-(--oboon-bg-surface)">
          <div className="mx-auto flex max-w-300 items-center justify-between px-4 py-3">
            <div className="ob-typo-h3 text-(--oboon-text-title)">{title}</div>

            <button
              type="button"
              onClick={onClose}
              aria-label="닫기"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-(--oboon-bg-subtle)"
            >
              <X className="h-5 w-5 text-(--oboon-text-title)" />
            </button>
          </div>
        </div>

        {/* map area */}
        <div className="relative flex-1 w-full min-h-0">
          <div className="absolute inset-0">
            <NaverMap
              ref={(api) => {
                mapRef.current = api;
              }}
              mode="expanded"
              markers={markers}
              hoveredId={hoveredId}
              focusedId={focusedId}
              onHoverChange={onHoverChange}
              onClearFocus={() => onSelect(0)}
              onMarkerSelect={(id) => onSelect(id)}
            />
          </div>

          {/* layer/filter slot */}
          {filtersSlot ? (
            <div className="absolute left-4 top-4">{filtersSlot}</div>
          ) : null}

          {/* zoom controls */}
          <div className="absolute right-4 top-4 flex flex-col gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              shape="pill"
              onClick={() => mapRef.current?.zoomIn()}
              aria-label="확대"
              className="w-10 h-10 justify-center"
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              shape="pill"
              onClick={() => mapRef.current?.zoomOut()}
              aria-label="축소"
              className="w-10 h-10 justify-center"
            >
              <Minus className="h-4 w-4" />
            </Button>
          </div>

          {/* bottom sheet preview */}
          {sheetOffering ? (
            <div className="absolute inset-x-0 bottom-0 z-40">
              <div className="mx-auto max-w-300 px-4 pb-[calc(env(safe-area-inset-bottom)+14px)]">
                <div
                  className={[
                    "relative",
                    "rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface)",
                    "shadow-(--oboon-shadow-card)",
                    "overflow-hidden",
                  ].join(" ")}
                >
                  {/* 1. 상단 이미지 영역 (16:9 비율) */}
                  {sheetOffering.imageUrl ? (
                    <div className="relative aspect-video w-full bg-gray-100">
                      <Image
                        src={sheetOffering.imageUrl}
                        alt=""
                        width={1280}
                        height={720}
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute left-3 top-3 z-10">
                        <OfferingBadge
                          type="status"
                          value={
                            ((sheetOffering as unknown as {
                              statusEnum?: OfferingStatusValue | null;
                            })
                              .statusEnum as OfferingStatusValue | null) ??
                            undefined
                          }
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSheetId(null);
                          onSelect(0);
                        }}
                        className="absolute top-3 right-3 inline-flex p-1.5 rounded-full bg-black/40 text-white backdrop-blur-sm hover:bg-black/60 transition-colors z-10"
                        aria-label="닫기"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setSheetId(null);
                        onSelect(0);
                      }}
                      className="absolute top-3 right-3 z-10 inline-flex p-1.5 rounded-full bg-(--oboon-bg-subtle) text-(--oboon-text-muted) hover:bg-(--oboon-bg-muted) transition-colors"
                      aria-label="닫기"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}

                  {/* 2. 텍스트 및 버튼 영역 */}
                  <div className="p-4">
                    <div className="mb-4">
                      <div className="ob-typo-h3 text-(--oboon-text-title) line-clamp-1 pr-8">
                        {sheetOffering.title}
                      </div>

                      <div className="mt-1 text-[13px] text-(--oboon-text-muted) line-clamp-1">
                        {sheetOffering.region} · {sheetOffering.address}
                      </div>

                      {/* 가격 및 상태 정보 */}
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="font-bold text-(--oboon-text-title) ob-typo-h4">
                          {formatPriceRange(
                            sheetOffering.priceMinWon,
                            sheetOffering.priceMaxWon,
                            { unknownLabel: "가격 미정" }
                          )}
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="primary"
                      size="md"
                      shape="pill"
                      className="w-full rounded-xl"
                      onClick={() => {
                        onClose?.();
                        router.push(`/offerings/${sheetOffering.id}`);
                      }}
                    >
                      상세 보기
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>,
    portalEl
  );
}
