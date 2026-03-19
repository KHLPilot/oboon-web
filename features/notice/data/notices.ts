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

export const NOTICE_ITEMS: NoticeItem[] = [];

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
