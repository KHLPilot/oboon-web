"use client";

import { useParams, useRouter } from "next/navigation";

import Button from "@/components/ui/Button";
import PageContainer from "@/components/shared/PageContainer";
import { useRequirePropertyEditAccess } from "@/features/company/hooks/useRequirePropertyEditAccess";
import SpecsEditorCard from "@/features/company/components/property-editor/SpecsEditorCard";

export default function PropertySpecsPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
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
    <main className="bg-(--oboon-bg-default)">
      <PageContainer>
        <div className="mb-8">
          <div className="flex w-full flex-col gap-6">
            <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <p className="ob-typo-h1 text-(--oboon-text-title)">건물 스펙</p>
                <p className="ob-typo-body text-(--oboon-text-muted)">
                  규모·구조·주차 등 주요 스펙을 입력하세요.
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

            <SpecsEditorCard
              propertyId={propertyId}
              onAfterSave={() => router.push(`/company/properties/${propertyId}`)}
            />
          </div>
        </div>
      </PageContainer>
    </main>
  );
}
