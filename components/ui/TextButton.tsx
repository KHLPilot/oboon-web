"use client";

import * as React from "react";

import { cn } from "@/lib/utils/cn";

export type TextButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  color?: "muted" | "danger" | "primary";
  size?: "sm" | "md";
  loading?: boolean;
};

function getColorClass(color: NonNullable<TextButtonProps["color"]>) {
  switch (color) {
    case "danger":
      return "text-(--oboon-danger) hover:text-(--oboon-danger-hover)";
    case "primary":
      return "text-(--oboon-primary) hover:text-(--oboon-primary-hover)";
    case "muted":
    default:
      return "text-(--oboon-text-muted) hover:text-(--oboon-text-subtle)";
  }
}

function getSizeClass(size: NonNullable<TextButtonProps["size"]>) {
  switch (size) {
    case "md":
      return "ob-typo-body2";
    case "sm":
    default:
      return "ob-typo-caption";
  }
}

const TextButton = React.forwardRef<HTMLButtonElement, TextButtonProps>(
  (
    {
      color = "muted",
      size = "sm",
      loading = false,
      disabled,
      className,
      children,
      type = "button",
      ...props
    },
    ref,
  ) => {
    const isDisabled = Boolean(disabled || loading);

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        className={cn(
          "inline-flex items-center justify-center gap-1 transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--oboon-accent)/30",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          getColorClass(color),
          getSizeClass(size),
          className,
        )}
        {...props}
      >
        {loading ? (
          <span
            aria-hidden="true"
            className={cn(
              "inline-block h-3.5 w-3.5 rounded-full",
              "border-2 border-(--oboon-spinner-ring) border-t-(--oboon-spinner-head)",
              "animate-spin",
            )}
          />
        ) : null}
        <span>{children}</span>
      </button>
    );
  },
);

TextButton.displayName = "TextButton";

export default TextButton;
