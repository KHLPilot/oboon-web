function cn(...classes: Array<string | undefined | false | null>) {
  return classes.filter(Boolean).join(" ");
}

type CardProps = React.ComponentPropsWithoutRef<"div">;

export default function Card({ children, className, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) shadow-(--oboon-shadow-card)",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
