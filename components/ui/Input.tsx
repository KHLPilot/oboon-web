// components/ui/Input.tsx
import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { oboonFieldBaseClass } from "@/lib/ui/formFieldStyles";

const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function Input(props, ref) {
  const { className, ...rest } = props;

  return (
    <input
      ref={ref}
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
