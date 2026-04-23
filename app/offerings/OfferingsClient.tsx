// app/offerings/OfferingsClient.tsx
"use client";
import type { Offering } from "@/types/index";
import OfferingsClientBody from "@/features/offerings/components/OfferingsClientBody";

type OfferingsClientProps = {
  initialOfferings?: Offering[];
};

export default function OfferingsClient({
  initialOfferings,
}: OfferingsClientProps) {
  return <OfferingsClientBody initialOfferings={initialOfferings} />;
}
