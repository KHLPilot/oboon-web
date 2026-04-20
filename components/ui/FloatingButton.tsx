"use client";

import * as React from "react";

import { cn } from "@/lib/utils/cn";

export type FloatingButtonProps = {
  icon: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  label?: string;
  title?: string;
  className?: string;
};

export default function FloatingButton({
  icon,
  onClick,
  disabled = false,
  label,
  title,
  className,
}: FloatingButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "pointer-events-auto inline-flex h-10 w-10 items-center justify-center rounded-full",
        "border border-(--oboon-border-default) bg-(--oboon-bg-surface)/60 shadow-sm backdrop-blur-sm",
        "transition-colors duration-150 hover:bg-(--oboon-bg-surface)/75",
        disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer",
        className,
      )}
    >
      {icon}
    </button>
  );
}
