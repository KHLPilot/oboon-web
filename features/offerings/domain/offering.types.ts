// features/offerings/domain/offering.types.ts

export const OFFERING_STATUS_VALUES = ["READY", "OPEN", "CLOSED"] as const;
export type OfferingStatusValue = (typeof OFFERING_STATUS_VALUES)[number];

export type OfferingStatusLabel = "분양 예정" | "분양 중" | "분양 종료" | "확인 중";

export const OFFERING_REGION_TABS = [
  "전체",
  "서울",
  "경기",
  "인천",
  "충청",
  "강원",
  "경상",
  "전라",
  "제주",
] as const;

export type OfferingRegionTab = (typeof OFFERING_REGION_TABS)[number];
