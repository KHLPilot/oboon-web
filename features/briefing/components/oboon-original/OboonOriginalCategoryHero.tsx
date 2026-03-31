type Props = {
  name: string;
  description: string | null;
  color: string | null;
  categoryKey: string;
  postCount: number;
  coverImageUrl: string | null;
  eyebrowLabel?: string;
  countLabel?: string;
};

const PATTERNS: string[] = [
  "radial-gradient(circle, rgba(255,255,255,0.12) 1px, transparent 1px)",
  "repeating-linear-gradient(45deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 1px, transparent 1px, transparent 12px)",
  "repeating-linear-gradient(0deg, rgba(255,255,255,0.07) 0px, rgba(255,255,255,0.07) 1px, transparent 1px, transparent 16px)",
  "radial-gradient(circle, rgba(255,255,255,0.10) 2px, transparent 2px)",
];

const PATTERN_SIZES: string[] = [
  "20px 20px",
  "auto",
  "auto",
  "32px 32px",
];

function getPatternIndex(key: string): number {
  return key.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % 4;
}

export default function OboonOriginalCategoryHero({
  name,
  description,
  color,
  categoryKey,
  postCount,
  coverImageUrl,
  eyebrowLabel = "오분 오리지널",
  countLabel = "콘텐츠",
}: Props) {
  const patternIndex = getPatternIndex(categoryKey);
  const bgColor = color ?? "var(--oboon-bg-inverse)";

  return (
    <div
      className="relative flex min-h-[180px] flex-col justify-end overflow-hidden rounded-2xl px-6 pb-8 pt-10 md:grid md:min-h-[240px] md:grid-cols-[minmax(0,1fr)_minmax(224px,288px)] md:items-center md:justify-normal md:gap-6 md:px-10 md:py-4"
      style={{ backgroundColor: bgColor }}
    >
      {/* CSS 패턴 오버레이 */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: PATTERNS[patternIndex],
          backgroundSize: PATTERN_SIZES[patternIndex],
        }}
      />

      {/* 모바일 전용: 커버 이미지 풀 블리드 배경 + 그라디언트 */}
      {coverImageUrl && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={coverImageUrl}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 h-full w-full object-cover md:hidden"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 to-transparent md:hidden" />
        </>
      )}

      {/* 텍스트 콘텐츠 */}
      <div className="relative z-10 md:col-start-1 md:min-w-0">
        <div className="mb-1 ob-typo-caption text-white/50">{eyebrowLabel}</div>
        <div className="ob-typo-display text-white">{name}</div>
        {(description || postCount > 0) && (
          <div className="mt-2 ob-typo-body text-white/60">
            {[description, postCount > 0 ? `${countLabel} ${postCount}개` : null]
              .filter(Boolean)
              .join(" · ")}
          </div>
        )}
      </div>

      {/* 데스크탑 전용: 우측 커버 이미지 카드 */}
      <div className="relative hidden aspect-[4/3] w-full overflow-hidden rounded-xl md:col-start-2 md:block md:max-w-[288px] md:justify-self-end">
        {coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverImageUrl}
            alt={name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-slate-200/85 text-slate-500">
            <span className="ob-typo-caption">커버 없음</span>
          </div>
        )}
      </div>
    </div>
  );
}
