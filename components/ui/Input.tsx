// components/ui/Input.tsx
import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { oboonFieldBaseClass } from "@/lib/ui/formFieldStyles";

const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function Input(props, ref) {
  const { className, onKeyDown, ...rest } = props;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // 이벤트 버블링 방지 (모달 등 상위 컴포넌트의 키보드 핸들러 간섭 방지)
    e.stopPropagation();
    onKeyDown?.(e);
  };

  return (
    <input
      ref={ref}
      onKeyDown={handleKeyDown}
      {...rest}
      className={cn(
        oboonFieldBaseClass,
        className
      )}
    />
  );
});

Input.displayName = "Input";

export default Input;
