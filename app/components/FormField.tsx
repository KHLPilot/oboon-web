// app/components/FormField.tsx

import React from "react";

type FormFieldProps = {
  label: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  labelClassName?: string;
};

export function FormField({
  label,
  children,
  className = "",
  labelClassName = "text-xs font-medium text-(--oboon-text-muted)",
}: FormFieldProps) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label className={labelClassName}>{label}</label>
      {children}
    </div>
  );
}