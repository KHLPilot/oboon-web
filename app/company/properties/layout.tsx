import type { ReactNode } from "react";

export default function PropertiesLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div
      className="
        min-h-screen
        bg-white text-slate-900
        dark:bg-black dark:text-slate-100
      "
    >
      {children}
    </div>
  );
}
