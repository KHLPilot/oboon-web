import { cn } from "@/lib/utils/cn";

export type LoaderSize = "small" | "medium" | "large";
export type LoaderType = "primary" | "dark" | "light";

export type LoaderProps = {
  size?: LoaderSize;
  type?: LoaderType;
  label?: string;
  className?: string;
};

function getSpinnerSizeClass(size: LoaderSize) {
  switch (size) {
    case "small":
      return "w-5 h-5 border-2";
    case "large":
      return "w-12 h-12 border-4";
    case "medium":
    default:
      return "w-8 h-8 border-[3px]";
  }
}

function getSpinnerTypeClass(type: LoaderType) {
  switch (type) {
    case "dark":
      return "border-(--oboon-border-default)/40 border-t-(--oboon-text-title)";
    case "light":
      return "border-white/30 border-t-white";
    case "primary":
    default:
      // Button 내부 스피너는 --oboon-spinner-* 토큰을 쓰지만, Loader는
      // 전역 로딩 상태에서 브랜드 기본색(--oboon-primary)을 직접 사용한다.
      return "border-(--oboon-border-default) border-t-(--oboon-primary)";
  }
}

function getLabelTypeClass(type: LoaderType) {
  switch (type) {
    case "dark":
      return "text-(--oboon-text-default)";
    case "light":
      return "text-white/80";
    case "primary":
    default:
      return "text-(--oboon-text-muted)";
  }
}

export function Loader({
  size = "medium",
  type = "primary",
  label,
  className,
}: LoaderProps) {
  const accessibleLabel = label ?? "로딩 중";

  return (
    <div
      role="status"
      aria-label={accessibleLabel}
      className={cn("flex flex-col items-center justify-center text-center", className)}
    >
      <div
        aria-hidden="true"
        className={cn(
          "rounded-full animate-spin",
          getSpinnerSizeClass(size),
          getSpinnerTypeClass(type)
        )}
      />

      {label ? (
        <p className={cn("mt-3 ob-typo-caption1 whitespace-pre-line", getLabelTypeClass(type))}>
          {label}
        </p>
      ) : (
        <span className="sr-only">로딩 중</span>
      )}
    </div>
  );
}

export default Loader;
