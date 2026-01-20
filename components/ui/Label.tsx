// components/ui/Label.tsx
"use client";

import * as React from "react";

type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement>;

export default function Label({ className = "", ...props }: LabelProps) {
  return (
    <label
      className={["ob-typo-subtitle text-(--oboon-text-title) block mb-2", className].join(
        " ",
      )}
      {...props}
    />
  );
}
