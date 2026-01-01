function cn(...classes: Array<string | undefined | false | null>) {
  return classes.filter(Boolean).join(" ");
}

export default function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-5 shadow-(--oboon-shadow-card)",
        className
      )}
    >
      {children}
    </div>
  );
}
