"use client";

import { useParams, useRouter } from "next/navigation";

import Button from "@/components/ui/Button";
import PageContainer from "@/components/shared/PageContainer";
import { useRequirePropertyEditAccess } from "@/features/company/hooks/useRequirePropertyEditAccess";
import CommentEditorCard from "@/features/company/components/property-editor/CommentEditorCard";

export default function PropertyCommentPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const propertyId = Number(params?.id);
  const { loading: accessLoading, allowed: canAccessProperty } =
    useRequirePropertyEditAccess(propertyId);

  if (accessLoading) {
    return (
      <div className="px-4 py-8 ob-typo-body text-(--oboon-text-muted)">
        권한 확인 중...
      </div>
    );
  }
  if (!canAccessProperty) return null;

  return (
    <main className="bg-(--oboon-bg-page)">
      <PageContainer>
        <div className="flex w-full flex-col gap-6">
          <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <div className="ob-typo-h1 text-(--oboon-text-title)">감정평가사 메모</div>
              <p className="ob-typo-body text-(--oboon-text-muted)">
                확정/추정 메모를 분리해 입력합니다.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                shape="pill"
                onClick={() => router.push(`/company/properties/${propertyId}`)}
              >
                취소
              </Button>
            </div>
          </header>

          <CommentEditorCard
            propertyId={propertyId}
            onAfterSave={() => router.push(`/company/properties/${propertyId}`)}
          />
        </div>
      </PageContainer>
    </main>
  );
}
