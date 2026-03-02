import type { ReactNode, TdHTMLAttributes, ThHTMLAttributes } from "react";

export function AdminTableShell({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="overflow-x-auto scrollbar-none">
      <table
        className={["w-full min-w-[720px] ob-typo-body border-collapse", className].join(" ")}
      >
        {children}
      </table>
    </div>
  );
}

export function AdminTh({
  children,
  className = "",
  ...rest
}: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      {...rest}
      className={[
        "py-3 px-3 text-left font-semibold",
        "text-(--oboon-text-title)",
        "border-b border-(--oboon-border-default)",
        className,
      ].join(" ")}
    >
      {children}
    </th>
  );
}

export function AdminTd({
  children,
  className = "",
  ...rest
}: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      {...rest}
      className={[
        "py-3 px-3 align-middle",
        "text-(--oboon-text-body)",
        "border-b border-(--oboon-border-default)",
        className,
      ].join(" ")}
    >
      {children}
    </td>
  );
}

