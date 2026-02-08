import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { oboonTextareaBaseClass } from "@/lib/ui/formFieldStyles";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea(props, ref) {
  const { className, ...rest } = props;

  return (
    <textarea
      ref={ref}
      {...rest}
      className={cn(oboonTextareaBaseClass, className)}
    />
  );
});

Textarea.displayName = "Textarea";

export default Textarea;
