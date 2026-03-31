type Props = {
  name: string;
  description: string | null;
  color: string | null;
  categoryKey: string;
  postCount: number;
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
}: Props) {
  const patternIndex = getPatternIndex(categoryKey);
  const bgColor = color ?? "var(--oboon-bg-inverse)";

  return (
    <div
      className="relative flex min-h-[180px] flex-col justify-end overflow-hidden rounded-2xl px-6 pb-8 pt-10 md:min-h-[220px] md:px-10"
      style={{ backgroundColor: bgColor }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: PATTERNS[patternIndex],
          backgroundSize: PATTERN_SIZES[patternIndex],
        }}
      />

      <div className="relative z-10">
        <div className="mb-1 ob-typo-caption text-white/50">오분 오리지널</div>
        <div className="ob-typo-display text-white">{name}</div>
        {(description || postCount > 0) && (
          <div className="mt-2 ob-typo-body text-white/60">
            {[description, postCount > 0 ? `콘텐츠 ${postCount}개` : null]
              .filter(Boolean)
              .join(" · ")}
          </div>
        )}
      </div>
    </div>
  );
}
