// components/features/property/PropertyCard.tsx
"use client";

import Image from "next/image";
import Link from "next/link"; // 👈 Link 컴포넌트 추가
import { Heart, MapPin } from "lucide-react";
import { Property } from "@/types";

interface PropertyCardProps {
  data: Property;
}

export default function PropertyCard({ data }: PropertyCardProps) {
  // 상태 뱃지 색상 로직
  const getBadgeColor = (status: string) => {
    switch (status) {
      case "청약예정":
        return "bg-blue-500";
      case "선착순":
        return "bg-emerald-500";
      case "잔여세대":
        return "bg-orange-400";
      case "마감임박":
        return "bg-red-500";
      default:
        return "bg-slate-500";
    }
  };

  return (
    // 1. 전체를 Link로 감싸서 클릭 시 이동하게 함 (div -> Link)
    // 현재는 모든 카드가 똑같은 /overview 페이지로 이동합니다.
    <Link
      href="/overview"
      className="group bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 overflow-hidden cursor-pointer flex flex-col h-full block"
    >
      {/* 이미지 영역 */}
      <div className="relative h-56 bg-slate-200 overflow-hidden">
        <Image
          src={data.imageUrl}
          alt={data.title}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500"
        />

        {/* 뱃지 */}
        <div className="absolute top-3 left-3 flex gap-1 z-10">
          <span
            className={`${getBadgeColor(
              data.status
            )} text-white text-[10px] px-2 py-1 rounded font-bold shadow-sm`}
          >
            {data.status}
          </span>
          <span className="bg-slate-800/90 backdrop-blur-sm text-white text-[10px] px-2 py-1 rounded font-bold shadow-sm">
            {data.type}
          </span>
        </div>

        {/* 2. 찜하기 버튼은 클릭해도 페이지 이동 안 되게 막음 (e.preventDefault) */}
        <button
          onClick={(e) => {
            e.preventDefault(); // 부모 Link의 클릭 이벤트를 막음
            console.log("찜하기 클릭됨");
          }}
          className="absolute bottom-3 right-3 bg-white/90 p-2 rounded-full shadow-sm hover:text-red-500 hover:scale-110 transition-all z-10"
        >
          <Heart className="w-4 h-4" />
        </button>
      </div>

      {/* 텍스트 정보 영역 */}
      <div className="p-5 flex flex-col flex-1">
        <h3 className="font-bold text-lg text-slate-900 mb-1 truncate">
          {data.title}
        </h3>
        <p className="text-xs text-slate-500 flex items-center gap-1 mb-5">
          <MapPin className="w-3 h-3" /> {data.location}
        </p>

        <div className="mt-auto flex items-center justify-between pt-4 border-t border-slate-50">
          <div>
            <span className="text-[11px] text-slate-400 block mb-0.5">
              분양가
            </span>
            <span className="font-bold text-slate-800 text-base">
              {data.price}
            </span>
          </div>
          {/* 상담신청 버튼은 Link 안에 있어도 동작상 문제 없으므로 그대로 둠 */}
          <button className="text-xs font-bold text-teal-600 bg-teal-50 border border-teal-100 px-4 py-2 rounded hover:bg-teal-600 hover:text-white transition-all">
            상담신청
          </button>
        </div>
      </div>
    </Link>
  );
}
