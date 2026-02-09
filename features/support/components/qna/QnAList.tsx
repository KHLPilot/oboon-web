"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import type { QnAListItemViewModel } from "../../domain/support";

type QnAListProps = {
  items: QnAListItemViewModel[];
};

export function QnAList({ items }: QnAListProps) {
  if (items.length === 0) {
    return (
      <div className="ob-typo-body py-12 text-center text-(--oboon-text-muted)">
        등록된 문의가 없습니다.
      </div>
    );
  }

  return (
    <div className="divide-y divide-(--oboon-border-default)">
      {/* 헤더 (데스크톱) */}
      <div className="ob-typo-body hidden gap-4 p-3 text-(--oboon-text-muted) md:grid md:grid-cols-[1fr_120px_100px_100px]">
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
          className="block p-3 rounded-xl transition-colors hover:bg-(--oboon-bg-subtle)/50"
        >
          {/* 데스크톱 */}
          <div className="hidden md:grid md:grid-cols-[1fr_120px_100px_100px] gap-4 items-center">
            <div className="flex items-center gap-2 min-w-0">
              {item.isSecret && (
                <Lock className="h-3.5 w-3.5 flex-shrink-0 text-(--oboon-text-muted)" />
              )}
              <span className="ob-typo-body truncate text-(--oboon-text-title)">
                {item.title}
              </span>
            </div>
            <div className="ob-typo-body truncate text-center text-(--oboon-text-muted)">
              {item.displayAuthor}
            </div>
            <div className="text-center">
              <Badge
                variant="status"
                className={`ob-typo-caption px-2 py-0.5 ${
                  item.statusKey === "answered"
                    ? "bg-(--oboon-success-bg) text-(--oboon-success-text)"
                    : "text-(--oboon-text-muted)"
                }`}
              >
                {item.statusLabel}
              </Badge>
            </div>
            <div className="ob-typo-body text-center text-(--oboon-text-muted)">
              {item.formattedDate}
            </div>
          </div>

          {/* 모바일 */}
          <div className="md:hidden space-y-2">
            <div className="flex items-center gap-2">
              {item.isSecret && (
                <Lock className="h-4 w-4 flex-shrink-0 text-(--oboon-text-muted)" />
              )}
              <span className="ob-typo-body flex-1 truncate text-(--oboon-text-title)">
                {item.title}
              </span>
              <Badge
                variant="status"
                className={`ob-typo-caption px-2 py-0.5 ${
                  item.statusKey === "answered"
                    ? "bg-(--oboon-success-bg) text-(--oboon-success-text)"
                    : "text-(--oboon-text-muted)"
                }`}
              >
                {item.statusLabel}
              </Badge>
            </div>
            <div className="ob-typo-caption flex items-center gap-2 text-(--oboon-text-muted)">
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
