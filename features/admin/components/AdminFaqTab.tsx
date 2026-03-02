"use client";

import { Edit3, FileText, Loader2, Trash2 } from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { FAQCategory, FAQItem } from "@/features/admin/types/dashboard";

type AdminFaqTabProps = {
  faqLoading: boolean;
  faqCategories: FAQCategory[];
  faqItems: FAQItem[];
  faqDeletingId: string | null;
  onCreateFaq: () => void;
  onEditFaq: (item: FAQItem) => void;
  onDeleteFaq: (faqId: string) => void;
};

export default function AdminFaqTab({
  faqLoading,
  faqCategories,
  faqItems,
  faqDeletingId,
  onCreateFaq,
  onEditFaq,
  onDeleteFaq,
}: AdminFaqTabProps) {
  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="ob-typo-h2 text-(--oboon-text-title)">FAQ 관리</div>
          <p className="mt-1 ob-typo-caption text-(--oboon-text-muted)">
            자주 묻는 질문의 질문/답변/노출 상태를 관리합니다.
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          shape="pill"
          onClick={onCreateFaq}
          disabled={faqCategories.length === 0}
        >
          + FAQ 등록
        </Button>
      </div>

      {faqLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-(--oboon-primary)" />
        </div>
      ) : (
        <div className="space-y-6">
          {faqCategories.map((category) => {
            const items = faqItems
              .filter((item) => item.categoryId === category.id)
              .sort((a, b) => a.sortOrder - b.sortOrder);
            return (
              <div key={category.id}>
                <div className="ob-typo-subtitle text-(--oboon-text-title) mb-3">
                  {category.name}
                </div>
                <div className="space-y-3">
                  {items.map((item) => (
                    <Card key={item.id} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <FileText className="h-4 w-4 text-(--oboon-primary)" />
                            <span className="ob-typo-body text-(--oboon-text-title)">
                              {item.question}
                            </span>
                            <Badge variant="status">정렬 {item.sortOrder}</Badge>
                            <Badge variant="status">{item.isActive ? "활성" : "비활성"}</Badge>
                          </div>
                          <div className="mt-1 ob-typo-caption text-(--oboon-text-muted) line-clamp-3 whitespace-pre-wrap">
                            {item.answer}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            shape="pill"
                            onClick={() => onEditFaq(item)}
                          >
                            <Edit3 className="h-4 w-4" />
                            수정
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            shape="pill"
                            onClick={() => onDeleteFaq(item.id)}
                            loading={faqDeletingId === item.id}
                          >
                            <Trash2 className="h-4 w-4" />
                            삭제
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                  {items.length === 0 && (
                    <p className="ob-typo-caption text-(--oboon-text-muted)">
                      등록된 FAQ가 없습니다.
                    </p>
                  )}
                </div>
              </div>
            );
          })}

          {faqCategories.length === 0 && (
            <Card className="p-5 text-center">
              <p className="ob-typo-body text-(--oboon-text-muted)">
                FAQ 카테고리가 없습니다. DB 마이그레이션 상태를 확인해주세요.
              </p>
            </Card>
          )}
        </div>
      )}
    </>
  );
}

