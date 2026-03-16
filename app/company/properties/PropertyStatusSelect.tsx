// /app/company/properties/PropertyStatusSelect.tsx

"use client";

import Select from "@/components/ui/Select";
import type { PropertyStatus } from "@/features/property/domain/propertyStatus";
import { PROPERTY_STATUS_OPTIONS } from "@/features/property/domain/propertyStatus";

export default function PropertyStatusSelect({
  value,
  onChange,
  disabled,
}: {
  value: PropertyStatus;
  onChange: (v: PropertyStatus) => void;
  disabled?: boolean;
}) {
  return (
    <Select
      value={value}
      onChange={onChange}
      options={PROPERTY_STATUS_OPTIONS}
      disabled={disabled}
    />
  );
}
