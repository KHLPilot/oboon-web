"use client";

import * as React from "react";
import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils/cn";

export type ListRowTextsProps = {
  title: string;
  subtitle?: string;
  caption?: string;
  className?: string;
};

export type ListRowProps = {
  left?: React.ReactNode;
  leftAlignment?: "top" | "center";
  contents: React.ReactNode;
  right?: React.ReactNode;
  rightAlignment?: "top" | "center";
  withArrow?: boolean;
  withTouchEffect?: boolean;
  border?: "indented" | "none";
  verticalPadding?: "small" | "medium" | "large" | "xlarge";
  horizontalPadding?: "small" | "medium";
  disabled?: boolean;
  className?: string;
  onClick?: () => void;
};

function getVerticalPaddingClass(verticalPadding: NonNullable<ListRowProps["verticalPadding"]>) {
  switch (verticalPadding) {
    case "small":
      return "py-2";
    case "medium":
      return "py-3";
    case "large":
      return "py-4";
    case "xlarge":
      return "py-6";
    default:
      return "py-3";
  }
}

function getHorizontalPaddingClass(
  horizontalPadding: NonNullable<ListRowProps["horizontalPadding"]>,
) {
  switch (horizontalPadding) {
    case "small":
      return "px-5";
    case "medium":
      return "px-6";
    default:
      return "px-6";
  }
}

function getBorderClass(border: NonNullable<ListRowProps["border"]>) {
  switch (border) {
    case "indented":
      return [
        "relative after:absolute after:bottom-0 after:right-0 after:h-px after:content-[''] after:bg-(--oboon-border-subtle)",
        "after:left-[var(--list-row-left-width)]",
      ].join(" ");
    case "none":
    default:
      return "";
  }
}

function getZoneAlignmentClass(alignment: NonNullable<ListRowProps["leftAlignment"]>) {
  switch (alignment) {
    case "top":
      return "self-start";
    case "center":
    default:
      return "self-center";
  }
}

function ListRowTexts({
  title,
  subtitle,
  caption,
  className,
}: ListRowTextsProps) {
  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      <div className="ob-typo-body2 text-(--oboon-text-default)">{title}</div>
      {subtitle ? (
        <div className="ob-typo-caption1 text-(--oboon-text-muted)">{subtitle}</div>
      ) : null}
      {caption ? (
        <div className="ob-typo-caption2 text-(--oboon-text-subtle)">{caption}</div>
      ) : null}
    </div>
  );
}

const ListRow = React.forwardRef<HTMLDivElement, ListRowProps>(function ListRow(
  {
    left,
    leftAlignment = "center",
    contents,
    right,
    rightAlignment = "center",
    withArrow = false,
    withTouchEffect = false,
    border = "indented",
    verticalPadding = "medium",
    horizontalPadding = "medium",
    disabled = false,
    className,
    onClick,
  },
  ref,
) {
  const leftRef = React.useRef<HTMLDivElement>(null);
  const [leftWidth, setLeftWidth] = React.useState(0);

  React.useLayoutEffect(() => {
    const updateLeftWidth = () => {
      setLeftWidth(leftRef.current?.offsetWidth ?? 0);
    };

    updateLeftWidth();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateLeftWidth);
      return () => {
        window.removeEventListener("resize", updateLeftWidth);
      };
    }

    const observer = new ResizeObserver(updateLeftWidth);
    if (leftRef.current) {
      observer.observe(leftRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [left]);

  return (
    <div
      ref={ref}
      role={onClick ? "button" : undefined}
      tabIndex={onClick && !disabled ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick && !disabled
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      style={
        {
          "--list-row-left-width": `${leftWidth}px`,
        } as React.CSSProperties
      }
      className={cn(
        "flex w-full items-center",
        getVerticalPaddingClass(verticalPadding),
        getHorizontalPaddingClass(horizontalPadding),
        getBorderClass(border),
        withTouchEffect && "transition-colors hover:bg-(--oboon-bg-subtle)/60 active:bg-(--oboon-bg-subtle)",
        onClick && !disabled && "cursor-pointer",
        disabled && "opacity-40 pointer-events-none",
        className,
      )}
    >
      {left ? (
        <div
          ref={leftRef}
          className={cn("mr-3 shrink-0", getZoneAlignmentClass(leftAlignment))}
        >
          {left}
        </div>
      ) : null}

      <div className="min-w-0 flex-1">{contents}</div>

      <div
        className={cn(
          "ml-3 flex shrink-0 items-center gap-2",
          getZoneAlignmentClass(rightAlignment),
        )}
      >
        {right}
        {withArrow ? (
          <ChevronRight className="h-4 w-4 shrink-0 text-(--oboon-text-muted)" aria-hidden="true" />
        ) : null}
      </div>
    </div>
  );
});

type ListRowCompound = typeof ListRow & {
  Texts: typeof ListRowTexts;
};

(ListRow as ListRowCompound).Texts = ListRowTexts;

export default ListRow as ListRowCompound;
