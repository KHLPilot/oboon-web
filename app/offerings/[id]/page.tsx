// app/offerings/[id]/page.tsx
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { cache } from "react";
import OfferingDetailPage from "@/features/offerings/components/detail/OfferingDetailPage";
import { fetchOfferingDetail } from "@/features/offerings/services/offeringDetail.service";
import { formatPriceRange } from "@/shared/price";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://oboon.co.kr";
const defaultOgImage = `${siteUrl}/logo.svg`;

type UnitType = {
  price_min: number | null;
  price_max: number | null;
  is_price_public?: boolean | null;
  is_public?: boolean | null;
  floor_plan_url?: string | null;
};

type LocationRow = {
  road_address: string | null;
  jibun_address: string | null;
};

function asArray<T>(value: T | T[] | null | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function getPrimaryAddress(property: {
  property_locations: LocationRow[] | LocationRow | null;
}) {
  const location = asArray(property.property_locations)[0];
  return location?.road_address || location?.jibun_address || null;
}

function getPriceRangeText(property: {
  property_unit_types: UnitType[] | UnitType | null;
}) {
  return getPriceRange(property).text;
}

function getPriceRange(property: {
  property_unit_types: UnitType[] | UnitType | null;
}) {
  const unitTypes = asArray(property.property_unit_types);
  let min: number | null = null;
  let max: number | null = null;
  let publicPriceCount = 0;

  for (const unit of unitTypes) {
    if (unit?.is_public === false || unit?.is_price_public === false) continue;

    const priceMin = unit?.price_min;
    const priceMax = unit?.price_max;
    const hasNumericPrice =
      (typeof priceMin === "number" && Number.isFinite(priceMin)) ||
      (typeof priceMax === "number" && Number.isFinite(priceMax));
    if (hasNumericPrice) publicPriceCount += 1;

    if (typeof priceMin === "number" && Number.isFinite(priceMin)) {
      min = min == null ? priceMin : Math.min(min, priceMin);
    }
    if (typeof priceMax === "number" && Number.isFinite(priceMax)) {
      max = max == null ? priceMax : Math.max(max, priceMax);
    }
  }

  return {
    min,
    max,
    text: formatPriceRange(min, max),
    publicPriceCount,
  };
}

function pickImage(property: {
  image_url: string | null;
  property_unit_types:
    | Array<{ floor_plan_url?: string | null }>
    | { floor_plan_url?: string | null }
    | null;
}) {
  if (property.image_url) return property.image_url;
  const unitFloorPlan = asArray(property.property_unit_types).find(
    (unit) =>
      typeof unit?.floor_plan_url === "string" &&
      unit.floor_plan_url.trim().length > 0,
  )?.floor_plan_url;
  return unitFloorPlan || null;
}

const getOfferingDetailCached = cache(async (id: number) => fetchOfferingDetail(id));

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isFinite(id)) {
    return {
      robots: { index: false, follow: false },
    };
  }

  const property = await getOfferingDetailCached(id);
  if (!property) {
    return {
      robots: { index: false, follow: false },
    };
  }

  const address = getPrimaryAddress(property);
  const priceRange = getPriceRangeText(property);
  const description = address
    ? `${property.name} 분양 정보. 위치: ${address}. 분양가: ${priceRange}.`
    : `${property.name} 분양 정보. 분양가: ${priceRange}.`;
  const canonicalPath = `/offerings/${property.id}`;
  const imageUrl = pickImage(property);
  const ogImage = imageUrl || defaultOgImage;

  return {
    title: `${property.name} 분양 정보`,
    description,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title: `${property.name} 분양 정보`,
      description,
      url: canonicalPath,
      type: "article",
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image",
      title: `${property.name} 분양 정보`,
      description,
      images: [ogImage],
    },
  };
}

export default async function OfferingDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const nonce =
    process.env.NODE_ENV === "production"
      ? ((await headers()).get("x-nonce") ?? undefined)
      : undefined;
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isFinite(id)) notFound();
  const property = await getOfferingDetailCached(id);
  if (!property) notFound();

  const address = getPrimaryAddress(property);
  const imageUrl = pickImage(property);
  const priceRange = getPriceRange(property);
  const hasNumericPrice = priceRange.min != null || priceRange.max != null;
  const offers = hasNumericPrice
    ? {
        "@type": "AggregateOffer",
        url: `${siteUrl}/offerings/${property.id}`,
        availability: "https://schema.org/InStock",
        priceCurrency: "KRW",
        lowPrice: priceRange.min ?? undefined,
        highPrice: priceRange.max ?? undefined,
        offerCount: priceRange.publicPriceCount > 0 ? priceRange.publicPriceCount : undefined,
      }
    : {
        "@type": "Offer",
        url: `${siteUrl}/offerings/${property.id}`,
        availability: "https://schema.org/InStock",
        priceCurrency: "KRW",
        priceSpecification: {
          "@type": "PriceSpecification",
          priceCurrency: "KRW",
          description: priceRange.text,
        },
      };

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: property.name,
    category: "RealEstate",
    image: imageUrl ? [imageUrl] : undefined,
    description: property.description || `${property.name} 분양 정보`,
    brand: {
      "@type": "Brand",
      name: "OBOON",
    },
    offers,
    areaServed: "KR",
    address: address
      ? {
          "@type": "PostalAddress",
          streetAddress: address,
          addressCountry: "KR",
        }
      : undefined,
  };

  return (
    <>
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />
      <OfferingDetailPage id={id} />
    </>
  );
}
