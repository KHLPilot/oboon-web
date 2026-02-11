"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

type PropertyImageGalleryProps = {
  imageUrls: string[];
  title: string;
  placeholderText: string;
};

export default function PropertyImageGallery({
  imageUrls,
  title,
  placeholderText,
}: PropertyImageGalleryProps) {
  const validUrls = useMemo(
    () => imageUrls.filter((url) => typeof url === "string" && url.trim().length > 0),
    [imageUrls],
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const total = validUrls.length;
  const hasImages = total > 0;

  const safeIndex = hasImages ? Math.min(activeIndex, total - 1) : 0;
  const activeUrl = hasImages ? validUrls[safeIndex] : null;
  const canSlide = total > 1;

  const goPrev = () => {
    if (!canSlide) return;
    setActiveIndex((prev) => (prev - 1 + total) % total);
  };

  const goNext = () => {
    if (!canSlide) return;
    setActiveIndex((prev) => (prev + 1) % total);
  };

  return (
    <div>
      <div className="overflow-hidden rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-page)">
        <div className="relative aspect-video w-full bg-(--oboon-bg-page)">
          {activeUrl ? (
            <Image
              src={activeUrl}
              alt={`${title} 이미지 ${safeIndex + 1}`}
              fill
              className="object-contain"
              sizes="(max-width: 768px) 100vw, 1200px"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-(--oboon-text-muted)">
              {placeholderText}
            </div>
          )}

          {canSlide ? (
            <>
              <button
                type="button"
                onClick={goPrev}
                aria-label="이전 이미지"
                className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full border border-white/40 bg-black/35 p-1.5 text-white transition hover:bg-black/55"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={goNext}
                aria-label="다음 이미지"
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-white/40 bg-black/35 p-1.5 text-white transition hover:bg-black/55"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </>
          ) : null}
        </div>
      </div>

      {total > 1 ? (
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {validUrls.map((url, index) => (
            <button
              key={`${url}-${index}`}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={[
                "relative aspect-square w-20 shrink-0 overflow-hidden rounded-lg border sm:w-22 md:w-24",
                index === safeIndex
                  ? "border-(--oboon-primary)"
                  : "border-(--oboon-border-default)",
              ].join(" ")}
              aria-label={`이미지 ${index + 1} 보기`}
            >
              <Image
                src={url}
                alt={`${title} 썸네일 ${index + 1}`}
                fill
                className="object-cover"
                sizes="96px"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
