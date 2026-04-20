import type { ReactNode } from "react";

import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";

export type ResultProps = {
  figure?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  button?: ReactNode;
  className?: string;
};

export type ResultButtonProps = {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  onClick?: () => void;
  className?: string;
};

function ResultButton({
  children,
  variant = "primary",
  onClick,
  className,
}: ResultButtonProps) {
  return (
    <Button
      type="button"
      variant={variant}
      size="lg"
      className={cn("w-full h-11", className)}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

function ResultRoot({
  figure,
  title,
  description,
  button,
  className,
}: ResultProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center text-center px-6 py-12",
        className
      )}
    >
      {figure ? <div className="mb-6">{figure}</div> : null}

      <h5 className="ob-typo-title2 text-(--oboon-text-default)">{title}</h5>

      {description ? (
        <div className="mt-3 ob-typo-body2 text-(--oboon-text-muted) max-w-xs">
          {description}
        </div>
      ) : null}

      {button ? (
        <div className="mt-8 w-full flex flex-col gap-3">{button}</div>
      ) : null}
    </div>
  );
}

type ResultCompound = typeof ResultRoot & {
  Button: typeof ResultButton;
};

const Result = ResultRoot as ResultCompound;
Result.Button = ResultButton;

export default Result;
