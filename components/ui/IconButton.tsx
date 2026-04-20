"use client";

import * as React from "react";

import { cn } from "@/lib/utils/cn";

export type IconButtonProps = {
  icon: React.ReactNode;
  "aria-label": string;
  variant?: "fill" | "clear" | "border";
  size?: "sm" | "md" | "lg";
  shape?: "default" | "circle";
  disabled?: boolean;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  className?: string;
  type?: "button" | "submit" | "reset";
};

function getVariantClass(variant: NonNullable<IconButtonProps["variant"]>) {
  switch (variant) {
    case "fill":
      return cn(
        "bg-(--oboon-bg-subtle)",
        "hover:bg-(--oboon-bg-subtle)/80",
        "active:bg-transparent",
      );
    case "border":
      return cn(
        "bg-transparent border border-(--oboon-border-default)",
        "hover:bg-(--oboon-bg-subtle)/40",
        "active:bg-(--oboon-bg-subtle)/60",
      );
    case "clear":
    default:
      return cn(
        "bg-transparent",
        "hover:bg-(--oboon-bg-subtle)/60",
        "active:bg-(--oboon-bg-subtle)",
      );
  }
}

function getSizeClass(size: NonNullable<IconButtonProps["size"]>) {
  switch (size) {
    case "sm":
      return cn("w-7 h-7", "text-[16px]");
    case "lg":
      return cn("w-11 h-11", "text-[24px]");
    case "md":
    default:
      return cn("w-9 h-9", "text-[20px]");
  }
}

function getShapeClass(shape: NonNullable<IconButtonProps["shape"]>) {
  switch (shape) {
    case "circle":
      return "rounded-full";
    case "default":
    default:
      return "rounded-xl";
  }
}

const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      icon,
      "aria-label": ariaLabel,
      variant = "clear",
      size = "md",
      shape = "default",
      disabled = false,
      onClick,
      className,
      type = "button",
    },
    ref,
  ) => {
    const isDisabled = Boolean(disabled);

    return (
      <button
        ref={ref}
        type={type}
        aria-label={ariaLabel}
        disabled={isDisabled}
        onClick={onClick}
        className={cn(
          "inline-flex items-center justify-center transition-colors duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--oboon-accent)/30",
          getVariantClass(variant),
          getSizeClass(size),
          getShapeClass(shape),
          isDisabled
            ? "opacity-40 pointer-events-none cursor-not-allowed"
            : "cursor-pointer",
          className,
        )}
      >
        <span
          aria-hidden="true"
          className={cn("inline-flex items-center justify-center", getSizeClass(size))}
        >
          {icon}
        </span>
      </button>
    );
  },
);

IconButton.displayName = "IconButton";

export default IconButton;
