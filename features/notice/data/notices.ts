export type NoticeCategory =
  | "all"
  | "update"
  | "service"
  | "event"
  | "maintenance";

export type NoticeItem = {
  id: number;
  slug: string;
  title: string;
  summary: string;
  content: string;
  category: Exclude<NoticeCategory, "all">;
  publishedAt: string;
  pinned?: boolean;
  maintenance?: boolean;
};

export const NOTICE_CATEGORY_TABS: Array<{
  key: NoticeCategory;
  label: string;
}> = [
  { key: "all", label: "전체" },
  { key: "update", label: "업데이트" },
  { key: "service", label: "서비스" },
  { key: "event", label: "이벤트" },
  { key: "maintenance", label: "작업 안내" },
];

export const NOTICE_CATEGORY_LABEL: Record<
  Exclude<NoticeCategory, "all">,
  string
> = {
  update: "업데이트",
  service: "서비스",
  event: "이벤트",
  maintenance: "작업 안내",
};

export const NOTICE_ITEMS: NoticeItem[] = [
  {
    id: 1,
    slug: "sample-2026-02-update-a",
    title: "[예시] 2월 정기 업데이트 안내",
    summary: "서비스 안정성 향상을 위한 정기 업데이트가 적용되었습니다.",
    category: "update",
    publishedAt: "2026-02-24",
    pinned: true,
    content:
      "안녕하세요. OBOON 팀입니다.\n\n본 공지는 UI 확인용 예시 더미 텍스트입니다.\n\n적용 내용\n- 목록 스타일 점검\n- 상세 레이아웃 점검\n- 카테고리/날짜 표시 점검",
  },
  {
    id: 2,
    slug: "sample-2026-02-service-a",
    title: "[예시] 상담 예약 정책 변경 사전 안내",
    summary: "예약 및 취소 처리 기준이 일부 변경될 예정입니다.",
    category: "service",
    publishedAt: "2026-02-22",
    content:
      "본 공지는 서비스 안내 화면 검수를 위한 예시 텍스트입니다.\n\n변경 예정 항목\n- 예약 확정 기준 시간\n- 취소 정책 문구",
  },
  {
    id: 3,
    slug: "sample-2026-02-event-a",
    title: "[예시] 신규 회원 이벤트 안내",
    summary: "신규 가입 회원 대상 프로모션이 진행됩니다.",
    category: "event",
    publishedAt: "2026-02-20",
    content:
      "본 공지는 이벤트 카드 스타일 확인을 위한 예시 텍스트입니다.\n\n대상\n- 신규 가입 회원\n\n내용\n- 지정 액션 완료 시 자동 응모",
  },
  {
    id: 4,
    slug: "sample-2026-02-maintenance-a",
    title: "[예시] 시스템 점검 안내 (02:00~04:00)",
    summary: "점검 시간 동안 일부 기능 사용이 제한될 수 있습니다.",
    category: "maintenance",
    publishedAt: "2026-02-18",
    maintenance: true,
    content:
      "본 공지는 점검 안내 레이아웃 확인용 예시 텍스트입니다.\n\n점검 일정\n- 2026년 2월 28일 02:00 ~ 04:00\n\n영향 범위\n- 일부 기능 일시 제한",
  },
  {
    id: 5,
    slug: "sample-2026-02-update-b",
    title: "[예시] FAQ 카테고리 개편 안내",
    summary: "자주 묻는 질문을 주제별로 재정렬했습니다.",
    category: "service",
    publishedAt: "2026-02-15",
    content:
      "본 공지는 리스트 길이 및 본문 렌더링 테스트용 예시 텍스트입니다.",
  },
  {
    id: 6,
    slug: "sample-2026-02-update-c",
    title: "[예시] 비정기 업데이트 소식",
    summary: "일부 성능 개선이 반영되었습니다.",
    category: "update",
    publishedAt: "2026-02-13",
    content: "예시 더미 텍스트입니다.",
  },
  {
    id: 7,
    slug: "sample-2026-02-service-b",
    title: "[예시] 서비스 정책 사전 공지",
    summary: "다음 배포 주기에 정책 문구가 업데이트됩니다.",
    category: "service",
    publishedAt: "2026-02-11",
    content: "예시 더미 텍스트입니다.",
  },
  {
    id: 8,
    slug: "sample-2026-02-event-b",
    title: "[예시] 시즌 이벤트 안내",
    summary: "기간 한정 이벤트가 진행됩니다.",
    category: "event",
    publishedAt: "2026-02-09",
    content: "예시 더미 텍스트입니다.",
  },
  {
    id: 9,
    slug: "sample-2026-02-maintenance-b",
    title: "[예시] 작업 공지 안내",
    summary: "백엔드 점검으로 일부 API가 지연될 수 있습니다.",
    category: "maintenance",
    publishedAt: "2026-02-07",
    maintenance: true,
    content: "예시 더미 텍스트입니다.",
  },
  {
    id: 10,
    slug: "sample-2026-02-update-d",
    title: "[예시] 정기 업데이트 노트",
    summary: "버그 수정 및 안정화 작업이 포함되었습니다.",
    category: "update",
    publishedAt: "2026-02-05",
    content: "예시 더미 텍스트입니다.",
  },
];

export function formatNoticeDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function getNoticeList(category: NoticeCategory) {
  const source =
    category === "all"
      ? NOTICE_ITEMS
      : NOTICE_ITEMS.filter((item) => item.category === category);

  return source
    .slice()
    .sort(
      (a, b) =>
        Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) ||
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    );
}

export function getNoticeBySlug(slug: string) {
  return NOTICE_ITEMS.find((item) => item.slug === slug) ?? null;
}
