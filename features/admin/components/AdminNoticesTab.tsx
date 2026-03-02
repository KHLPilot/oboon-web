"use client";

import { Edit3, FileText, Loader2, Trash2 } from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { noticeCategoryLabel } from "@/features/admin/lib/dashboard-labels";
import type { NoticeAdminItem } from "@/features/admin/types/dashboard";

type AdminNoticesTabProps = {
  noticeLoading: boolean;
  noticeItems: NoticeAdminItem[];
  noticeDeletingId: number | null;
  onCreateNotice: () => void;
  onEditNotice: (item: NoticeAdminItem) => void;
  onDeleteNotice: (noticeId: number) => void;
};

export default function AdminNoticesTab({
  noticeLoading,
  noticeItems,
  noticeDeletingId,
  onCreateNotice,
  onEditNotice,
  onDeleteNotice,
}: AdminNoticesTabProps) {
  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="ob-typo-h2 text-(--oboon-text-title)">공지 관리</div>
          <p className="mt-1 ob-typo-caption text-(--oboon-text-muted)">
            공지사항 페이지에 노출될 공지를 등록/수정/삭제합니다.
          </p>
        </div>
        <Button variant="primary" size="sm" shape="pill" onClick={onCreateNotice}>
          + 공지 등록
        </Button>
      </div>

      {noticeLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-(--oboon-primary)" />
        </div>
      ) : (
        <div className="space-y-3">
          {noticeItems.map((item) => (
            <Card key={item.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <FileText className="h-4 w-4 text-(--oboon-primary)" />
                    <span className="ob-typo-body text-(--oboon-text-title)">{item.title}</span>
                    <Badge variant="status">{noticeCategoryLabel(item.category)}</Badge>
                    <Badge variant="status">{item.is_published ? "게시" : "비공개"}</Badge>
                    {item.is_pinned ? <Badge variant="success">중요</Badge> : null}
                  </div>
                  <div className="mt-1 ob-typo-caption text-(--oboon-text-muted)">
                    /notice/{item.slug} ·{" "}
                    {item.published_at
                      ? new Date(item.published_at).toLocaleDateString("ko-KR")
                      : "게시일 없음"}
                  </div>
                  {item.summary ? (
                    <div className="mt-1 ob-typo-caption text-(--oboon-text-muted) line-clamp-2">
                      {item.summary}
                    </div>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button asChild variant="secondary" size="sm" shape="pill">
                    <a href={`/notice/${item.slug}`} target="_blank" rel="noreferrer">
                      미리보기
                    </a>
                  </Button>
                  <Button variant="secondary" size="sm" shape="pill" onClick={() => onEditNotice(item)}>
                    <Edit3 className="h-4 w-4" />
                    수정
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    shape="pill"
                    onClick={() => onDeleteNotice(item.id)}
                    loading={noticeDeletingId === item.id}
                  >
                    <Trash2 className="h-4 w-4" />
                    삭제
                  </Button>
                </div>
              </div>
            </Card>
          ))}

          {noticeItems.length === 0 && (
            <Card className="p-5 text-center">
              <p className="ob-typo-body text-(--oboon-text-muted)">등록된 공지가 없습니다.</p>
            </Card>
          )}
        </div>
      )}
    </>
  );
}

