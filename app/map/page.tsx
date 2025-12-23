"use client";

import { useMemo, useRef, useState } from "react";
import NaverMap, { type NaverMapHandle } from "@/app/components/NaverMap";
import LayerControl from "@/features/map/MapLayer";
import MapOfferingCompactList, {
  type MapOfferingCompactItem,
} from "@/features/map/MapOfferingCompactList";
import Button from "@/components/ui/Button";
import { Plus, Minus, Navigation as NavIcon } from "lucide-react";

/* ==================================================
   더미 타입
================================================== */

type OfferingDummy = {
  id: number;
  type: "urgent" | "upcoming" | "remain";
  title: string;
  region: string;
  address: string;
  priceRange: string;
  status: string;
  lat: number;
  lng: number;
};

/* ==================================================
   페이지
================================================== */

export default function MapPage() {
  /* ---------- 필터 ---------- */
  const [filters, setFilters] = useState({
    urgent: true,
    upcoming: true,
    remain: true,
  });

  const toggleFilter = (key: keyof typeof filters) => {
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  /* ---------- 지도 화면에 보이는 마커 ID ---------- */
  const [visibleIds, setVisibleIds] = useState<number[]>([]);
  const [hasCalculatedVisible, setHasCalculatedVisible] = useState(false); // ✅ 추가

  /* ---------- 리스트↔지도 인터랙션 ---------- */
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [focusedId, setFocusedId] = useState<number | null>(null);
  const mapApiRef = useRef<NaverMapHandle | null>(null);

  /* ---------- 더미 데이터 ---------- */
  const ALL = useMemo<OfferingDummy[]>(
    () => [
      {
        id: 1,
        type: "urgent",
        title: "더 센트레움 청담",
        region: "서울 강남구 청담동",
        address: "서울 강남구 청담동",
        priceRange: "25억 ~ 110억",
        status: "분양중",
        lat: 37.5257,
        lng: 127.0514,
      },
      {
        id: 2,
        type: "upcoming",
        title: "한빛 더샵 2차",
        region: "경기 성남시 분당구 판교동",
        address: "경기 성남시 분당구 판교동",
        priceRange: "19억 ~ 45억",
        status: "청약예정",
        lat: 37.3948,
        lng: 127.1112,
      },
      {
        id: 3,
        type: "remain",
        title: "송도 오션 타워",
        region: "인천 연수구 송도동",
        address: "인천 연수구 송도동",
        priceRange: "8억 ~ 15억",
        status: "모집공고",
        lat: 37.3861,
        lng: 126.6436,
      },
      {
        id: 4,
        type: "urgent",
        title: "판교 리버 포레스트",
        region: "경기 성남시 분당구",
        address: "경기 성남시 분당구",
        priceRange: "12억 ~ 28억",
        status: "분양중",
        lat: 37.3786,
        lng: 127.1164,
      },
    ],
    []
  );

  /* ---------- 1차 필터 (상태) ---------- */
  const filtered = useMemo(() => {
    return ALL.filter((m) => filters[m.type]);
  }, [ALL, filters]);

  /* ---------- 지도에 전달할 마커 ---------- */
  const markers = filtered.map((m) => ({
    id: m.id,
    type: m.type,
    label: m.title,
    lat: m.lat,
    lng: m.lng,
  }));

  /* ---------- 2차 필터 (지도 화면 Bounds) ---------- */
  const visible = useMemo(() => {
    if (!hasCalculatedVisible) return filtered;

    const set = new Set(visibleIds);
    return filtered.filter((m) => set.has(m.id));
  }, [filtered, visibleIds, hasCalculatedVisible]);

  /* ---------- 리스트용 데이터 ---------- */
  const listItems: MapOfferingCompactItem[] = visible.map((m) => ({
    id: m.id,
    title: m.title,
    region: m.region,
    priceRange: m.priceRange,
    status: m.status,
  }));

  const handleSelect = (id: number) => {
    setFocusedId((prev) => (prev === id ? null : id));

    // focus 설정 후 리스트 항목으로 스크롤
    requestAnimationFrame(() => {
      const el = document.getElementById(`offering-row-${id}`);
      el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  };

  return (
    <section className="bg-(--oboon-bg-page)">
      <div className="mx-auto w-full max-w-[1200px] px-5 pt-10 pb-10">
        {/* 페이지 헤더 */}
        <div className="mb-4">
          <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-(--oboon-text-title)">
            지도
          </h1>
          <p className="mt-1 text-[14px] leading-[1.6] text-(--oboon-text-muted)">
            지도에서 분양 현장을 한눈에 확인할 수 있어요.
          </p>
        </div>

        {/* 지도 박스 */}
        <div className="rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) overflow-hidden">
          <div className="relative w-full h-[520px]">
            <div className="absolute inset-0">
              <NaverMap
                ref={mapApiRef}
                markers={markers}
                hoveredId={hoveredId}
                focusedId={focusedId}
                onClearFocus={() => setFocusedId(null)}
                onVisibleIdsChange={(ids) => {
                  setVisibleIds(ids);
                  setHasCalculatedVisible(true);
                }}
                onMarkerSelect={(id) => handleSelect(id)}
              />
            </div>

            <LayerControl filters={filters} onToggle={toggleFilter} />

            {/* 우측 컨트롤 */}
            <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-20">
              <Button variant="secondary" size="sm" shape="round">
                <NavIcon className="w-4 h-4" />
              </Button>

              <div className="flex flex-col overflow-hidden rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-surface)">
                <Button
                  variant="secondary"
                  size="sm"
                  shape="round"
                  onClick={() => mapApiRef.current?.zoomIn()}
                >
                  <Plus className="w-4 h-4" />
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  shape="round"
                  onClick={() => mapApiRef.current?.zoomOut()}
                >
                  <Minus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* 리스트 */}
        <MapOfferingCompactList
          items={listItems}
          hoveredId={hoveredId}
          focusedId={focusedId}
          onHover={(id) => setHoveredId(id)}
          onSelect={(id) => handleSelect(id)}
        />
      </div>
    </section>
  );
}
