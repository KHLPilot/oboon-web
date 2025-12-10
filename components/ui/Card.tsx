export default function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-5 shadow-(--oboon-shadow-card)">
      {children}
    </div>
  );
}
