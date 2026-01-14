// components/features/property/PropertyCard.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, MapPin } from "lucide-react";
import type { Property } from "@/features/property/domain/property.types";

interface PropertyCardProps {
  data: Property;
}

function isLikelyImageUrl(url: string | null | undefined): url is string {
  if (!url) return false;
  if (url.startsWith("data:image/")) return true;
  return /\.(jpg|jpeg|png|webp|gif|avif|svg)(\?.*)?$/i.test(url);
}

export default function PropertyCard({ data }: PropertyCardProps) {
  return (
    <Link
      href="/overview"
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) shadow-[0_6px_20px_rgba(15,23,42,0.08)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(15,23,42,0.14)]"
    >
      {/* 이미지 영역 */}
      <div className="relative aspect-3/4 w-full bg-(--oboon-bg-subtle) overflow-hidden md:aspect-4/3">
        {isLikelyImageUrl(data.imageUrl) ? (
          <Image
            src={data.imageUrl}
            alt={data.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-(--oboon-bg-subtle)">
            <span className="text-xs text-(--oboon-text-muted)">
              이미지 준비중
            </span>
          </div>
        )}

        {/* 뱃지 */}
        <div className="absolute top-3 left-3 flex gap-1 z-10">
          <span className="rounded-full bg-(--badge-status-bg) px-2.5 py-1 text-[10px] font-semibold text-(--badge-status-text) shadow-sm">
            {data.status}
          </span>
          <span className="rounded-full bg-(--badge-type-bg) px-2.5 py-1 text-[10px] font-semibold text-(--badge-type-text) shadow-sm backdrop-blur-sm">
            {data.type}
          </span>
        </div>

        {/* 2. 찜하기 버튼은 클릭해도 페이지 이동 안 되게 막음 (e.preventDefault) */}
        <button
          onClick={(e) => {
            e.preventDefault(); // 부모 Link의 클릭 이벤트를 막음
            console.log("찜하기 클릭됨");
          }}
          className="absolute bottom-3 right-3 rounded-full bg-(--oboon-bg-surface)/90 p-2 text-(--oboon-text-body) shadow-sm backdrop-blur transition-all z-10 hover:text-(--oboon-danger) hover:scale-105"
        >
          <Heart className="w-4 h-4" />
        </button>
      </div>

      {/* 텍스트 정보 영역 */}
      <div className="flex flex-1 flex-col p-5">
        <h3 className="mb-1 line-clamp-2 text-base font-semibold text-(--oboon-text-title)">
          {data.title}
        </h3>
        <p className="mb-5 flex items-center gap-1 text-xs text-(--oboon-text-muted)">
          <MapPin className="w-3 h-3" /> {data.location}
        </p>

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-(--oboon-border-default) pt-4">
          <div>
            <span className="text-[11px] text-(--oboon-text-muted) block mb-0.5">
              분양가
            </span>
            <span className="text-base font-semibold text-(--oboon-text-title)">
              {data.price}
            </span>
          </div>
          {/* 상담신청 버튼은 Link 안에 있어도 동작상 문제 없으므로 그대로 둠 */}
          <button className="rounded-full bg-(--oboon-bg-subtle) px-3 py-1.5 text-xs font-semibold text-(--oboon-text-body) transition-all hover:bg-(--oboon-bg-surface)">
            상담신청
          </button>
        </div>
      </div>
    </Link>
  );
}
