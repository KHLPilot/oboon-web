"use client";

import type { Dispatch, SetStateAction } from "react";
import { ChevronDown } from "lucide-react";

import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";

import type { FAQCategory, FAQEditor } from "@/features/admin/types/dashboard";

const ACTIVE_OPTIONS = [
  { label: "활성", value: "true" },
  { label: "비활성", value: "false" },
] as const;

type FaqEditorModalProps = {
  faqEditor: FAQEditor | null;
  setFaqEditor: Dispatch<SetStateAction<FAQEditor | null>>;
  faqCategories: FAQCategory[];
  faqSaving: boolean;
  onSaveFaqEditor: () => void;
};

export default function FaqEditorModal({
  faqEditor,
  setFaqEditor,
  faqCategories,
  faqSaving,
  onSaveFaqEditor,
}: FaqEditorModalProps) {
  return (
    <Modal
      open={Boolean(faqEditor)}
      onClose={() => {
        if (!faqSaving) setFaqEditor(null);
      }}
      showCloseIcon={!faqSaving}
    >
      {faqEditor ? (
        <div className="space-y-4">
          <div className="ob-typo-subtitle text-(--oboon-text-title)">
            {faqEditor.id ? "FAQ 수정" : "FAQ 등록"}
          </div>
          <div className="space-y-3">
            <label className="block">
              <span className="mb-1 block ob-typo-caption text-(--oboon-text-muted)">
                카테고리
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="secondary"
                    className="w-full justify-between rounded-xl"
                    disabled={faqSaving}
                  >
                    <span>
                      {faqCategories.find((category) => category.id === faqEditor.categoryId)?.name ??
                        "카테고리 선택"}
                    </span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-full min-w-[260px]">
                  {faqCategories.map((category) => (
                    <DropdownMenuItem
                      key={category.id}
                      onClick={() =>
                        setFaqEditor((prev) => (prev ? { ...prev, categoryId: category.id } : prev))
                      }
                    >
                      {category.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </label>
            <label className="block">
              <span className="mb-1 block ob-typo-caption text-(--oboon-text-muted)">질문</span>
              <Input
                value={faqEditor.question}
                onChange={(e) =>
                  setFaqEditor((prev) => (prev ? { ...prev, question: e.target.value } : prev))
                }
                placeholder="질문을 입력하세요"
                disabled={faqSaving}
              />
            </label>
            <label className="block">
              <span className="mb-1 block ob-typo-caption text-(--oboon-text-muted)">답변</span>
              <Textarea
                value={faqEditor.answer}
                onChange={(e) =>
                  setFaqEditor((prev) => (prev ? { ...prev, answer: e.target.value } : prev))
                }
                rows={8}
                placeholder="답변을 입력하세요"
                disabled={faqSaving}
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block ob-typo-caption text-(--oboon-text-muted)">
                  정렬 순서
                </span>
                <Input
                  type="number"
                  value={String(faqEditor.sortOrder)}
                  onChange={(e) =>
                    setFaqEditor((prev) =>
                      prev ? { ...prev, sortOrder: Number(e.target.value) || 0 } : prev,
                    )
                  }
                  disabled={faqSaving}
                />
              </label>
              <label className="block">
                <span className="mb-1 block ob-typo-caption text-(--oboon-text-muted)">
                  노출 상태
                </span>
                <Select
                  value={String(faqEditor.isActive)}
                  onChange={(val) =>
                    setFaqEditor((prev) => (prev ? { ...prev, isActive: val === "true" } : prev))
                  }
                  options={ACTIVE_OPTIONS}
                  disabled={faqSaving}
                />
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              size="sm"
              shape="pill"
              onClick={() => setFaqEditor(null)}
              disabled={faqSaving}
            >
              취소
            </Button>
            <Button
              variant="primary"
              size="sm"
              shape="pill"
              onClick={onSaveFaqEditor}
              loading={faqSaving}
            >
              저장
            </Button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}

