import { notFound } from "next/navigation";
import PageContainer from "@/components/shared/PageContainer";
import OfferingDetailLeft from "@/features/offerings/components/detail/OfferingDetailLeft";
import OfferingDetailRight from "@/features/offerings/components/detail/OfferingDetailRight";
import OfferingViewTracker from "@/features/offerings/components/detail/OfferingViewTracker.client";
import {
  fetchOfferingDetail,
  hasApprovedAgent,
} from "@/features/offerings/services/offeringDetail.service";
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

  const [initialProperty, hasAgent] = await Promise.all([
    fetchOfferingDetail(id),
    hasApprovedAgent(id),
  ]);
  let property = initialProperty;
  if (!property) notFound();

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
      <OfferingViewTracker propertyId={property.id} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
        <div className="lg:pr-5">
          <OfferingDetailLeft
            property={property}
            hasApprovedAgent={hasAgent}
          />
        </div>

        <div className="lg:sticky lg:top-32 lg:h-fit space-y-4">
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
