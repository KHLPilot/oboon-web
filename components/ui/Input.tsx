// components/ui/Input.tsx
import * as React from "react";

function cn(...classes: Array<string | undefined | false | null>) {
  return classes.filter(Boolean).join(" ");
}

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
        "w-full rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-(--oboon-primary)",
        className
      )}
    />
  );
});

Input.displayName = "Input";

export default Input;
