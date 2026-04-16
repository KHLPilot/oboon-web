// features/offerings/domain/offering.types.ts

import type { RecommendationUnitType } from "@/features/recommendations/lib/recommendationUnitTypes";

export const OFFERING_STATUS_VALUES = ["READY", "OPEN", "CLOSED"] as const;
export type OfferingStatusValue = (typeof OFFERING_STATUS_VALUES)[number];

export type OfferingStatusLabel = "분양 예정" | "분양 중" | "분양 종료" | "확인 중";

export const OFFERING_REGION_TABS = [
  "전체",
  "서울",
  "경기",
  "인천",
  "부산",
  "대구",
  "광주",
  "대전",
  "울산",
  "세종",
  "강원",
  "충북",
  "충남",
  "전북",
  "전남",
  "경북",
  "경남",
  "제주",
] as const;

export type OfferingRegionTab = (typeof OFFERING_REGION_TABS)[number];

// ─── Compare ──────────────────────────────────────────────────────────────────

export type FinalGrade5 = "GREEN" | "LIME" | "YELLOW" | "ORANGE" | "RED";

export interface OfferingCompareConditionCategoryResult {
  grade: FinalGrade5;
  reasonMessage: string;
}

export interface OfferingCompareConditionCategories {
  cash: OfferingCompareConditionCategoryResult;
  income: OfferingCompareConditionCategoryResult;
  ltvDsr: OfferingCompareConditionCategoryResult;
  ownership: OfferingCompareConditionCategoryResult;
  purpose: OfferingCompareConditionCategoryResult;
  timing: OfferingCompareConditionCategoryResult;
}

export interface OfferingCompareItem {
  id: string;
  name: string;
  location: string;
  imageUrl: string | null;
  priceRange: string;
  pricePerPyeong: string;
  totalUnits: number;
  unitTypes: string;
  floors: string;
  parking: string;
  status: "OPEN" | "READY" | "CLOSED";
  announcementDate: string | null;
  applicationStart: string | null;
  applicationEnd: string | null;
  winnerAnnounce: string | null;
  contractStart: string | null;
  contractEnd: string | null;
  moveInDate: string | null;
  moveInText: string | null;
  nearestStation: string;
  siteLat: number | null;
  siteLng: number | null;
  commuteEstimate: { transitMin: number; carMin: number } | null;
  schoolGrade: "우수" | "보통" | "미흡";
  famousZone: { name: string; shortLabel: string; tier: number } | null;
  academyCount: number | null;
  conditionResult: FinalGrade5 | null;
  conditionCategories: OfferingCompareConditionCategories | null;
  unitTypeResults: RecommendationUnitType[] | null;
}

export const COMPARE_SLOTS = ["a", "b", "c"] as const;
export type CompareSlot = (typeof COMPARE_SLOTS)[number];
