// /app/company/properties/Property.ts

"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";

import Button from "@/components/ui/Button";
import type { PropertyStatus } from "./propertyStatus";
import {
  PROPERTY_STATUS_OPTIONS,
  PROPERTY_STATUS_LABEL,
} from "./propertyStatus";

export default function PropertyStatusSelect({
  value,
  onChange,
  disabled,
}: {
  value: PropertyStatus;
  onChange: (v: PropertyStatus) => void;
  disabled?: boolean;
}) {
  const label = PROPERTY_STATUS_LABEL[value];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="secondary"
          size="md"
          shape="default"
          disabled={disabled}
          className="w-full justify-between"
          aria-haspopup="listbox"
        >
          <span className="text-sm font-medium">{label}</span>
          <span className="text-xs text-(--oboon-text-muted)">▼</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="min-w-60 max-w-90">
        {PROPERTY_STATUS_OPTIONS.map((opt) => (
          <DropdownMenuItem key={opt.value} onClick={() => onChange(opt.value)}>
            {opt.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
