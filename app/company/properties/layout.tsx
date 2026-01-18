// app/company/properties/layout.tsx
import type { ReactNode } from "react";
import PageContainer from "@/components/shared/PageContainer";

export default function PropertiesLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <div className="flex-1 bg-(--oboon-bg-page)">{children}</div>;
}
