"use client";

import * as React from "react";
import { Check } from "lucide-react";

type CheckboxProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
};

function cx(...cls: Array<string | false | null | undefined>) {
  return cls.filter(Boolean).join(" ");
}

export default function Checkbox({
  checked,
  onChange,
  label,
  disabled = false,
  className,
  id,
}: CheckboxProps) {
  const generatedId = React.useId();
  const resolvedId = id ?? generatedId;

  return (
    <label
      className={cx(
        "flex items-center gap-2 cursor-pointer",
        disabled ? "opacity-50 cursor-not-allowed" : "",
        className,
      )}
      htmlFor={resolvedId}
    >
      <span
        aria-hidden="true"
        className={cx(
          "flex h-4 w-4 items-center justify-center rounded border transition-colors duration-150",
          checked
            ? "bg-(--oboon-primary) border-(--oboon-primary)"
            : "bg-(--oboon-bg-surface) border-(--oboon-border-default)",
        )}
      >
        {checked ? <Check className="h-3 w-3 text-white" /> : null}
      </span>

      {label ? <span>{label}</span> : null}

      <input
        id={resolvedId}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
    </label>
  );
}
