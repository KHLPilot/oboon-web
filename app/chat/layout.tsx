// app/chat/layout.tsx
// 채팅 페이지는 Header/Footer 없이 전체 화면 사용
import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
