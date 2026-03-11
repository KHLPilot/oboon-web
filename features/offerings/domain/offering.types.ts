// features/offerings/domain/offering.types.ts

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
