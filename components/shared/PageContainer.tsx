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
        // layout
        "mx-auto w-full",

        // max width
        "max-w-240 lg:max-w-300",

        // horizontal padding
        "px-4 sm:px-5",

        // vertical padding (mobile first)
        "py-8 sm:py-10",

        className
      )}
    >
      {children}
    </div>
  );
}
