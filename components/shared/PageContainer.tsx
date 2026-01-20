// components/layout/PageContainer.tsx
import { cn } from "@/app/company/properties/[id]/units/utils";

type PageContainerProp = {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "full";
};

export default function PageContainer({
  children,
  className,
  variant = "default",
}: PageContainerProp) {
  const layoutClass =
    variant === "full" ? "min-h-dvh flex items-center justify-center" : "";
  const paddingClass =
    variant === "full"
      ? "pt-0 pb-0 -mt-[var(--oboon-header-offset)]"
      : "pt-6 sm:pt-10 md:pt-10 pb-8 sm:pb-10";

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
        layoutClass,
        paddingClass,

        className,
      )}
    >
      {children}
    </div>
  );
}
