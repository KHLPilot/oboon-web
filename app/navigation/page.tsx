// app/navigation/page.tsx
// import NaverMap from "../components/NaverMap";

// export default function NavigationPage() {
//   return (
//     <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
//       <h2 className="mb-2 text-lg font-semibold">
//         N — Navigation (지도로 분양 보기)
//       </h2>
//       <ul className="list-disc space-y-1 pl-5 text-sm text-slate-300">
//         <li>분양 현장을 지도로 확인</li>
//         <li>선착순 가능한 현장 핀 표시</li>
//         <li>청약/착공/입주 예정 지도</li>
//         <li>분양가 히트맵</li>
//         <li>모델하우스 네비 연동</li>
//       </ul>

//       {/* 🔽 여기서부터 실제 지도 */}
//       <NaverMap />
//     </section>
//   );
// }

"use client";

import { useState } from "react";
import Header from "@/components/shared/HeaderNew";
import LayerControl from "@/features/navigation/LayerControl";
import { Plus, Minus, Navigation as NavIcon, MapPin } from "lucide-react";

export default function NavigationPage() {
  // 1. 필터 상태를 여기서 관리합니다.
  const [filters, setFilters] = useState({
    urgent: true,
    upcoming: true,
    remain: true,
  });

  // 필터 토글 함수
  const toggleFilter = (key: keyof typeof filters) => {
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // 마커 데이터 (type 속성이 필터의 key와 일치해야 합니다)
  // type을 string이 아니라 구체적인 키값으로 지정
  const MARKERS = [
    {
      id: 1,
      type: "urgent" as const,
      label: "더샵 강남",
      top: "40%",
      left: "55%",
      color: "bg-emerald-500",
    },
    {
      id: 2,
      type: "upcoming" as const,
      label: "힐스테이트 판교",
      top: "60%",
      left: "45%",
      color: "bg-blue-500",
    },
    {
      id: 3,
      type: "remain" as const,
      label: "e편한세상 분당",
      top: "30%",
      left: "65%",
      color: "bg-orange-400",
    },
    // 테스트를 위해 마커 몇 개 더 추가
    {
      id: 4,
      type: "urgent" as const,
      label: "루시아 청담",
      top: "25%",
      left: "40%",
      color: "bg-emerald-500",
    },
    {
      id: 5,
      type: "remain" as const,
      label: "래미안 원베일리",
      top: "50%",
      left: "70%",
      color: "bg-orange-400",
    },
  ];

  // 2. 현재 필터 상태에 따라 마커 필터링
  // 마커의 type이 켜져 있는(true) 것만 남깁니다.
  const filteredMarkers = MARKERS.filter((marker) => filters[marker.type]);

  return (
    <div className="h-screen flex flex-col font-sans text-slate-900 overflow-hidden">
      <Header />

      <main className="flex-1 relative bg-slate-100 overflow-hidden">
        <div
          className="absolute inset-0 w-full h-full bg-cover bg-center opacity-80"
          style={{
            backgroundImage:
              'url("https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&q=80&w=2000")',
          }}
        >
          <div className="w-full h-full bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:100px_100px]"></div>
        </div>

        {/* 3. LayerControl에 상태와 변경 함수 전달 */}
        <LayerControl filters={filters} onToggle={toggleFilter} />

        {/* 4. 필터링된 마커만 지도에 표시 (filteredMarkers 사용) */}
        {filteredMarkers.map((marker) => (
          <div
            key={marker.id}
            className="absolute transform -translate-x-1/2 -translate-y-full cursor-pointer group z-0 hover:z-50 transition-all duration-300 animate-fade-in"
            style={{ top: marker.top, left: marker.left }}
          >
            <div className="relative flex flex-col items-center">
              <div className="mb-2 bg-white px-3 py-1.5 rounded-lg shadow-lg border border-slate-100 whitespace-nowrap opacity-100 scale-100 transition-all">
                <span className="text-xs font-bold text-slate-800">
                  {marker.label}
                </span>
              </div>

              <div
                className={`w-8 h-8 ${marker.color} rounded-full border-4 border-white shadow-lg flex items-center justify-center animate-bounce-slow`}
              >
                <MapPin className="w-4 h-4 text-white" />
              </div>

              <div className="w-4 h-1.5 bg-black/20 rounded-full blur-[2px] mt-1" />
            </div>
          </div>
        ))}

        <div className="absolute bottom-8 right-8 flex flex-col gap-3">
          <button className="w-10 h-10 bg-white rounded-lg shadow-lg border border-slate-100 flex items-center justify-center hover:bg-slate-50 transition-colors text-slate-600">
            <NavIcon className="w-5 h-5" />
          </button>

          <div className="flex flex-col rounded-lg shadow-lg border border-slate-100 overflow-hidden">
            <button className="w-10 h-10 bg-white flex items-center justify-center hover:bg-slate-50 transition-colors border-b border-slate-100 text-slate-600">
              <Plus className="w-5 h-5" />
            </button>
            <button className="w-10 h-10 bg-white flex items-center justify-center hover:bg-slate-50 transition-colors text-slate-600">
              <Minus className="w-5 h-5" />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
