import Link from "next/link";
import type { Metadata } from "next";
import { ChevronDown, Search } from "lucide-react";
import PageContainer from "@/components/shared/PageContainer";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  formatNoticeDate,
  NOTICE_CATEGORY_LABEL,
  NOTICE_CATEGORY_TABS,
  type NoticeCategory,
} from "@/features/notice/data/notices";
import { fetchPublicNotices } from "@/features/notice/services/notices.server";

export const metadata: Metadata = {
  title: "공지사항",
  description: "OBOON 서비스 공지사항과 점검 안내를 확인할 수 있습니다.",
};

function toTab(value: string | undefined): NoticeCategory {
  if (!value) return "all";
  const valid = NOTICE_CATEGORY_TABS.some((tab) => tab.key === value);
  return valid ? (value as NoticeCategory) : "all";
}

function formatListDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return formatNoticeDate(value);
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}. ${month}. ${day}`;
}

export default async function NoticePage({
  searchParams,
}: {
  searchParams?: { category?: string; page?: string; q?: string };
}) {
  const activeTab = toTab(searchParams?.category);
  const query = (searchParams?.q ?? "").trim();
  const page = Math.max(1, Number.parseInt(searchParams?.page ?? "1", 10) || 1);
  const pageSize = 10;
  const notices = await fetchPublicNotices(activeTab);
  const filteredNotices = query
    ? notices.filter((item) => {
        const haystack = [
          item.title,
          item.summary,
          item.content,
          NOTICE_CATEGORY_LABEL[item.category],
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(query.toLowerCase());
      })
    : notices;
  const visibleCount = Math.min(filteredNotices.length, page * pageSize);
  const visibleNotices = filteredNotices.slice(0, visibleCount);
  const hasMore = visibleCount < filteredNotices.length;
  const nextPage = page + 1;
  const nextParams = new URLSearchParams();
  if (activeTab !== "all") nextParams.set("category", activeTab);
  if (query) nextParams.set("q", query);
  nextParams.set("page", String(nextPage));
  const nextHref = `/notice?${nextParams.toString()}`;

  return (
    <main className="flex-1 bg-(--oboon-bg-page)">
      <PageContainer className="pb-16">
        <section className="w-full">
          <div className="mb-4">
            <h1 className="ob-typo-h1 text-(--oboon-text-title)">공지사항</h1>
          </div>

          <div className="border-b border-(--oboon-border-default)">
            <div className="flex items-center justify-between gap-4">
              <div className="flex gap-5 overflow-x-auto">
                {NOTICE_CATEGORY_TABS.map((tab) => {
                  const active = tab.key === activeTab;
                  const params = new URLSearchParams();
                  if (tab.key !== "all") params.set("category", tab.key);
                  if (query) params.set("q", query);
                  const href = params.toString() ? `/notice?${params.toString()}` : "/notice";
                  return (
                    <Link
                      key={tab.key}
                      href={href}
                      className={`shrink-0 border-b-2 py-2.5 ob-typo-body-sm transition-colors ${
                        active
                          ? "border-(--oboon-text-title) text-(--oboon-text-title)"
                          : "border-transparent text-(--oboon-text-muted) hover:text-(--oboon-text-title)"
                      }`}
                    >
                      {tab.label}
                    </Link>
                  );
                })}
              </div>
              <form action="/notice" method="get" className="flex items-center gap-2">
                {activeTab !== "all" ? (
                  <input type="hidden" name="category" value={activeTab} />
                ) : null}
                <input
                  type="search"
                  name="q"
                  defaultValue={query}
                  placeholder="검색"
                  aria-label="공지 검색어"
                  className="h-8 w-36 rounded-full border border-(--oboon-border-default) bg-(--oboon-bg-surface) px-3 text-sm text-(--oboon-text-title) focus:outline-none focus:ring-2 focus:ring-(--oboon-primary)/40"
                />
                <button
                  type="submit"
                  aria-label="공지 검색"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-(--oboon-text-title) hover:bg-(--oboon-bg-subtle)"
                >
                  <Search className="h-5 w-5" />
                </button>
              </form>
            </div>
          </div>

          <div className="divide-y divide-(--oboon-border-default)">
            {visibleNotices.map((item) => (
              <Link
                key={item.id}
                href={`/notice/${item.slug}`}
                className="grid grid-cols-[88px_minmax(0,1fr)_112px] items-center gap-3 px-3 py-6 hover:bg-(--oboon-bg-subtle)/50"
              >
                <span className="ob-typo-body-sm text-(--oboon-text-title)">
                  {NOTICE_CATEGORY_LABEL[item.category]}
                </span>
                <span className="min-w-0 flex items-center gap-2">
                  {item.pinned ? (
                    <Badge variant="primary" className="shrink-0 px-2 py-0.5">
                      중요
                    </Badge>
                  ) : null}
                  {item.maintenance ? (
                    <Badge variant="warning" className="shrink-0 px-2 py-0.5">
                      점검
                    </Badge>
                  ) : null}
                  <span className="truncate ob-typo-h4 text-(--oboon-text-title)">
                    {item.title}
                  </span>
                </span>
                <span className="text-right ob-typo-body-sm text-(--oboon-text-muted)">
                  {formatListDate(item.publishedAt)}
                </span>
              </Link>
            ))}

            {visibleNotices.length === 0 ? (
              <div className="py-12 text-center ob-typo-body text-(--oboon-text-muted)">
                선택한 분류의 공지사항이 없습니다.
              </div>
            ) : null}
          </div>

          {hasMore ? (
            <div className="mt-10 flex justify-center">
              <Button asChild variant="secondary" shape="pill" className="h-11 px-5">
                <Link href={nextHref}>
                  더 보기({visibleNotices.length}/{filteredNotices.length})
                  <ChevronDown className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          ) : null}
        </section>
      </PageContainer>
    </main>
  );
}
