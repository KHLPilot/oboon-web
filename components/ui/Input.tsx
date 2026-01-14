function cn(...classes: Array<string | undefined | false | null>) {
  return classes.filter(Boolean).join(" ");
}

export default function Input(
  props: React.InputHTMLAttributes<HTMLInputElement>
) {
  const { className, ...rest } = props;
  return (
    <input
      {...rest}
      className={cn(
        "w-full rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) px-4 py-3 ob-typo-body focus:outline-none focus:ring-2 focus:ring-(--oboon-primary)",
        className
      )}
    />
  );
}
