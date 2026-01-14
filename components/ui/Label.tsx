// components/ui/Label.tsx
"use client";

import * as React from "react";

type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement>;

export default function Label({ className = "", ...props }: LabelProps) {
  return (
    <label
      className={[
        "ob-typo-caption text-(--oboon-text-title)",
        className,
      ].join(" ")}
      {...props}
    />
  );
}
