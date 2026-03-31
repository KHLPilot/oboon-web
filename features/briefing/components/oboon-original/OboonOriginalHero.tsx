type Props = {
  seriesCount: number;
  contentCount: number;
};

export default function OboonOriginalHero({
  seriesCount,
  contentCount,
}: Props) {
  return (
    <div className="grid min-h-[240px] grid-cols-1 overflow-hidden rounded-2xl bg-(--oboon-bg-inverse) md:min-h-[300px] md:grid-cols-[55%_45%]">
      <div className="flex flex-col justify-center px-6 py-12 md:px-10 md:py-14">
        <div className="ob-typo-display text-(--oboon-text-title)">
          OBOON
          <br />
          Original
        </div>
        <div className="mt-3 ob-typo-h3 break-keep text-(--oboon-text-muted)">
          분양 시장을 바라보는 새로운 시각
        </div>
        <div className="mt-5 ob-typo-caption text-(--oboon-text-muted)">
          {seriesCount}개 시리즈 · {contentCount}개 콘텐츠
        </div>
      </div>

      <div
        className="hidden opacity-30 md:block"
        style={{
          backgroundImage:
            "radial-gradient(circle, var(--oboon-text-muted) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
          maskImage: "linear-gradient(to right, transparent 0%, black 30%)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent 0%, black 30%)",
        }}
      />
    </div>
  );
}
