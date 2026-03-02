"use client";

import type { Dispatch, SetStateAction } from "react";
import { Edit3, FileText, Loader2 } from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Textarea from "@/components/ui/Textarea";
import { Badge } from "@/components/ui/Badge";
import { termTypeLabel } from "@/features/admin/lib/dashboard-labels";
import type { Term } from "@/features/admin/types/dashboard";

type AdminTermsTabProps = {
  termsLoading: boolean;
  editingTerm: Term | null;
  setEditingTerm: Dispatch<SetStateAction<Term | null>>;
  termSaving: boolean;
  onSaveTerm: () => void;
  terms: Term[];
};

export default function AdminTermsTab({
  termsLoading,
  editingTerm,
  setEditingTerm,
  termSaving,
  onSaveTerm,
  terms,
}: AdminTermsTabProps) {
  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="ob-typo-h2 text-(--oboon-text-title)">약관 관리</div>
          <p className="mt-1 ob-typo-caption text-(--oboon-text-muted)">
            고객 및 상담사에게 표시되는 약관을 관리합니다.
          </p>
        </div>
      </div>

      {termsLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-(--oboon-primary)" />
        </div>
      ) : editingTerm ? (
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2 flex-wrap">
              <FileText className="h-5 w-5 text-(--oboon-primary)" />
              <span className="ob-typo-subtitle text-(--oboon-text-title)">
                {termTypeLabel(editingTerm.type)}
              </span>
              <Badge variant="status">v{editingTerm.version}</Badge>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block ob-typo-caption text-(--oboon-text-muted) mb-1">제목</label>
              <input
                type="text"
                value={editingTerm.title}
                onChange={(e) =>
                  setEditingTerm((prev) => (prev ? { ...prev, title: e.target.value } : prev))
                }
                className="w-full px-3 py-2 rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) text-(--oboon-text-title) ob-typo-body focus:outline-none focus:ring-2 focus:ring-(--oboon-primary)"
              />
            </div>

            <div>
              <label className="block ob-typo-caption text-(--oboon-text-muted) mb-1">내용</label>
              <Textarea
                value={editingTerm.content}
                onChange={(e) =>
                  setEditingTerm((prev) => (prev ? { ...prev, content: e.target.value } : prev))
                }
                rows={12}
                className="w-full px-3 py-2 rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) text-(--oboon-text-title) ob-typo-body focus:outline-none focus:ring-2 focus:ring-(--oboon-primary) resize-none"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="secondary"
                size="sm"
                shape="pill"
                onClick={() => setEditingTerm(null)}
                disabled={termSaving}
              >
                취소
              </Button>
              <Button
                variant="primary"
                size="sm"
                shape="pill"
                onClick={onSaveTerm}
                loading={termSaving}
              >
                저장
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          <div>
            <div className="ob-typo-subtitle text-(--oboon-text-title) mb-3">회원가입 약관</div>
            <div className="space-y-3">
              {terms
                .filter((t) => t.type.startsWith("signup_"))
                .map((term) => (
                  <Card key={term.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <FileText className="h-4 w-4 text-(--oboon-primary)" />
                          <span className="ob-typo-body text-(--oboon-text-title)">
                            {termTypeLabel(term.type)}
                          </span>
                          <Badge variant="status">v{term.version}</Badge>
                          <Badge variant="status">{term.is_active ? "활성" : "비활성"}</Badge>
                        </div>
                        <div className="mt-1 ob-typo-caption text-(--oboon-text-muted) line-clamp-2">
                          {term.content.slice(0, 100)}...
                        </div>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        shape="pill"
                        onClick={() => setEditingTerm(term)}
                      >
                        <Edit3 className="h-4 w-4" />
                        수정
                      </Button>
                    </div>
                  </Card>
                ))}
              {terms.filter((t) => t.type.startsWith("signup_")).length === 0 && (
                <p className="ob-typo-caption text-(--oboon-text-muted)">
                  회원가입 약관이 없습니다. DB 마이그레이션을 실행해주세요.
                </p>
              )}
            </div>
          </div>

          <div>
            <div className="ob-typo-subtitle text-(--oboon-text-title) mb-3">예약 · 상담사 약관</div>
            <div className="space-y-3">
              {terms
                .filter((t) => !t.type.startsWith("signup_"))
                .map((term) => (
                  <Card key={term.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <FileText className="h-4 w-4 text-(--oboon-primary)" />
                          <span className="ob-typo-body text-(--oboon-text-title)">
                            {termTypeLabel(term.type)}
                          </span>
                          <Badge variant="status">v{term.version}</Badge>
                          <Badge variant="status">{term.is_active ? "활성" : "비활성"}</Badge>
                        </div>
                        <div className="mt-1 ob-typo-body text-(--oboon-text-title)">{term.title}</div>
                        <div className="mt-1 ob-typo-caption text-(--oboon-text-muted) line-clamp-2">
                          {term.content.slice(0, 100)}...
                        </div>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        shape="pill"
                        onClick={() => setEditingTerm(term)}
                      >
                        <Edit3 className="h-4 w-4" />
                        수정
                      </Button>
                    </div>
                  </Card>
                ))}
              {terms.filter((t) => !t.type.startsWith("signup_")).length === 0 && (
                <p className="ob-typo-caption text-(--oboon-text-muted)">예약/상담사 약관이 없습니다.</p>
              )}
            </div>
          </div>

          {terms.length === 0 && (
            <Card className="p-5 text-center">
              <p className="ob-typo-body text-(--oboon-text-muted)">등록된 약관이 없습니다.</p>
            </Card>
          )}
        </div>
      )}
    </>
  );
}

