// app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import "./globals.css";
import localFont from "next/font/local";
import ProfileChecker from "app/components/ProfileChecker";
import Header from "@/components/shared/Header";
import Footer from "@/components/shared/Footer";
import ScrollToTopOnRouteChange from "@/components/shared/ScrollToTopOnRouteChange";
import Providers from "./providers";
import CspScripts from "./_csp-scripts";
import { seoDefaultOgImage } from "@/shared/seo";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://oboon.co.kr";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "OBOON 분양 플랫폼",
    template: "%s | OBOON",
  },
  description: "분양 정보 탐색부터 상담 연결까지 한 번에 진행하는 OBOON 분양 플랫폼.",
  openGraph: {
    title: "OBOON 분양 플랫폼",
    description: "분양 정보 탐색부터 상담 연결까지 한 번에 진행하는 OBOON 분양 플랫폼.",
    siteName: "OBOON",
    locale: "ko_KR",
    type: "website",
    images: [seoDefaultOgImage],
  },
  twitter: {
    card: "summary_large_image",
    title: "OBOON 분양 플랫폼",
    description: "분양 정보 탐색부터 상담 연결까지 한 번에 진행하는 OBOON 분양 플랫폼.",
    images: [seoDefaultOgImage],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

const suit = localFont({
  src: [
    {
      path: "../public/fonts/suit/SUIT-Thin.woff2",
      weight: "100",
      style: "normal",
    },
    {
      path: "../public/fonts/suit/SUIT-ExtraLight.woff2",
      weight: "200",
      style: "normal",
    },
    {
      path: "../public/fonts/suit/SUIT-Light.woff2",
      weight: "300",
      style: "normal",
    },
    {
      path: "../public/fonts/suit/SUIT-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/suit/SUIT-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../public/fonts/suit/SUIT-SemiBold.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../public/fonts/suit/SUIT-Bold.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "../public/fonts/suit/SUIT-ExtraBold.woff2",
      weight: "800",
      style: "normal",
    },
    {
      path: "../public/fonts/suit/SUIT-Heavy.woff2",
      weight: "900",
      style: "normal",
    },
  ],
  display: "swap",
  preload: false,
  variable: "--font-suit",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className={suit.variable} suppressHydrationWarning>
      <head suppressHydrationWarning>
        <CspScripts />
      </head>
      <body className="min-h-dvh flex flex-col">
        <Providers>
          <Suspense fallback={null}>
            <ScrollToTopOnRouteChange />
          </Suspense>
          <ProfileChecker />
          <Header />
          <div
            className="flex-1 relative w-full min-w-0"
            style={{ paddingTop: "var(--oboon-header-offset)" }}
          >
            {children}
          </div>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
