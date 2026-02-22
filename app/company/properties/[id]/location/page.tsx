// app/company/properties/[id]/location/page.tsx
"use client";

import { useParams, useRouter } from "next/navigation";

import PageContainer from "@/components/shared/PageContainer";
import Button from "@/components/ui/Button";
import { useRequirePropertyEditAccess } from "@/features/company/hooks/useRequirePropertyEditAccess";
import LocationEditorCard from "@/features/company/components/property-editor/LocationEditorCard";

export default function PropertyLocationPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const propertyId = Number(params.id);
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
    <main className="bg-(--oboon-bg-dafault)">
      <PageContainer>
        <div className="py-8 md:py-0">
          <div className="flex w-full flex-col gap-6">
            <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <p className="ob-typo-h1 text-(--oboon-text-title)">현장 위치</p>
                <p className="ob-typo-body text-(--oboon-text-muted)">
                  주소를 등록하고 지도에 표시해요
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

            <LocationEditorCard
              propertyId={propertyId}
              onAfterSave={() => router.push(`/company/properties/${propertyId}`)}
            />
          </div>
        </div>
      </PageContainer>
    </main>
  );
}
