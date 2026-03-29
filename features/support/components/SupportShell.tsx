"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import Card from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
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
  const isQnATab = pathname?.startsWith("/support/qna");

  return (
    <section className="w-full">
      <div className="mb-5">
        <h1 className="ob-typo-h1 text-(--oboon-text-title)">고객센터</h1>
        <p className="mt-1 ob-typo-body-sm text-(--oboon-text-muted)">
          자주 묻는 질문과 1:1 문의를 확인할 수 있습니다.
        </p>
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between gap-4 border-b border-(--oboon-border-default) p-4">
          <div className="flex gap-4">
            {SUPPORT_TABS.map((tab) => {
              const active = isActive(tab.key);
              return (
                <Link
                  key={tab.key}
                  href={getHref(tab.key)}
                  className={`ob-typo-body-sm border-b-2 p-1 transition-colors ${
                    active
                      ? "border-(--oboon-primary) text-(--oboon-primary)"
                      : "border-transparent text-(--oboon-text-muted) hover:text-(--oboon-text-title)"
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>
          {isQnATab ? (
            <Button
              asChild
              size="sm"
              shape="pill"
              variant="primary"
            >
              <Link href="/support/qna?write=1">
                <Plus className="h-4 w-4" />
                문의하기
              </Link>
            </Button>
          ) : null}
        </div>

        <div className="p-4">{children}</div>
      </Card>
    </section>
  );
}

export default SupportShell;
