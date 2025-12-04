"use client";

import { useState } from "react";
import { Layers, ChevronDown, ChevronUp } from "lucide-react";

// 부모에게 받을 데이터와 함수 정의
interface LayerControlProps {
  filters: {
    urgent: boolean;
    upcoming: boolean;
    remain: boolean;
  };
  onToggle: (key: "urgent" | "upcoming" | "remain") => void;
}

export default function LayerControl({ filters, onToggle }: LayerControlProps) {
  const [isOpen, setIsOpen] = useState(true); // 메뉴 열림/닫힘은 내부에서 관리

  return (
    <div className="absolute top-6 left-6 z-10 bg-white rounded-lg shadow-lg border border-slate-200 overflow-hidden w-48 animate-fade-in">
      {/* 헤더 */}
      <div
        className="bg-slate-50 p-3 flex items-center justify-between cursor-pointer border-b border-slate-100"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
          <Layers className="w-4 h-4" />
          LAYER STATUS
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </div>

      {/* 필터 목록 */}
      {isOpen && (
        <div className="p-4 space-y-3">
          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={filters.urgent}
              onChange={() => onToggle("urgent")} // 부모에게 알림
              className="w-4 h-4 rounded border-slate-300 text-teal-500 focus:ring-teal-500 cursor-pointer"
            />
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm" />
              <span className="text-sm font-bold text-slate-700 group-hover:text-slate-900">
                선착순 분양
              </span>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={filters.upcoming}
              onChange={() => onToggle("upcoming")}
              className="w-4 h-4 rounded border-slate-300 text-blue-500 focus:ring-blue-500 cursor-pointer"
            />
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm" />
              <span className="text-sm font-bold text-slate-700 group-hover:text-slate-900">
                청약 예정
              </span>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={filters.remain}
              onChange={() => onToggle("remain")}
              className="w-4 h-4 rounded border-slate-300 text-orange-400 focus:ring-orange-400 cursor-pointer"
            />
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-400 shadow-sm" />
              <span className="text-sm font-bold text-slate-700 group-hover:text-slate-900">
                잔여세대
              </span>
            </div>
          </label>
        </div>
      )}
    </div>
  );
}
