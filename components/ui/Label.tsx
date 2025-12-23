// components/ui/Label.tsx
"use client";

import * as React from "react";

type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement>;

export default function Label({ className = "", ...props }: LabelProps) {
  return (
    <label
      className={[
        "text-sm font-medium text-(--oboon-text-title)",
        "leading-none",
        className,
      ].join(" ")}
      {...props}
    />
  );
}
