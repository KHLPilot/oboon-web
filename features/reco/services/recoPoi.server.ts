import { createSupabaseServer } from "@/lib/supabaseServer";
import { createSupabaseServiceError } from "@/lib/errors";

type RecoPoiRow = {
  category: string | null;
  rank: number | null;
  name: string | null;
  distance_m: number | string | null;
  subway_lines: string[] | null;
  school_level: string | null;
  fetched_at: string | null;
};

export async function fetchRecoPoisByPropertyId(propertyId: number) {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("property_reco_pois")
    .select(
      "category, rank, name, distance_m, subway_lines, school_level, fetched_at",
    )
    .eq("property_id", propertyId)
    .order("category", { ascending: true })
    .order("rank", { ascending: true });

  return {
    data: (data as RecoPoiRow[] | null) ?? null,
    error: createSupabaseServiceError(error, {
      scope: "recoPoi.server",
      action: "fetchRecoPoisByPropertyId",
      defaultMessage: "추천 POI 조회 중 오류가 발생했습니다.",
      context: { propertyId },
    }),
  };
}
