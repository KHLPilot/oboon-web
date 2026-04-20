"use client";

import * as React from "react";

type ToggleProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  size?: "sm" | "md";
};

function cx(...cls: Array<string | false | null | undefined>) {
  return cls.filter(Boolean).join(" ");
}

export default function Toggle({
  checked,
  onChange,
  label,
  disabled = false,
  size = "md",
}: ToggleProps) {
  const isSm = size === "sm";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx(
        "relative inline-flex items-center rounded-full transition-colors duration-150",
        isSm ? "h-5 w-9" : "h-6 w-11",
        checked ? "bg-(--oboon-primary)" : "bg-(--oboon-bg-subtle)",
        disabled ? "opacity-50 cursor-not-allowed pointer-events-none" : "",
      )}
    >
      <span
        className={cx(
          "inline-block rounded-full bg-white shadow-sm transition-transform duration-150",
          isSm ? "h-4 w-4" : "h-5 w-5",
          checked
            ? isSm
              ? "translate-x-4"
              : "translate-x-5"
            : "translate-x-1",
        )}
      />
    </button>
  );
}
