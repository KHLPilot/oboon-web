import { notFound } from "next/navigation";
import PageContainer from "@/components/shared/PageContainer";
import OfferingDetailLeft from "@/features/offerings/components/detail/OfferingDetailLeft";
import OfferingDetailRight from "@/features/offerings/components/detail/OfferingDetailRight";
import OfferingDetailScrollReset from "@/features/offerings/components/detail/OfferingDetailScrollReset.client";
import OfferingViewTracker from "@/features/offerings/components/detail/OfferingViewTracker.client";
import {
  fetchOfferingDetail,
  hasApprovedAgent,
} from "@/features/offerings/services/offeringDetail.service";
import {
  getAvailableOfferingsBasic,
  getOfferingsForCompare,
} from "@/features/offerings/services/offering.compare";
import { createSupabaseServer } from "@/lib/supabaseServer";
import { runRecoPoiForProperty } from "@/features/reco/services/recoPoiBatch.service";

export default async function OfferingDetailPage({ id }: { id: number }) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isAdmin = false;
  if (user?.id) {
    const { data: me } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    isAdmin = me?.role === "admin";
  }

  const [initialProperty, hasAgent, availableOfferingsForCompare] = await Promise.all([
    fetchOfferingDetail(id),
    hasApprovedAgent(id),
    getAvailableOfferingsBasic(),
  ]);
  let property = initialProperty;
  if (!property) notFound();

  const [currentCompareItems, scrapsResult] = await Promise.all([
    getOfferingsForCompare([String(property.id)]),
    user
      ? supabase.from("offering_scraps").select("property_id").eq("profile_id", user.id)
      : Promise.resolve({ data: [] }),
  ]);
  const currentCompareItem = currentCompareItems[0] ?? null;
  const scrappedIds = (scrapsResult.data ?? []).map((r) => String(r.property_id));

  if (isAdmin) {
    const { count: poiCount } = await supabase
      .from("property_reco_pois")
      .select("id", { count: "exact", head: true })
      .eq("property_id", property.id);

    if ((poiCount ?? 0) === 0) {
      try {
        await runRecoPoiForProperty({ propertyId: property.id });
        const refreshed = await fetchOfferingDetail(id);
        if (refreshed) {
          property = refreshed;
        }
      } catch {
        // 상세 페이지 노출은 유지하고, POI는 배치/다음 요청에서 재시도
      }
    }
  }

  return (
    <PageContainer>
      <OfferingDetailScrollReset />
      <OfferingViewTracker propertyId={property.id} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
        <div className="lg:pr-5">
          <OfferingDetailLeft
            property={property}
            hasApprovedAgent={hasAgent}
            currentCompareItem={currentCompareItem}
            availableItemsForCompare={availableOfferingsForCompare}
            scrappedIdsForCompare={scrappedIds}
          />
        </div>

        <div className="lg:sticky lg:top-32 lg:h-fit space-y-4">
          <OfferingDetailRight
            propertyId={property.id}
            propertyName={property.name}
            propertyImageUrl={property.image_url ?? undefined}
            hasApprovedAgent={hasAgent}
            propertyTimeline={property.property_timeline}
          />
        </div>
      </div>
    </PageContainer>
  );
}
