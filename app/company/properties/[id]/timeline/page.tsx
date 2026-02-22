"use client";

import { useParams, useRouter } from "next/navigation";

import Button from "@/components/ui/Button";
import PageContainer from "@/components/shared/PageContainer";
import { useRequirePropertyEditAccess } from "@/features/company/hooks/useRequirePropertyEditAccess";
import TimelineEditorCard from "@/features/company/components/property-editor/TimelineEditorCard";

export default function PropertyTimelinePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const propertyId = Number(params?.id);
  const { loading: accessLoading, allowed: canAccessProperty } =
    useRequirePropertyEditAccess(propertyId);

  if (accessLoading) {
    return (
      <main className="bg-(--oboon-bg-default)">
        <PageContainer>
          <div className="py-8">
            <div className="ob-typo-body text-(--oboon-text-muted)">권한 확인 중...</div>
          </div>
        </PageContainer>
      </main>
    );
  }
  if (!canAccessProperty) return null;

  return (
    <main className="bg-(--oboon-bg-default)">
      <PageContainer>
        <div className="py-8 md:py-0">
          <div className="flex w-full flex-col gap-6">
            <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1 pt-1">
                <p className="ob-typo-h1 text-(--oboon-text-title)">분양 일정</p>
                <p className="ob-typo-body text-(--oboon-text-muted)">
                  청약·계약·입주 주요 일정을 입력하세요.
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

            <TimelineEditorCard
              propertyId={propertyId}
              onAfterSave={() => router.push(`/company/properties/${propertyId}`)}
            />
          </div>
        </div>
      </PageContainer>
    </main>
  );
}
