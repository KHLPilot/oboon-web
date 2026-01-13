// features/briefing/briefing.ui.tsx
export function cx(...v: (string | false | null | undefined)[]) {
  return v.filter(Boolean).join(" ");
}

export const cardShell = cx(
  "overflow-hidden rounded-[16px]",
  "bg-(--oboon-bg-surface)",
  "border border-(--oboon-border-default)",
  "shadow-[0_10px_20px_rgba(0,0,0,0.04)]",
  "transition-transform duration-200"
);

export function Cover({
  imageUrl,
  className,
  imgClassName,
  mode = "ratio",
}: {
  imageUrl?: string;
  className?: string;
  imgClassName?: string;
  mode?: "ratio" | "fill";
}) {
  if (!imageUrl) {
    return (
      <div
        className={cx(
          mode === "ratio"
            ? "aspect-4/5 w-full bg-(--oboon-bg-subtle)"
            : "h-full w-full bg-(--oboon-bg-subtle)",
          className
        )}
      />
    );
  }

  return (
    <div
      className={cx(
        mode === "ratio"
          ? "aspect-4/5 w-full overflow-hidden"
          : "h-full w-full overflow-hidden",
        className
      )}
    >
      {" "}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt=""
        loading="lazy"
        className={cx(
          "h-full w-full object-cover transition-transform duration-300",
          imgClassName
        )}
      />
    </div>
  );
}
