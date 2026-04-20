"use client";

import * as React from "react";

import FieldErrorBubble from "@/components/ui/FieldErrorBubble";
import Input from "@/components/ui/Input";
import Label from "@/components/ui/Label";

type FormInputProps = React.ComponentPropsWithoutRef<typeof Input> & {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
};

function mergeIds(...ids: Array<string | undefined>) {
  return ids.filter(Boolean).join(" ") || undefined;
}

const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(
  function FormInput(
    {
      label,
      error,
      hint,
      required = false,
      id,
      className,
      "aria-describedby": ariaDescribedBy,
      "aria-invalid": ariaInvalid,
      ...inputProps
    },
    ref,
  ) {
    const generatedId = React.useId();
    const resolvedId = id ?? generatedId;
    const bubbleId = `${generatedId}-error`;
    const hintId = `${generatedId}-hint`;
    const [containerEl, setContainerEl] =
      React.useState<HTMLDivElement | null>(null);
    const [inputEl, setInputEl] = React.useState<HTMLInputElement | null>(null);

    const handleContainerRef = React.useCallback((node: HTMLDivElement | null) => {
      setContainerEl((prev) => (prev === node ? prev : node));
    }, []);

    const handleInputRef = React.useCallback(
      (node: HTMLInputElement | null) => {
        setInputEl((prev) => (prev === node ? prev : node));

        if (typeof ref === "function") {
          ref(node);
          return;
        }

        if (ref) {
          (ref as React.MutableRefObject<HTMLInputElement | null>).current = node;
        }
      },
      [ref],
    );

    const describedBy = mergeIds(
      ariaDescribedBy,
      error ? bubbleId : undefined,
      !error && hint ? hintId : undefined,
    );

    return (
      <div className="flex flex-col gap-1.5">
        {label ? (
          <Label htmlFor={resolvedId} className="mb-0">
            {label}
            {required ? <span aria-hidden="true"> *</span> : null}
          </Label>
        ) : null}

        <div ref={handleContainerRef} className="relative">
          <Input
            ref={handleInputRef}
            id={resolvedId}
            required={required}
            aria-invalid={error ? true : ariaInvalid}
            aria-describedby={describedBy}
            className={className}
            {...inputProps}
          />

          {error ? (
            <FieldErrorBubble
              open={Boolean(error)}
              containerEl={containerEl}
              anchorEl={inputEl}
              id={bubbleId}
              message={error}
            />
          ) : null}
        </div>

        {!error && hint ? (
          <p id={hintId} className="text-xs text-(--oboon-text-muted)">
            {hint}
          </p>
        ) : null}
      </div>
    );
  },
);

FormInput.displayName = "FormInput";

export default FormInput;
