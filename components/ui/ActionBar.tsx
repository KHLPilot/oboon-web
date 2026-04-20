"use client";

import * as React from "react";

type ActionBarProps = {
  children: React.ReactNode;
  className?: string;
  hideAbove?: "sm" | "md" | "lg";
};

function cx(...cls: Array<string | false | null | undefined>) {
  return cls.filter(Boolean).join(" ");
}

export default function ActionBar({
  children,
  className,
  hideAbove = "lg",
}: ActionBarProps) {
  return (
    <div
      className={cx(
        "fixed inset-x-0 bottom-0 border-t border-(--oboon-border-default) bg-(--oboon-bg-surface)/90 backdrop-blur",
        "px-4 py-3 pb-[max(env(safe-area-inset-bottom),12px)]",
        hideAbove === "sm"
          ? "sm:hidden"
          : hideAbove === "md"
            ? "md:hidden"
            : "lg:hidden",
        className,
      )}
    >
      {children}
    </div>
  );
}
