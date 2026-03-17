import type { ReactNode } from "react";

import Button from "@/components/ui/Button";
import type { ButtonVariant } from "@/components/ui/Button";

interface EmptyStateAction {
  label: string;
  onClick: () => void;
  variant?: ButtonVariant;
}

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  actions?: EmptyStateAction[];
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  actions,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={[
        "flex flex-col items-center justify-center py-16 px-6 text-center",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {icon ? (
        <div className="mb-5 flex h-14 w-14 items-center justify-center text-(--oboon-text-muted)">
          {icon}
        </div>
      ) : null}

      <p className="ob-typo-h3 text-(--oboon-text-title)">{title}</p>

      {description ? (
        <p className="mt-2 ob-typo-body text-(--oboon-text-muted) max-w-xs">
          {description}
        </p>
      ) : null}

      {actions && actions.length > 0 ? (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {actions.map((action) => (
            <Button
              key={action.label}
              variant={action.variant ?? "secondary"}
              size="sm"
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
