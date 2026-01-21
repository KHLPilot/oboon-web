// app/offerings/[id]/page.tsx
import { notFound } from "next/navigation";
import OfferingDetailLeft from "@/features/offerings/detail/OfferingDetailLeft";
import OfferingDetailRight from "@/features/offerings/detail/OfferingDetailRight";
import PageContainer from "@/components/shared/PageContainer";
import { fetchOfferingDetail, hasApprovedAgent } from "@/features/offerings/services/offeringDetail.service";

// app/offerings/[id]/page.tsx
export default async function OfferingDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) notFound();

  const [property, hasAgent] = await Promise.all([
    fetchOfferingDetail(id),
    hasApprovedAgent(id),
  ]);
  if (!property) notFound();

  return (
    <PageContainer>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
        <div className="lg:pr-5">
          <OfferingDetailLeft property={property} />
        </div>

        <div className="lg:sticky lg:top-32 lg:h-fit">
          <OfferingDetailRight
            propertyId={property.id}
            propertyName={property.name}
            hasApprovedAgent={hasAgent}
          />
        </div>
      </div>
    </PageContainer>
  );
}
