// features/offerings/domain/offering.constants.ts
import type {
  OfferingStatusLabel,
  OfferingStatusValue,
  OfferingRegionTab,
} from "./offering.types";
import { OFFERING_STATUS_VALUES, OFFERING_REGION_TABS } from "./offering.types";

export const OFFERING_STATUS_LABEL: Record<
  OfferingStatusValue,
  OfferingStatusLabel
> = {
  READY: "분양 예정",
  OPEN: "분양 중",
  CLOSED: "분양 종료",
};

export function isOfferingStatusValue(v: string): v is OfferingStatusValue {
  return (OFFERING_STATUS_VALUES as readonly string[]).includes(v);
}

export function normalizeOfferingStatusValue(
  status: string | null | undefined
): OfferingStatusValue | null {
  if (!status) return null;
  const s = status.trim().toUpperCase();
  if (s === "ONGOING") return "OPEN";
  return isOfferingStatusValue(s) ? s : null;
}

export function statusLabelOf(
  v: OfferingStatusValue | null | undefined
): OfferingStatusLabel {
  if (!v) return "확인 중";
  return OFFERING_STATUS_LABEL[v];
}

export function normalizeRegionTab(
  region1Depth: string | null | undefined
): OfferingRegionTab {
  const t = (region1Depth ?? "").trim();
  if (!t) return "전체";
  if (t.startsWith("서울")) return "서울";
  if (t.startsWith("경기")) return "경기";
  if (t.startsWith("인천")) return "인천";
  if (t.startsWith("부산")) return "부산";
  if (t.startsWith("대구")) return "대구";
  if (t.startsWith("광주")) return "광주";
  if (t.startsWith("대전")) return "대전";
  if (t.startsWith("울산")) return "울산";
  if (t.startsWith("세종")) return "세종";
  if (t.startsWith("강원")) return "강원";
  if (t.startsWith("충북") || t.startsWith("충청북")) return "충북";
  if (t.startsWith("충남") || t.startsWith("충청남")) return "충남";
  if (t.startsWith("전북") || t.startsWith("전라북")) return "전북";
  if (t.startsWith("전남") || t.startsWith("전라남")) return "전남";
  if (t.startsWith("경북") || t.startsWith("경상북")) return "경북";
  if (t.startsWith("경남") || t.startsWith("경상남")) return "경남";
  if (t.startsWith("제주")) return "제주";

  return "전체";
}

export function normalizeRegionBadgeLabel(
  region1Depth: string | null | undefined
): string | null {
  const t = (region1Depth ?? "").trim();
  if (!t) return null;

  if (t.startsWith("서울")) return "서울";
  if (t.startsWith("부산")) return "부산";
  if (t.startsWith("대구")) return "대구";
  if (t.startsWith("인천")) return "인천";
  if (t.startsWith("광주")) return "광주";
  if (t.startsWith("대전")) return "대전";
  if (t.startsWith("울산")) return "울산";
  if (t.startsWith("세종")) return "세종";
  if (t.startsWith("경기")) return "경기";
  if (t.startsWith("강원")) return "강원";
  if (t.startsWith("충북")) return "충북";
  if (t.startsWith("충남")) return "충남";
  if (t.startsWith("전북")) return "전북";
  if (t.startsWith("전남")) return "전남";
  if (t.startsWith("경북")) return "경북";
  if (t.startsWith("경남")) return "경남";
  if (t.startsWith("제주")) return "제주";
  if (t.startsWith("충청북")) return "충북";
  if (t.startsWith("충청남")) return "충남";
  if (t.startsWith("전라북")) return "전북";
  if (t.startsWith("전라남")) return "전남";
  if (t.startsWith("경상북")) return "경북";
  if (t.startsWith("경상남")) return "경남";

  return t;
}

export { OFFERING_REGION_TABS, OFFERING_STATUS_VALUES };
