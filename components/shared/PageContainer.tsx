// components/layout/PageContainer.tsx
import type { ReactNode } from "react";

function cn(...classes: Array<string | undefined | false | null>) {
  return classes.filter(Boolean).join(" ");
}

export default function PageContainer({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-[1200px] px-5 pt-10 pb-10",
        className
      )}
    >
      {children}
    </div>
  );
}
