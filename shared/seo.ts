const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://oboon.co.kr";

export const seoSiteUrl = siteUrl;
export const seoDefaultOgImagePath = "/opengraph-image";
export const seoDefaultOgImage = `${siteUrl}${seoDefaultOgImagePath}`;

const ABSOLUTE_URL_PATTERN = /^https?:\/\//i;

export function toAbsoluteUrl(value: string | null | undefined) {
  if (!value) return undefined;
  if (ABSOLUTE_URL_PATTERN.test(value)) return value;
  return new URL(value, siteUrl).toString();
}

export function buildBreadcrumbJsonLd(
  items: Array<{
    name: string;
    path: string;
  }>,
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: toAbsoluteUrl(item.path),
    })),
  };
}

export function buildArticleJsonLd(args: {
  headline: string;
  description: string;
  path: string;
  image?: string | null;
  datePublished: string;
  dateModified?: string | null;
  authorName: string;
}) {
  const {
    headline,
    description,
    path,
    image,
    datePublished,
    dateModified,
    authorName,
  } = args;

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline,
    description,
    mainEntityOfPage: toAbsoluteUrl(path),
    image: image ? [toAbsoluteUrl(image)] : undefined,
    datePublished,
    dateModified: dateModified ?? datePublished,
    author: {
      "@type": "Person",
      name: authorName,
    },
    publisher: {
      "@type": "Organization",
      name: "OBOON",
      logo: {
        "@type": "ImageObject",
        url: toAbsoluteUrl("/logo.svg"),
      },
    },
  };
}
