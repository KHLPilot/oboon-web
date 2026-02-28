// components/ui/Badge.tsx

import React from "react";

interface BadgeProps {
  children: React.ReactNode;
  variant?:
    | "default"
    | "status"
    | "success"
    | "primary"
    | "warning"
    | "danger";
  className?: string;
}

export const Badge = ({
  children,
  variant = "default",
  className = "",
}: BadgeProps) => {
  let variantStyles = "";

  switch (variant) {
    case "status":
      variantStyles =
        "bg-(--oboon-bg-subtle) text-(--oboon-text-body) " +
        "border border-(--oboon-border-default)";
      break;

    case "success":
      variantStyles =
        "bg-(--oboon-primary) text-(--oboon-on-primary) border border-transparent";
      break;

    case "primary":
      variantStyles =
        "bg-(--oboon-primary) text-(--oboon-on-primary) border border-transparent";
      break;

    case "warning":
      variantStyles =
        "bg-(--oboon-warning-bg) text-(--oboon-warning-text) border border-(--oboon-warning-border)";
      break;

    case "danger":
      variantStyles =
        "bg-(--oboon-danger-bg) text-(--oboon-danger-text) border border-(--oboon-danger-border)";
      break;

    case "default":
    default:
      variantStyles =
        "bg-(--oboon-bg-surface) text-(--oboon-text-body) " +
        "border border-(--oboon-border-default)";
      break;
  }

  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2.5 py-1",
        "text-[12px] font-medium",
        variantStyles,
        className,
      ].join(" ")}
    >
      {children}
    </span>
  );
};
