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

export const GYEONGGI_NORTH_CITIES: readonly string[] = [
  "고양시",
  "김포시",
  "동두천시",
  "양주시",
  "의정부시",
  "파주시",
  "포천시",
  "연천군",
  "가평군",
  "구리시",
  "남양주시",
];

export type GyeonggiSubRegionConfig = {
  label: string;
  boundaryKey: string;
  matchers: readonly string[];
  boundaryNames: readonly string[];
};

export const GYEONGGI_SUB_REGION_CONFIGS: readonly GyeonggiSubRegionConfig[] = [
  {
    label: "가평군",
    boundaryKey: "gyeonggi_gapyeong",
    matchers: ["가평군"],
    boundaryNames: ["경기도 가평군"],
  },
  {
    label: "고양시",
    boundaryKey: "gyeonggi_goyang",
    matchers: ["고양시"],
    boundaryNames: [
      "경기도 고양시 덕양구",
      "경기도 고양시 일산동구",
      "경기도 고양시 일산서구",
    ],
  },
  {
    label: "과천시",
    boundaryKey: "gyeonggi_gwacheon",
    matchers: ["과천시"],
    boundaryNames: ["경기도 과천시"],
  },
  {
    label: "광명시",
    boundaryKey: "gyeonggi_gwangmyeong",
    matchers: ["광명시"],
    boundaryNames: ["경기도 광명시"],
  },
  {
    label: "광주시",
    boundaryKey: "gyeonggi_gwangju",
    matchers: ["광주시"],
    boundaryNames: ["경기도 광주시"],
  },
  {
    label: "구리시",
    boundaryKey: "gyeonggi_guri",
    matchers: ["구리시"],
    boundaryNames: ["경기도 구리시"],
  },
  {
    label: "군포시",
    boundaryKey: "gyeonggi_gunpo",
    matchers: ["군포시"],
    boundaryNames: ["경기도 군포시"],
  },
  {
    label: "김포시",
    boundaryKey: "gyeonggi_gimpo",
    matchers: ["김포시"],
    boundaryNames: ["경기도 김포시"],
  },
  {
    label: "남양주시",
    boundaryKey: "gyeonggi_namyangju",
    matchers: ["남양주시"],
    boundaryNames: ["경기도 남양주시"],
  },
  {
    label: "동두천시",
    boundaryKey: "gyeonggi_dongducheon",
    matchers: ["동두천시"],
    boundaryNames: ["경기도 동두천시"],
  },
  {
    label: "부천시",
    boundaryKey: "gyeonggi_bucheon",
    matchers: ["부천시"],
    boundaryNames: [
      "경기도 부천시 소사구",
      "경기도 부천시 오정구",
      "경기도 부천시 원미구",
    ],
  },
  {
    label: "성남시",
    boundaryKey: "gyeonggi_seongnam",
    matchers: ["성남시"],
    boundaryNames: [
      "경기도 성남시 분당구",
      "경기도 성남시 수정구",
      "경기도 성남시 중원구",
    ],
  },
  {
    label: "수원시",
    boundaryKey: "gyeonggi_suwon",
    matchers: ["수원시"],
    boundaryNames: [
      "경기도 수원시 권선구",
      "경기도 수원시 영통구",
      "경기도 수원시 장안구",
      "경기도 수원시 팔달구",
    ],
  },
  {
    label: "시흥시",
    boundaryKey: "gyeonggi_siheung",
    matchers: ["시흥시"],
    boundaryNames: ["경기도 시흥시"],
  },
  {
    label: "안산시",
    boundaryKey: "gyeonggi_ansan",
    matchers: ["안산시"],
    boundaryNames: [
      "경기도 안산시 단원구",
      "경기도 안산시 상록구",
    ],
  },
  {
    label: "안성시",
    boundaryKey: "gyeonggi_anseong",
    matchers: ["안성시"],
    boundaryNames: ["경기도 안성시"],
  },
  {
    label: "안양시",
    boundaryKey: "gyeonggi_anyang",
    matchers: ["안양시"],
    boundaryNames: [
      "경기도 안양시 동안구",
      "경기도 안양시 만안구",
    ],
  },
  {
    label: "양주시",
    boundaryKey: "gyeonggi_yangju",
    matchers: ["양주시"],
    boundaryNames: ["경기도 양주시"],
  },
  {
    label: "양평군",
    boundaryKey: "gyeonggi_yangpyeong",
    matchers: ["양평군"],
    boundaryNames: ["경기도 양평군"],
  },
  {
    label: "여주시",
    boundaryKey: "gyeonggi_yeoju",
    matchers: ["여주시"],
    boundaryNames: ["경기도 여주시"],
  },
  {
    label: "연천군",
    boundaryKey: "gyeonggi_yeoncheon",
    matchers: ["연천군"],
    boundaryNames: ["경기도 연천군"],
  },
  {
    label: "오산시",
    boundaryKey: "gyeonggi_osan",
    matchers: ["오산시"],
    boundaryNames: ["경기도 오산시"],
  },
  {
    label: "용인시",
    boundaryKey: "gyeonggi_yongin",
    matchers: ["용인시"],
    boundaryNames: [
      "경기도 용인시 기흥구",
      "경기도 용인시 수지구",
      "경기도 용인시 처인구",
    ],
  },
  {
    label: "의왕시",
    boundaryKey: "gyeonggi_uiwang",
    matchers: ["의왕시"],
    boundaryNames: ["경기도 의왕시"],
  },
  {
    label: "의정부시",
    boundaryKey: "gyeonggi_uijeongbu",
    matchers: ["의정부시"],
    boundaryNames: ["경기도 의정부시"],
  },
  {
    label: "이천시",
    boundaryKey: "gyeonggi_icheon",
    matchers: ["이천시"],
    boundaryNames: ["경기도 이천시"],
  },
  {
    label: "파주시",
    boundaryKey: "gyeonggi_paju",
    matchers: ["파주시"],
    boundaryNames: ["경기도 파주시"],
  },
  {
    label: "평택시",
    boundaryKey: "gyeonggi_pyeongtaek",
    matchers: ["평택시"],
    boundaryNames: ["경기도 평택시"],
  },
  {
    label: "포천시",
    boundaryKey: "gyeonggi_pocheon",
    matchers: ["포천시"],
    boundaryNames: ["경기도 포천시"],
  },
  {
    label: "하남시",
    boundaryKey: "gyeonggi_hanam",
    matchers: ["하남시"],
    boundaryNames: ["경기도 하남시"],
  },
  {
    label: "화성시",
    boundaryKey: "gyeonggi_hwaseong",
    matchers: ["화성시"],
    boundaryNames: ["경기도 화성시"],
  },
] as const;

export const GYEONGGI_SUB_REGION_OPTIONS = [
  { label: "전체", value: "전체" },
  ...GYEONGGI_SUB_REGION_CONFIGS.map((item) => ({
    label: item.label,
    value: item.label,
  })),
] as const;

export function getGyeonggiSubRegionConfig(label: string) {
  return (
    GYEONGGI_SUB_REGION_CONFIGS.find((item) => item.label === label) ?? null
  );
}

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
