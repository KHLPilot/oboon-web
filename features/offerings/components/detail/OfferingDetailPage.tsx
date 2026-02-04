import { notFound } from "next/navigation";
import PageContainer from "@/components/shared/PageContainer";
import OfferingDetailLeft from "@/features/offerings/components/detail/OfferingDetailLeft";
import OfferingDetailRight from "@/features/offerings/components/detail/OfferingDetailRight";
import { fetchOfferingDetail, hasApprovedAgent } from "@/features/offerings/services/offeringDetail.service";

export default async function OfferingDetailPage({
  id,
}: {
  id: number;
}) {
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
            propertyImageUrl={property.image_url ?? undefined}
            hasApprovedAgent={hasAgent}
          />
        </div>
      </div>
    </PageContainer>
  );
}
