import { headers } from "next/headers";
import Script from "next/script";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://oboon.co.kr";

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

export default async function CspScripts() {
  const isProduction = process.env.NODE_ENV === "production";
  const isReactGrabEnabled = process.env.NODE_ENV === "development";
  const clarityProjectId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID;
  const gaTrackingId =
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "G-XF92GCM2KV";

  const nonce = isProduction
    ? ((await headers()).get("x-nonce") ?? undefined)
    : undefined;

  return (
    <>
      {isReactGrabEnabled && (
        <Script
          src="https://unpkg.com/react-grab/dist/index.global.js"
          crossOrigin="anonymous"
          strategy="beforeInteractive"
          nonce={nonce}
        />
      )}
      {isReactGrabEnabled && (
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
    </>
  );
}
