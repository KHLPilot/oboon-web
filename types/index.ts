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
  region: OfferingRegionTab;
  regionLabel?: string;
  status: OfferingStatusLabel;
  statusValue?: OfferingStatusValue | null;

  // 가격 (억 단위 숫자, 필터/집계용)
  priceMin억: number | null;
  priceMax억: number | null;

  imageUrl?: string | null;
  deadlineLabel?: string | null;
}

/* =========================
 * Routes (URL은 항상 복수)
 * ========================= */

export const ROUTES = {
  home: "/",
  briefing: "/briefing",

  offerings: {
    list: "/offerings",
    detail: (id: string | number) => `/offerings/${id}`,
  },
} as const;
