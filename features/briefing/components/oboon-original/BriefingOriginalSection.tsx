import Link from "next/link";

import BriefingOriginalCard from "@/features/briefing/components/oboon-original/BriefingOriginalCard";

type BriefingOriginalSectionCategory = {
  id: string;
  key: string;
  name: string;
  coverImageUrl: string | null;
};

export default function BriefingOriginalSection({
  categories,
  countMap,
}: {
  categories: BriefingOriginalSectionCategory[];
  countMap: Map<string, number>;
}) {
  return (
    <section className="bg-(--oboon-bg-inverse)">
      <div className="mx-auto w-full max-w-240 px-4 pb-10 pt-6 sm:px-5 lg:max-w-300">
        <div className="flex flex-col gap-5">
          <div>
            <div className="ob-typo-h2 text-(--oboon-text-title)">오분 오리지널</div>
            <div className="mt-2 ob-typo-body text-(--oboon-text-muted)">
              분양 시장을 바라보는 새로운 시각
            </div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-4">
          {categories.slice(0, 4).map((category) => (
            <BriefingOriginalCard
              key={category.id}
              original={{
                key: category.key,
                name: category.name,
                description: null,
                coverImageUrl: category.coverImageUrl,
              }}
              count={countMap.get(category.id) ?? 0}
              href={`/briefing/oboon-original/${encodeURIComponent(category.key)}`}
            />
          ))}
        </div>

        <div className="mt-10 flex justify-center">
          <Link
            href="/briefing/oboon-original"
            className="inline-flex items-center justify-center rounded-full border border-(--oboon-border-default) px-6 py-3 ob-typo-caption font-semibold text-(--oboon-text-title) transition-colors hover:border-(--oboon-text-muted) hover:bg-(--oboon-bg-surface)"
          >
            전체 시리즈 보기
          </Link>
        </div>
      </div>
    </section>
  );
}
