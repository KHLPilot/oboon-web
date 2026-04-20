"use client";

import * as React from "react";

import { cn } from "@/lib/utils/cn";

export type BottomCTAProps = {
  variant: "single" | "double";
  primaryButton: React.ReactNode;
  secondaryButton?: React.ReactNode;
  hideOnScroll?: boolean;
  className?: string;
};

export default function BottomCTA({
  variant,
  primaryButton,
  secondaryButton,
  hideOnScroll = false,
  className,
}: BottomCTAProps) {
  const [isHidden, setIsHidden] = React.useState(false);
  const previousScrollYRef = React.useRef(0);

  React.useEffect(() => {
    if (!hideOnScroll) return;

    previousScrollYRef.current = window.scrollY;
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > previousScrollYRef.current) {
        setIsHidden(true);
      } else if (currentScrollY < previousScrollYRef.current) {
        setIsHidden(false);
      }
      previousScrollYRef.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [hideOnScroll]);

  let layout: React.ReactNode;

  switch (variant) {
    case "single":
      layout = (
        <div className="w-full [&_button]:w-full [&_a]:w-full [&_div]:w-full">
          {primaryButton}
        </div>
      );
      break;
    case "double":
    default:
      layout = (
        <div className="flex gap-3">
          {secondaryButton ? (
            <div className="flex-1 [&_button]:w-full [&_a]:w-full [&_div]:w-full">
              {secondaryButton}
            </div>
          ) : null}
          <div className="flex-[2] [&_button]:w-full [&_a]:w-full [&_div]:w-full">
            {primaryButton}
          </div>
        </div>
      );
      break;
  }

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-(--oboon-z-overlay) border-t border-(--oboon-border-subtle) bg-(--oboon-bg-surface)/95 backdrop-blur-sm",
        "px-4 pt-3 pb-[max(env(safe-area-inset-bottom),12px)] transition-transform duration-200",
        hideOnScroll && isHidden ? "translate-y-full" : "translate-y-0",
        className,
      )}
    >
      {layout}
    </div>
  );
}
