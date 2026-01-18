import { Suspense } from "react";
import OfferingsClient from "./OfferingsClient";

export default function OfferingsPage() {
  return (
    <Suspense fallback={null}>
      <OfferingsClient />
    </Suspense>
  );
}
