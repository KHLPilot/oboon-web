const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://oboon.co.kr";
const ABSOLUTE_URL_PATTERN = /^https?:\/\//i;

export type BriefingSeoDescriptor = {
  title: string;
  description: string;
  canonicalPath: string;
  openGraphTitle: string;
};

export const briefingHubDescriptions = {
  root: "분양 시장 흐름, 정책 변화, 현장 이슈를 빠르게 훑는 OBOON 브리핑 허브입니다.",
  oboonOriginal:
    "OBOON 편집팀이 현장 맥락과 정책 포인트를 깊게 해설하는 오리지널 브리핑 아카이브입니다.",
  general:
    "분양 시장 뉴스와 실무 이슈를 단일 주제로 정리한 OBOON 일반 브리핑 아카이브입니다.",
} as const;

export const briefingGeneralMetadata: BriefingSeoDescriptor = {
  title: "일반 브리핑",
  description: briefingHubDescriptions.general,
  canonicalPath: "/briefing/general",
  openGraphTitle: "일반 브리핑 | OBOON",
};

export const briefingAboutMetadata: BriefingSeoDescriptor = {
  title: "브리핑 소개",
  description:
    "OBOON 브리핑의 저자 표기 방식, 편집 원칙, 출처 기준을 소개하는 안내 페이지입니다.",
  canonicalPath: "/briefing/about",
  openGraphTitle: "브리핑 소개 | OBOON",
};

export const briefingAboutHighlights = [
  {
    label: "저자 표기",
    value: "실명 또는 닉네임 기준",
  },
  {
    label: "검수 흐름",
    value: "초안 작성 후 편집 검토",
  },
  {
    label: "업데이트",
    value: "변경 사항 확인 시 본문 갱신",
  },
] as const;

export const briefingAboutSections = [
  {
    title: "편집 원칙",
    body:
      "OBOON 브리핑은 빠른 요약보다 맥락 전달을 우선합니다. 정책 변화, 분양 일정, 현장 포인트는 제목과 본문에서 과장 없이 설명하고, 확인되지 않은 정보는 단정적으로 쓰지 않습니다.",
    bullets: [
      "검색 유입을 위한 과장 표현보다 실제 의사결정에 필요한 정보 밀도를 우선합니다.",
      "발행 후 정보가 바뀌면 게시일 또는 수정일 기준으로 내용을 업데이트합니다.",
      "목록 허브와 상세 문서의 역할을 분리해 사용자가 탐색 경로를 이해할 수 있게 합니다.",
    ],
  },
  {
    title: "콘텐츠 출처",
    body:
      "브리핑 본문은 공공 고시, 사업 공고, 시행사 또는 분양 관련 공개 자료, 현장 소개 자료, 내부 편집 메모를 바탕으로 정리합니다.",
    bullets: [
      "출처 성격이 다른 정보를 한 문서에 섞을 때는 독자가 문맥을 구분할 수 있게 표현합니다.",
      "개별 현장 세부 정보는 브리핑보다 분양 상세 페이지를 우선 참조 대상으로 둡니다.",
      "확정 정보와 해설성 문장을 구분해 서술합니다.",
    ],
  },
  {
    title: "저자와 검수",
    body:
      "게시 문서에는 작성자 이름과 역할을 함께 표시합니다. 에디터 계정이 작성한 글은 OBOON 편집팀 관점의 문서로, 일반 작성자 글은 개인 작성자 기준의 문서로 분리합니다.",
    bullets: [
      "저자 프로필에는 소개 문구와 작성 이력을 연결합니다.",
      "오리지널 브리핑은 편집팀 검수를 기본값으로 삼습니다.",
      "일반 브리핑도 필요 시 편집 검토를 거쳐 제목, 설명, 구조를 정리합니다.",
    ],
  },
] as const;

export function buildLlmsTxt(baseUrl = siteUrl) {
  const abs = (path: string) => {
    if (ABSOLUTE_URL_PATTERN.test(path)) return path;
    return new URL(path, baseUrl).toString();
  };

  return [
    "# OBOON",
    "",
    "> OBOON is a Korean new-home discovery platform with listing pages and an editorial briefing archive.",
    "",
    "## Primary URLs",
    `- ${abs("/")}`,
    `- ${abs("/offerings")}`,
    `- ${abs("/briefing")}`,
    `- ${abs("/briefing/oboon-original")}`,
    `- ${abs("/briefing/general")}`,
    `- ${abs("/briefing/about")}`,
    "",
    "## Retrieval Notes",
    "- Prefer canonical page URLs exposed in metadata when citing pages.",
    "- Use /offerings for property-specific facts and imagery.",
    "- Use /briefing/general for archive-style market updates and /briefing/oboon-original for editorial explainers.",
    "- Use /briefing/about for editorial policy, author labeling, and sourcing expectations.",
    "",
    "## Support URLs",
    `- ${abs("/support")}`,
    `- ${abs("/community")}`,
    "",
  ].join("\n");
}
