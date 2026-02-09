import type { Metadata } from "next";
import type { ReactNode } from "react";
import PageContainer from "@/components/shared/PageContainer";
import { SupportShell } from "@/features/support/components/SupportShell";

export const metadata: Metadata = {
  title: "고객센터 | OBOON",
  description: "OBOON 고객센터 - 자주 묻는 질문과 1:1 문의",
};

export default function SupportLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <main className="flex-1 bg-(--oboon-bg-page)">
      <PageContainer className="pb-16">
        <SupportShell>{children}</SupportShell>
      </PageContainer>
    </main>
  );
}
