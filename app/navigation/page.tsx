"use client";

import { useEffect, useState } from "react";
import Header from "@/components/shared/Header";
import LayerControl from "@/features/navigation/LayerControl";
import { Plus, Minus, Navigation as NavIcon } from "lucide-react";
import NaverMap from "../components/NaverMap";
import { createSupabaseClient } from "@/lib/supabaseClient";

/* ==================================================
   타입
================================================== */

type MarkerType = "urgent" | "upcoming" | "remain";

type LocationRow = {
  lat: number | null;
  lng: number | null;
};

type PropertyWithLocation = {
  id: number;
  name: string;
  status: string | null;
  // property_locations는 1:N 관계이므로 배열입니다.
  property_locations: LocationRow[] | null;
};

type MapMarker = {
  id: number;
  type: MarkerType;
  label: string;
  lat: number;
  lng: number;
};

/* ==================================================
   페이지
================================================== */

export default function NavigationPage() {
  const supabase = createSupabaseClient();

  /* ---------- 필터 상태 ---------- */
  const [filters, setFilters] = useState<Record<MarkerType, boolean>>({
    urgent: true,
    upcoming: true,
    remain: true,
  });

  const toggleFilter = (key: MarkerType) => {
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  /* ---------- 마커 상태 ---------- */
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [loading, setLoading] = useState(true);

  /* ---------- DB → 마커 로드 ---------- */
  useEffect(() => {
    async function loadMarkers() {
      setLoading(true);

      const { data, error } = await supabase
        .from("properties")
        .select(
          `
          id,
          name,
          status,
          property_locations (
            lat,
            lng
          )
        `
        )
        // 🚨 수정: 위치 정보가 없는 경우에도 행 전체를 가져오도록 .not 필터를 제거했습니다.
        // 클라이언트에서 안전하게 필터링합니다.
        .returns<PropertyWithLocation[]>();

      if (error) {
        console.error("❌ Supabase error:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        setLoading(false);
        return;
      }

      if (!data) {
        console.error("❌ data is null or undefined");
        setLoading(false);
        return;
      }

      // 🚨 디버깅 코드 A: DB에서 원본 데이터를 가져왔는지 확인
      console.log("--- [DEBUG A] DB 원본 현장 데이터 ---");
      console.log(`총 ${data.length}개 현장 로드됨`);
      if (data.length > 0) {
        console.log("첫 번째 현장의 위치 정보:", data[0].property_locations);
      }

      const mapped: MapMarker[] = data
        .map((p) => {
          const locs = p.property_locations;

          // 🚨 수정: 배열이 아니거나, 빈 배열이거나, 첫 번째 요소가 없다면 마커 생성 제외
          if (!Array.isArray(locs) || locs.length === 0) return null;

          const loc = locs[0];

          if (loc.lat === null || loc.lng === null) return null;

          const type: MarkerType =
            p.status === "ONGOING"
              ? "urgent"
              : p.status === "READY"
              ? "upcoming"
              : "remain";

          return {
            id: p.id,
            label: p.name,
            lat: loc.lat,
            lng: loc.lng,
            type,
          };
        })
        .filter(Boolean) as MapMarker[];

      setMarkers(mapped);
      setLoading(false);
    }

    loadMarkers();
  }, [supabase]);

  /* ---------- 필터 적용 ---------- */
  const filteredMarkers = markers.filter((m) => filters[m.type]);

  // 🚨 디버깅 코드 B: 최종 마커 배열이 유효한지 확인
  console.log("--- [DEBUG B] 최종 필터링된 마커 데이터 ---");
  console.log(`최종 마커 개수: ${filteredMarkers.length}개`);
  if (filteredMarkers.length > 0) {
    console.log(
      "첫 번째 마커 (lat, lng):",
      filteredMarkers[0].lat,
      filteredMarkers[0].lng
    );
  }

  /* ==================================================
     렌더
  ================================================== */

  return (
    <div className="h-screen flex flex-col font-sans text-slate-900 overflow-hidden">
      <Header />

      <main className="flex-1 relative overflow-hidden">
        {/* ---------- 네이버 지도 ---------- */}
        <div className="absolute inset-0">
          <NaverMap markers={filteredMarkers} />
        </div>

        {/* ---------- 필터 UI ---------- */}
        <LayerControl filters={filters} onToggle={toggleFilter} />

        {/* ---------- 지도 우측 컨트롤 ---------- */}
        <div className="absolute bottom-8 right-8 flex flex-col gap-3 z-50">
          <button className="w-10 h-10 bg-white rounded-lg shadow-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 text-slate-600">
            <NavIcon className="w-5 h-5" />
          </button>

          <div className="flex flex-col rounded-lg shadow-lg border border-slate-200 overflow-hidden">
            <button className="w-10 h-10 bg-white flex items-center justify-center hover:bg-slate-50 border-b border-slate-200 text-slate-600">
              <Plus className="w-5 h-5" />
            </button>
            <button className="w-10 h-10 bg-white flex items-center justify-center hover:bg-slate-50 text-slate-600">
              <Minus className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ---------- 로딩 표시 (선택) ---------- */}
        {loading && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-white px-4 py-2 rounded shadow text-sm text-slate-600">
            지도 데이터 불러오는 중…
          </div>
        )}
      </main>
    </div>
  );
}
