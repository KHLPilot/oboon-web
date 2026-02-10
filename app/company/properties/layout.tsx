// app/company/properties/layout.tsx
import type { ReactNode } from "react";

export default function PropertiesLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <div className="flex-1 bg-(--oboon-bg-page)">{children}</div>;
}
