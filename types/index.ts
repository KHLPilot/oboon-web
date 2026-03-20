// /types/index.ts

import type {
  OfferingRegionTab,
  OfferingStatusLabel,
  OfferingStatusValue,
} from "@/features/offerings/domain/offering.types";

/* =========================
 * Domain: Offering (단수)
 * ========================= */

export interface Offering {
  id: string;

  title: string;
  addressShort: string;
  addressFull?: string;
  region: OfferingRegionTab;
  regionLabel?: string;
  propertyType?: string | null;
  status: OfferingStatusLabel;
  statusValue?: OfferingStatusValue | null;
  hasAppraiserComment?: boolean;

  // 가격 (억 단위 숫자, 필터/집계용)
  priceMin억: number | null;
  priceMax억: number | null;
  isPricePrivate?: boolean;

  imageUrl?: string | null;
  deadlineLabel?: string | null;
  lat?: number | null;
  lng?: number | null;
}

/* =========================
 * Routes (URL은 항상 복수)
 * ========================= */

export const ROUTES = {
  home: "/",
  briefing: "/briefing",
  recommendations: "/recommendations",

  offerings: {
    list: "/offerings",
    detail: (id: string | number) => `/offerings/${id}`,
  },
} as const;
