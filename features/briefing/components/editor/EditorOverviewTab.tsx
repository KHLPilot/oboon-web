type Stats = {
  totalPosts: number;
  totalLikes: number;
  totalComments: number;
  totalViews: number;
};

const STAT_ITEMS: { key: keyof Stats; label: string }[] = [
  { key: "totalPosts", label: "총 글" },
  { key: "totalLikes", label: "좋아요" },
  { key: "totalComments", label: "댓글" },
  { key: "totalViews", label: "조회수" },
];

export default function EditorOverviewTab({ stats }: { stats: Stats }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {STAT_ITEMS.map(({ key, label }) => (
        <div
          key={key}
          className="rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-6"
        >
          <div className="ob-typo-h1 text-(--oboon-text-title)">
            {stats[key].toLocaleString()}
          </div>
          <div className="mt-1 ob-typo-caption text-(--oboon-text-muted)">
            {label}
          </div>
        </div>
      ))}
    </div>
  );
}
