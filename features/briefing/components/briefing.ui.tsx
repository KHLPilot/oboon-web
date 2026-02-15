// features/briefing/briefing.ui.tsx
import Image from "next/image";

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
          ? "relative aspect-4/5 w-full overflow-hidden"
          : "relative h-full w-full overflow-hidden",
        className
      )}
    >
      <Image
        src={imageUrl}
        alt=""
        fill
        sizes={mode === "ratio" ? "(max-width: 768px) 100vw, 400px" : "100vw"}
        className={cx(
          "object-cover transition-transform duration-300",
          imgClassName
        )}
      />
    </div>
  );
}
