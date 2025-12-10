// app/layout.tsx

import "./globals.css";
import type { Metadata } from "next";
import Header from "@/components/shared/Header";
import Footer from "@/components/shared/Footer";

export const metadata: Metadata = {
  title: "OBOON – 오늘의 분양",
  description: "분양 정보를 가장 쉽게 정리해주는 서비스",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="bg-(--oboon-bg-page) text-(--oboon-text-body)">
        <Header />
        <main className="min-h-screen pt-16">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
