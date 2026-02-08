"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SUPPORT_TABS } from "../domain/support";

type SupportShellProps = {
  children: React.ReactNode;
};

export function SupportShell({ children }: SupportShellProps) {
  const pathname = usePathname();

  const getHref = (key: string) => {
    if (key === "faq") return "/support";
    return `/support/${key}`;
  };

  const isActive = (key: string) => {
    if (key === "faq") {
      return pathname === "/support" || pathname === "/support/faq";
    }
    return pathname?.startsWith(`/support/${key}`);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-(--oboon-text-title)">
        고객센터
      </h1>

      {/* 탭 네비게이션 */}
      <div className="mb-6 flex gap-4 border-b border-(--oboon-border-default)">
        {SUPPORT_TABS.map((tab) => {
          const active = isActive(tab.key);
          return (
            <Link
              key={tab.key}
              href={getHref(tab.key)}
              className={`pb-3 text-sm font-medium transition-colors ${
                active
                  ? "border-b-2 border-(--oboon-primary) text-(--oboon-primary)"
                  : "text-(--oboon-text-muted) hover:text-(--oboon-text-title)"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* 콘텐츠 영역 */}
      <div>{children}</div>
    </div>
  );
}

export default SupportShell;
