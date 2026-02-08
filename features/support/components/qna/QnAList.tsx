"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import type { QnAListItemViewModel } from "../../domain/support";

type QnAListProps = {
  items: QnAListItemViewModel[];
};

export function QnAList({ items }: QnAListProps) {
  if (items.length === 0) {
    return (
      <div className="py-12 text-center text-(--oboon-text-muted)">
        등록된 문의가 없습니다.
      </div>
    );
  }

  return (
    <div className="divide-y divide-(--oboon-border-default)">
      {/* 헤더 (데스크톱) */}
      <div className="hidden md:grid md:grid-cols-[1fr_120px_100px_100px] gap-4 py-3 text-sm font-medium text-(--oboon-text-muted)">
        <div>제목</div>
        <div className="text-center">작성자</div>
        <div className="text-center">상태</div>
        <div className="text-center">작성일</div>
      </div>

      {/* 목록 */}
      {items.map((item) => (
        <Link
          key={item.id}
          href={`/support/qna/${item.id}`}
          className="block py-4 transition-colors hover:bg-(--oboon-bg-subtle)/50"
        >
          {/* 데스크톱 */}
          <div className="hidden md:grid md:grid-cols-[1fr_120px_100px_100px] gap-4 items-center">
            <div className="flex items-center gap-2 min-w-0">
              {item.isSecret && (
                <Lock className="h-4 w-4 flex-shrink-0 text-(--oboon-text-muted)" />
              )}
              <span className="truncate text-(--oboon-text-title)">
                {item.title}
              </span>
            </div>
            <div className="text-center text-sm text-(--oboon-text-muted) truncate">
              {item.displayAuthor}
            </div>
            <div className="text-center">
              <span
                className={`inline-block rounded-full px-2 py-0.5 text-xs ${
                  item.statusKey === "answered"
                    ? "bg-(--oboon-success-bg) text-(--oboon-success-text)"
                    : "bg-(--oboon-bg-subtle) text-(--oboon-text-muted)"
                }`}
              >
                {item.statusLabel}
              </span>
            </div>
            <div className="text-center text-sm text-(--oboon-text-muted)">
              {item.formattedDate}
            </div>
          </div>

          {/* 모바일 */}
          <div className="md:hidden space-y-2">
            <div className="flex items-center gap-2">
              {item.isSecret && (
                <Lock className="h-4 w-4 flex-shrink-0 text-(--oboon-text-muted)" />
              )}
              <span className="flex-1 truncate text-(--oboon-text-title)">
                {item.title}
              </span>
              <span
                className={`inline-block rounded-full px-2 py-0.5 text-xs ${
                  item.statusKey === "answered"
                    ? "bg-(--oboon-success-bg) text-(--oboon-success-text)"
                    : "bg-(--oboon-bg-subtle) text-(--oboon-text-muted)"
                }`}
              >
                {item.statusLabel}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-(--oboon-text-muted)">
              <span>{item.displayAuthor}</span>
              <span>|</span>
              <span>{item.formattedDate}</span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

export default QnAList;
