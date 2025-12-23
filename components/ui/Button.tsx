"use client";

import * as React from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";
export type ButtonShape = "default" | "pill";

function cn(...classes: Array<string | undefined | false | null>) {
  return classes.filter(Boolean).join(" ");
}

function getVariantClass(variant: ButtonVariant) {
  switch (variant) {
    case "primary":
      return cn(
        "bg-[var(--oboon-accent,#2563eb)]",
        "text-[var(--oboon-on-accent,#ffffff)]",
        "hover:brightness-110",
        "border border-[var(--oboon-accent,#2563eb)]"
      );
    case "secondary":
      return cn(
        "bg-(--oboon-bg-subtle) text-(--oboon-text-title)",
        "hover:bg-(--oboon-bg-subtle)/80",
        "border border-(--oboon-border-default)"
      );
    case "ghost":
      return cn(
        "bg-transparent text-(--oboon-text-title)",
        "hover:bg-(--oboon-bg-subtle)/60"
      );
    case "danger":
      return cn(
        "bg-red-500 text-white",
        "hover:bg-red-600",
        "border border-red-500"
      );
    default:
      return "";
  }
}

function getSizeClass(size: ButtonSize) {
  switch (size) {
    case "sm":
      return "h-8 px-3 text-sm";
    case "md":
      return "h-10 px-4 text-sm";
    case "lg":
      return "h-11 px-5 text-base";
    default:
      return "";
  }
}

function getShapeClass(shape: ButtonShape) {
  switch (shape) {
    case "pill":
      return "rounded-full";
    case "default":
    default:
      return "rounded-xl";
  }
}

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  shape?: ButtonShape;
  loading?: boolean;
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      shape = "default",
      loading = false,
      disabled,
      type = "button",
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = Boolean(disabled || loading);

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        className={cn(
          "inline-flex items-center justify-center gap-2 whitespace-nowrap",
          "transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--oboon-accent)/30",
          "disabled:opacity-50 disabled:pointer-events-none",
          getVariantClass(variant),
          getSizeClass(size),
          getShapeClass(shape),
          className
        )}
        {...props}
      >
        {loading ? (
          <>
            <span
              aria-hidden="true"
              className={cn(
                "inline-block h-4 w-4 rounded-full",
                "border-2 border-white/30 border-t-white/80",
                "animate-spin"
              )}
            />
            <span className="sr-only">로딩 중</span>
          </>
        ) : null}
        <span className={cn(loading ? "opacity-90" : "")}>{children}</span>
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;
