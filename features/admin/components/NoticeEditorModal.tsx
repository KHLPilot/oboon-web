"use client";

import type { Dispatch, SetStateAction } from "react";
import { ChevronDown } from "lucide-react";

import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import {
  noticeCategoryLabel,
  NOTICE_CATEGORY_OPTIONS,
} from "@/features/admin/lib/dashboard-labels";
import type { NoticeEditor } from "@/features/admin/types/dashboard";

type NoticeEditorModalProps = {
  noticeEditor: NoticeEditor | null;
  setNoticeEditor: Dispatch<SetStateAction<NoticeEditor | null>>;
  noticeSaving: boolean;
  onSaveNoticeEditor: () => void;
};

export default function NoticeEditorModal({
  noticeEditor,
  setNoticeEditor,
  noticeSaving,
  onSaveNoticeEditor,
}: NoticeEditorModalProps) {
  return (
    <Modal
      open={Boolean(noticeEditor)}
      onClose={() => {
        if (!noticeSaving) setNoticeEditor(null);
      }}
      showCloseIcon={!noticeSaving}
    >
      {noticeEditor ? (
        <div className="space-y-4">
          <div className="ob-typo-subtitle text-(--oboon-text-title)">
            {noticeEditor.id ? "공지 수정" : "공지 등록"}
          </div>

          <label className="block">
            <span className="mb-1 block ob-typo-caption text-(--oboon-text-muted)">카테고리</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="secondary"
                  className="w-full justify-between rounded-xl"
                  disabled={noticeSaving}
                >
                  <span>{noticeCategoryLabel(noticeEditor.category)}</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" matchTriggerWidth className="min-w-[260px]">
                {NOTICE_CATEGORY_OPTIONS.map((item) => (
                  <DropdownMenuItem
                    key={item.value}
                    onClick={() =>
                      setNoticeEditor((prev) =>
                        prev
                          ? {
                              ...prev,
                              category: item.value,
                              isMaintenance: item.value === "maintenance" || prev.isMaintenance,
                            }
                          : prev,
                      )
                    }
                  >
                    {item.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </label>

          <label className="block">
            <span className="mb-1 block ob-typo-caption text-(--oboon-text-muted)">제목</span>
            <Input
              value={noticeEditor.title}
              onChange={(e) =>
                setNoticeEditor((prev) => (prev ? { ...prev, title: e.target.value } : prev))
              }
              placeholder="공지 제목을 입력하세요"
              disabled={noticeSaving}
            />
          </label>

          <label className="block">
            <span className="mb-1 block ob-typo-caption text-(--oboon-text-muted)">요약</span>
            <Input
              value={noticeEditor.summary}
              onChange={(e) =>
                setNoticeEditor((prev) => (prev ? { ...prev, summary: e.target.value } : prev))
              }
              placeholder="목록에서 보일 한 줄 설명"
              disabled={noticeSaving}
            />
          </label>

          <label className="block">
            <span className="mb-1 block ob-typo-caption text-(--oboon-text-muted)">게시일</span>
            <Input
              type="date"
              value={noticeEditor.publishedAt}
              onChange={(e) =>
                setNoticeEditor((prev) => (prev ? { ...prev, publishedAt: e.target.value } : prev))
              }
              disabled={noticeSaving}
            />
          </label>

          <label className="block">
            <span className="mb-1 block ob-typo-caption text-(--oboon-text-muted)">내용</span>
            <Textarea
              value={noticeEditor.content}
              onChange={(e) =>
                setNoticeEditor((prev) => (prev ? { ...prev, content: e.target.value } : prev))
              }
              rows={10}
              disabled={noticeSaving}
            />
          </label>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <label className="flex items-center gap-2 rounded-xl border border-(--oboon-border-default) px-3 py-2">
              <input
                type="checkbox"
                checked={noticeEditor.isPinned}
                onChange={(e) =>
                  setNoticeEditor((prev) => (prev ? { ...prev, isPinned: e.target.checked } : prev))
                }
                disabled={noticeSaving}
              />
              <span className="ob-typo-caption text-(--oboon-text-title)">중요 공지</span>
            </label>
            <label className="flex items-center gap-2 rounded-xl border border-(--oboon-border-default) px-3 py-2">
              <input
                type="checkbox"
                checked={noticeEditor.isMaintenance}
                onChange={(e) =>
                  setNoticeEditor((prev) =>
                    prev ? { ...prev, isMaintenance: e.target.checked } : prev,
                  )
                }
                disabled={noticeSaving}
              />
              <span className="ob-typo-caption text-(--oboon-text-title)">점검 공지로 표시</span>
            </label>
            <label className="flex items-center gap-2 rounded-xl border border-(--oboon-border-default) px-3 py-2">
              <input
                type="checkbox"
                checked={noticeEditor.isPublished}
                onChange={(e) =>
                  setNoticeEditor((prev) => (prev ? { ...prev, isPublished: e.target.checked } : prev))
                }
                disabled={noticeSaving}
              />
              <span className="ob-typo-caption text-(--oboon-text-title)">게시 상태</span>
            </label>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              size="sm"
              shape="pill"
              onClick={() => setNoticeEditor(null)}
              disabled={noticeSaving}
            >
              취소
            </Button>
            <Button
              variant="primary"
              size="sm"
              shape="pill"
              onClick={onSaveNoticeEditor}
              loading={noticeSaving}
            >
              저장
            </Button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}

