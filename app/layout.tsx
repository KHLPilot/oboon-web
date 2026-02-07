// app/layout.tsx
import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import localFont from "next/font/local";
import ProfileChecker from "app/components/ProfileChecker";
import Header from "@/components/shared/Header";
import Footer from "@/components/shared/Footer";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "OBOON 분양 플랫폼",
  description: "Offerings · Briefing · Overview · Options · Navigation",
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
  variable: "--font-suit",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className={suit.variable}>
      <head>
        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-XF92GCM2KV"
          strategy="afterInteractive"
        />
        <Script id="gtag-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-XF92GCM2KV');
          `}
        </Script>
        {/* Microsoft Clarity */}
        <Script id="clarity-init" strategy="afterInteractive">
          {`
            (function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "v9mb2celvl");
          `}
        </Script>
      </head>
      <body className="min-h-dvh flex flex-col">
        <Script
          src="//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"
          strategy="afterInteractive"
        />
        <Providers>
          <ProfileChecker />
          <Header />
          <main
            className="flex-1 relative"
            style={{ paddingTop: "var(--oboon-header-offset)" }}
          >
            {children}
          </main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
