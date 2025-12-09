// app/navigation/page.tsx
"use client";

import { useState } from "react";
import Header from "@/components/shared/Header";
import LayerControl from "@/features/navigation/LayerControl";
import { Plus, Minus, Navigation as NavIcon } from "lucide-react";
import NaverMap from "../components/NaverMap";

export default function NavigationPage() {
  // 🔥 1. 필터 상태
  const [filters, setFilters] = useState({
    urgent: true,
    upcoming: true,
    remain: true,
  });

  const toggleFilter = (key: keyof typeof filters) => {
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // 🔥 2. 지도 마커 데이터 (lat/lng 방식)
  const MARKERS = [
    {
      id: 1,
      type: "urgent" as const,
      label: "더샵 강동",
      location: "서울 강동구 진황도로 14"
    },
    {
      id: 2,
      type: "urgent" as const,
      label: "힐스테이트 판교",
      location: "경기도 성남시 분당구 판교역로 136"
    },
    {
      id: 3,
      type: "remain" as const,
      label: "e편한세상 광교",
      location: "경기 수원시 영통구 센트럴타운로 76"
    },
  ];

  // 🔥 3. 현재 필터에 따라 마커 필터링
  const filteredMarkers = MARKERS.filter((m) => filters[m.type]);

  return (
    <div className="h-screen flex flex-col font-sans text-slate-900 overflow-hidden">
      <Header />

      <main className="flex-1 relative overflow-hidden">

        {/* 🔥 네이버 지도 */}
        <div className="absolute inset-0">
          <NaverMap markers={filteredMarkers} />
        </div>

        {/* 🔥 필터 UI */}
        <LayerControl filters={filters} onToggle={toggleFilter} />

        {/* 🔥 지도 우측 버튼 */}
        <div className="absolute bottom-8 right-8 flex flex-col gap-3 z-50">
          <button className="w-10 h-10 bg-white rounded-lg shadow-lg border border-slate-100 flex items-center justify-center hover:bg-slate-50 text-slate-600">
            <NavIcon className="w-5 h-5" />
          </button>

          <div className="flex flex-col rounded-lg shadow-lg border border-slate-100 overflow-hidden">
            <button className="w-10 h-10 bg-white flex items-center justify-center hover:bg-slate-50 border-b border-slate-100 text-slate-600">
              <Plus className="w-5 h-5" />
            </button>
            <button className="w-10 h-10 bg-white flex items-center justify-center hover:bg-slate-50 text-slate-600">
              <Minus className="w-5 h-5" />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
