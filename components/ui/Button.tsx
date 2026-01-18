"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "warning";
export type ButtonSize = "sm" | "md" | "lg";
export type ButtonShape = "default" | "pill";

function cn(...classes: Array<string | undefined | false | null>) {
  return classes.filter(Boolean).join(" ");
}

function getVariantClass(variant: ButtonVariant) {
  switch (variant) {
    case "primary":
      return cn(
        "bg-(--oboon-primary) text-(--oboon-on-primary) border border-(--oboon-primary)",
        "hover:bg-(--oboon-primary-hover)"
      );

    case "secondary":
      return cn(
        "bg-(--oboon-bg-subtle) text-(--oboon-text-title) border border-(--oboon-border-default)",
        "hover:bg-(--oboon-bg-subtle)/80"
      );

    case "ghost":
      return cn(
        "bg-transparent text-(--oboon-text-title)",
        "hover:bg-(--oboon-bg-subtle)/60"
      );

    case "danger":
      return cn(
        "bg-(--oboon-danger) text-(--oboon-on-danger) border border-(--oboon-danger)",
        "hover:bg-(--oboon-danger-hover)"
      );

    case "warning":
      return cn(
        "bg-(--oboon-warning-bg) text-(--oboon-warning-text) border border-(--oboon-warning-border)",
        "hover:bg-(--oboon-warning-bg-subtle)"
      );

    default:
      return "";
  }
}

/**
 * SSOT:
 * - size는 높이/패딩(레이아웃)만 담당
 * - 타이포는 ob-typo-button이 담당
 */
function getSizeClass(size: ButtonSize) {
  switch (size) {
    case "sm":
      return "h-8 px-3";
    case "md":
      return "h-10 px-4";
    case "lg":
      return "h-11 px-5";
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
  asChild?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
  shape?: ButtonShape;
  loading?: boolean;
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      asChild = false,
      variant = "primary",
      size = "md",
      shape = "default",
      loading = false,
      disabled,
      type = "button",
      onClick,
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = Boolean(disabled || loading);
    const Comp: any = asChild ? Slot : "button";

    // asChild일 때는 disabled/type 같은 button 전용 속성이 <a>에 전달되면 깨질 수 있으니 분기 처리
    const sharedClassName = cn(
      "inline-flex items-center justify-center gap-2 whitespace-nowrap",
      "transition-colors",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--oboon-accent)/30",
      // button이 아닐 때도 비활성화가 먹도록 수동 처리
      isDisabled ? "opacity-50 pointer-events-none" : "",
      "ob-typo-button",
      getVariantClass(variant),
      getSizeClass(size),
      getShapeClass(shape),
      className
    );

    const handleClick: React.MouseEventHandler<HTMLButtonElement> = (e) => {
      if (isDisabled) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      onClick?.(e);
    };
    return (
      <Comp
        ref={ref}
        className={sharedClassName}
        {...(!asChild ? { type, disabled: isDisabled } : {})}
        {...(asChild
          ? { "aria-disabled": isDisabled, "aria-busy": loading }
          : {})}
        onClick={handleClick}
        {...props}
      >
        {/* asChild에서는 Slot의 단일 자식 제약 때문에 “추가 노드”를 넣지 않는다 */}
        {asChild ? (
          children
        ) : (
          <>
            {loading ? (
              <>
                <span
                  aria-hidden="true"
                  className={cn(
                    "inline-block h-4 w-4 rounded-full",
                    "border-2 border-(--oboon-spinner-ring) border-t-(--oboon-spinner-head)",
                    "animate-spin"
                  )}
                />
                <span className="sr-only">로딩 중</span>
              </>
            ) : null}

            <span className={cn("inline-flex items-center gap-2", loading ? "opacity-90" : "")}>{children}</span>
          </>
        )}
      </Comp>
    );
  }
);

Button.displayName = "Button";

export default Button;
