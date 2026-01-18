// components/layout/PageContainer.tsx
import { cn } from "@/app/company/properties/[id]/units/utils";

type PageContainerProp = {
  children: React.ReactNode;
  className?: string;
  noHeaderOffset?: boolean;
};

export default function PageContainer({
  children,
  className,
  noHeaderOffset,
}: PageContainerProp) {
  return (
    <div
      className={cn(
        // layout
        "mx-auto w-full",

        // max width
        "max-w-240 lg:max-w-300",

        // horizontal padding
        "px-4 sm:px-5",

        // vertical padding
        !noHeaderOffset && "pt-22 sm:pt-24 md:pt-24",
        "pt-10 pb-8 sm:pb-10",

        className,
      )}
    >
      {children}
    </div>
  );
}
