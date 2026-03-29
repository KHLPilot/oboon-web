// app/layout.tsx
import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import Script from "next/script";
import "./globals.css";
import localFont from "next/font/local";
import ProfileChecker from "app/components/ProfileChecker";
import Header from "@/components/shared/Header";
import Footer from "@/components/shared/Footer";
import Providers from "./providers";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://oboon.co.kr";
const defaultOgImage = `${siteUrl}/logo.svg`;
const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      name: "OBOON",
      url: siteUrl,
      logo: `${siteUrl}/logo.svg`,
    },
    {
      "@type": "WebSite",
      name: "OBOON",
      url: siteUrl,
      inLanguage: "ko-KR",
      potentialAction: {
        "@type": "SearchAction",
        target: `${siteUrl}/offerings?search={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "OBOON 분양 플랫폼",
    template: "%s | OBOON",
  },
  description: "분양 정보 탐색부터 상담 연결까지 한 번에 진행하는 OBOON 분양 플랫폼.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "OBOON 분양 플랫폼",
    description: "분양 정보 탐색부터 상담 연결까지 한 번에 진행하는 OBOON 분양 플랫폼.",
    url: "/",
    siteName: "OBOON",
    locale: "ko_KR",
    type: "website",
    images: [defaultOgImage],
  },
  twitter: {
    card: "summary_large_image",
    title: "OBOON 분양 플랫폼",
    description: "분양 정보 탐색부터 상담 연결까지 한 번에 진행하는 OBOON 분양 플랫폼.",
    images: [defaultOgImage],
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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const isProduction = process.env.NODE_ENV === "production";
  const clarityProjectId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID;
  const gaTrackingId =
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "G-XF92GCM2KV";

  return (
    <html lang="ko" className={suit.variable} suppressHydrationWarning>
      <head>
        {process.env.NODE_ENV === "development" && (
          <Script
            src="https://unpkg.com/react-grab/dist/index.global.js"
            crossOrigin="anonymous"
            strategy="beforeInteractive"
            nonce={nonce}
          />
        )}
        {process.env.NODE_ENV === "development" && (
          <Script
            src="https://unpkg.com/@react-grab/mcp/dist/client.global.js"
            strategy="lazyOnload"
            nonce={nonce}
          />
        )}
        <Script id="theme-init" strategy="beforeInteractive" nonce={nonce}>
          {`
            (function () {
              try {
                var saved = window.localStorage.getItem("oboon-theme");
                var theme = saved === "light" || saved === "dark"
                  ? saved
                  : (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
                document.documentElement.dataset.theme = theme;
              } catch (e) {
                document.documentElement.dataset.theme = "dark";
              }
            })();
          `}
        </Script>
        {/* Google Analytics (production only) */}
        {isProduction ? (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${gaTrackingId}`}
              strategy="lazyOnload"
              nonce={nonce}
            />
            <Script id="gtag-init" strategy="lazyOnload" nonce={nonce}>
              {`
                try {
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${gaTrackingId}');
                } catch (e) {}
              `}
            </Script>
          </>
        ) : null}
        {/* Microsoft Clarity (production only) */}
        {isProduction && clarityProjectId ? (
          <Script id="clarity-init" strategy="afterInteractive" nonce={nonce}>
            {`
              try {
                (function(c,l,a,r,i,t,y){
                  c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                  t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                  y=l.getElementsByTagName(r)[0];
                  if (y && y.parentNode) y.parentNode.insertBefore(t,y);
                })(window, document, "clarity", "script", "${clarityProjectId}");
              } catch (e) {}
            `}
          </Script>
        ) : null}
        <script
          type="application/ld+json"
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
          }}
        />
      </head>
      <body className="min-h-dvh flex flex-col">
        <Providers>
          <ProfileChecker />
          <Header />
          <main
            className="flex-1 relative w-full min-w-0"
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
