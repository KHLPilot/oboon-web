export type BriefingType = "region" | "market" | "schedule";

export type BriefingPost = {
  id: string;
  type: BriefingType;
  title: string;
  createdAt: string; // yyyy-mm-dd or ISO
  coverImageUrl?: string;
  seriesId?: string;
};

export type BriefingSeries = {
  id: string;
  title: string;
  description: string;
  coverImageUrl?: string;
};

export function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}.${m}.${day}`;
}

export function typeLabel(t: BriefingType) {
  switch (t) {
    case "region":
      return "지역";
    case "market":
      return "시장";
    case "schedule":
      return "일정";
    default:
      return "브리핑";
  }
}

/** Mock Data */
export const POSTS: BriefingPost[] = [
  {
    id: "p_1",
    type: "market",
    title: "이번 주 수도권 분양 일정, 전월 대비 감소",
    createdAt: "2025-12-21",
    seriesId: "s_market",
  },
  {
    id: "p_2",
    type: "market",
    title: "중소형 중심 공급 확대 흐름 지속",
    createdAt: "2025-12-21",
    seriesId: "s_market",
  },
  {
    id: "p_3",
    type: "region",
    title: "서울 동남권, 실거주 수요 강한 단지 위주로 관심 증가",
    createdAt: "2025-12-20",
    seriesId: "s_region",
  },
  {
    id: "p_4",
    type: "schedule",
    title: "다음 주 청약 마감 단지 체크 포인트",
    createdAt: "2025-12-19",
    seriesId: "s_schedule",
  },
  {
    id: "p_5",
    type: "market",
    title: "수도권 평균 분양가, 3개월 연속 보합",
    createdAt: "2025-12-18",
    seriesId: "s_market",
  },
  {
    id: "p_6",
    type: "region",
    title: "경기 남부, 교통 호재 인근 단지에 관심 집중",
    createdAt: "2025-12-17",
    seriesId: "s_region",
  },
  {
    id: "p_7",
    type: "schedule",
    title: "이번 달 청약/모집공고 확인 루틴 만들기",
    createdAt: "2025-12-16",
    seriesId: "s_schedule",
  },
  {
    id: "p_8",
    type: "region",
    title: "생활권 기준으로 ‘같은 서울’도 체감이 달라지는 이유",
    createdAt: "2025-12-15",
    seriesId: "s_region",
  },
];

export const SERIES: BriefingSeries[] = [
  {
    id: "s_region",
    title: "지역 포인트",
    description: "생활권·교통·학군 관점으로 지역을 보는 기준을 정리했어요.",
  },
  {
    id: "s_market",
    title: "시장 브리핑",
    description: "수요·공급·분양가 흐름을 빠르게 이해할 수 있도록 요약했어요.",
  },
  {
    id: "s_schedule",
    title: "일정 가이드",
    description:
      "마감/서류/자격요건 등 놓치기 쉬운 일정 체크 포인트를 모았어요.",
  },
  {
    id: "s_terms",
    title: "용어 정리",
    description: "분양을 처음 보는 분들을 위한 핵심 용어·기준을 정리했어요.",
  },
];
