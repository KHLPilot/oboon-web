"use client";

import { useState } from "react";
import { LayoutGrid, Map, ChevronDown } from "lucide-react";

export default function FilterBar() {
  const [budget, setBudget] = useState(15); // 예산 초기값 (단위: 억)
  const [selectedTypes, setSelectedTypes] = useState<string[]>(["아파트"]);

  const toggleType = (type: string) => {
    if (selectedTypes.includes(type)) {
      setSelectedTypes(selectedTypes.filter((t) => t !== type));
    } else {
      setSelectedTypes([...selectedTypes, type]);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 mb-8">
      <div className="flex flex-col lg:flex-row gap-8 items-start lg:items-center justify-between">
        {/* 왼쪽: 필터 옵션들 */}
        <div className="flex flex-col md:flex-row gap-6 w-full lg:w-auto flex-1">
          {/* 1. 지역 선택 (Dropdown) */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-slate-400">지역</span>
            <button className="flex items-center gap-2 text-slate-800 font-bold text-sm border-b border-slate-200 pb-1 hover:border-teal-500 transition-colors">
              서울 전체 <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          {/* 2. 유형 선택 (Toggle Buttons) */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-slate-400">유형</span>
            <div className="flex gap-2">
              {["아파트", "오피스텔"].map((type) => (
                <button
                  key={type}
                  onClick={() => toggleType(type)}
                  className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${
                    selectedTypes.includes(type)
                      ? "bg-teal-500 text-white shadow-sm"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* 3. 예산 범위 (Slider) */}
          <div className="flex flex-col gap-2 flex-1 min-w-[200px]">
            <div className="flex justify-between text-xs font-bold text-slate-500">
              <span>예산 범위</span>
              <span className="text-teal-600">~ {budget}억</span>
            </div>
            <input
              type="range"
              min="1"
              max="50"
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-500"
            />
          </div>
        </div>

        {/* 오른쪽: 뷰 모드 토글 (리스트 vs 지도) */}
        <div className="flex border border-slate-200 rounded-lg p-1 bg-slate-50">
          <button className="p-2 bg-white rounded shadow-sm text-slate-800">
            <LayoutGrid className="w-5 h-5" />
          </button>
          <button className="p-2 text-slate-400 hover:text-slate-600">
            <Map className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
