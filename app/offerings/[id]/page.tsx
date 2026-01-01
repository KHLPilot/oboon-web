// app/offerings/[id]/page.tsx
import { notFound } from "next/navigation";
import OfferingDetailLeft from "@/features/offerings/detail/OfferingDetailLeft";
import OfferingDetailRight from "@/features/offerings/detail/OfferingDetailRight";
import PageContainer from "@/components/shared/PageContainer";
import { fetchOfferingDetail } from "@/features/offerings/services/offeringDetail.service";

export default async function OfferingDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) notFound();

  const property = await fetchOfferingDetail(id);
  if (!property) notFound();

  return (
    <PageContainer className="pb-16 pt-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
        <div className="mr-5">
          <OfferingDetailLeft property={property} />
        </div>

        {/* 우측 스티키는 레이아웃에서만 제어 */}
        <div className="lg:sticky lg:top-32 lg:h-fit">
          <OfferingDetailRight />
        </div>
      </div>
    </PageContainer>
  );
}
