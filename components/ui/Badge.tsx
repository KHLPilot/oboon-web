// components/ui/Badge.tsx
import React from "react";

// Props 타입 정의 (이 부분이 없어서 'any' 오류가 났던 것입니다)
interface BadgeProps {
  children: React.ReactNode; // 태그 안에 들어갈 내용 (텍스트 등)
  variant?: string; // 색상 스타일 (선택 사항)
  className?: string; // 추가 스타일 클래스 (선택 사항)
}

export const Badge = ({
  children,
  variant = "default",
  className = "",
}: BadgeProps) => {
  // variant에 따른 스타일링 로직
  let variantStyles = "bg-slate-100 text-slate-800"; // 기본값

  if (variant === "청약예정") variantStyles = "bg-blue-500 text-white";
  else if (variant === "선착순") variantStyles = "bg-emerald-500 text-white";
  else if (variant === "잔여세대") variantStyles = "bg-orange-400 text-white";

  return (
    <span
      className={`px-2 py-1 rounded text-xs font-bold ${variantStyles} ${className}`}
    >
      {children}
    </span>
  );
};
