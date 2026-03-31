"use client";

import { useMemo, useState } from "react";

import { cx } from "@/features/briefing/components/briefing.ui";
import BriefingOriginalCard from "@/features/briefing/components/oboon-original/BriefingOriginalCard";

type SeriesWithTags = {
  id: string;
  key: string;
  name: string;
  coverImageUrl: string | null;
  count: number;
  tags: { id: string; key: string; name: string }[];
};

type Tag = {
  id: string;
  key: string;
  name: string;
};

export default function OboonOriginalFilter({
  series,
  tags,
}: {
  series: SeriesWithTags[];
  tags: Tag[];
}) {
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);

  const filteredSeries = useMemo(() => {
    if (!selectedTagId) return series;
    return series.filter((item) =>
      item.tags.some((tag) => tag.id === selectedTagId),
    );
  }, [selectedTagId, series]);

  return (
    <section className="pb-2">
      <div className="mb-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setSelectedTagId(null)}
          className={cx(
            "inline-flex items-center rounded-full border px-3 py-1.5 ob-typo-caption font-semibold transition-colors",
            selectedTagId === null
              ? "border-(--oboon-primary) bg-(--oboon-primary)/10 text-(--oboon-primary)"
              : "border-(--oboon-border-default) bg-(--oboon-bg-surface) text-(--oboon-text-muted) hover:bg-(--oboon-bg-subtle) hover:text-(--oboon-text-title)",
          )}
        >
          전체
        </button>

        {tags.map((tag) => (
          <button
            key={tag.id}
            type="button"
            onClick={() => setSelectedTagId(tag.id)}
            className={cx(
              "inline-flex items-center rounded-full border px-3 py-1.5 ob-typo-caption font-semibold transition-colors",
              selectedTagId === tag.id
                ? "border-(--oboon-primary) bg-(--oboon-primary)/10 text-(--oboon-primary)"
                : "border-(--oboon-border-default) bg-(--oboon-bg-surface) text-(--oboon-text-muted) hover:bg-(--oboon-bg-subtle) hover:text-(--oboon-text-title)",
            )}
          >
            {tag.name}
          </button>
        ))}
      </div>

      {filteredSeries.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-4">
          {filteredSeries.map((item) => (
            <BriefingOriginalCard
              key={item.id}
              original={{
                key: item.key,
                name: item.name,
                description: null,
                coverImageUrl: item.coverImageUrl,
              }}
              count={item.count}
              href={`/briefing/oboon-original/${encodeURIComponent(item.key)}`}
            />
          ))}
        </div>
      ) : (
        <div className="flex min-h-40 items-center justify-center rounded-2xl border border-dashed border-(--oboon-border-default) bg-(--oboon-bg-surface) px-6 text-center">
          <div>
            <div className="ob-typo-h3 text-(--oboon-text-title)">
              선택한 태그의 시리즈가 없습니다
            </div>
            <div className="mt-2 ob-typo-caption text-(--oboon-text-muted)">
              다른 태그를 선택하거나 전체 보기를 확인하세요.
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
