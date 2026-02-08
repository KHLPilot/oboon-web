import { SupportShell } from "@/features/support/components/SupportShell";

export const metadata = {
  title: "고객센터 | OBOON",
  description: "OBOON 고객센터 - 자주 묻는 질문과 1:1 문의",
};

export default function SupportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SupportShell>{children}</SupportShell>;
}
