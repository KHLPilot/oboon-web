// features/offerings/services/offeringScrap.service.ts
import { type SupabaseClient } from "@supabase/supabase-js";

/**
 * 특정 현장의 찜 상태 조회
 */
export async function getScrapStatus(
  supabase: SupabaseClient,
  profileId: string,
  propertyId: number,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("offering_scraps")
    .select("id")
    .eq("profile_id", profileId)
    .eq("property_id", propertyId)
    .maybeSingle();

  if (error) return false;
  return data !== null;
}

/**
 * 로그인 사용자가 찜한 property_id 목록 (Set) 반환
 * - 리스트 페이지에서 카드별 찜 상태 일괄 초기화에 사용
 */
export async function getScrapedPropertyIds(
  supabase: SupabaseClient,
  profileId: string,
): Promise<Set<number>> {
  const { data, error } = await supabase
    .from("offering_scraps")
    .select("property_id")
    .eq("profile_id", profileId);

  if (error || !data) return new Set();
  return new Set(data.map((r: { property_id: number }) => r.property_id));
}

/**
 * 찜한 현장 목록 (스냅샷 포함)
 * - 프로필 탭 "찜한 현장" 섹션에 사용
 */
export async function getScrapedOfferings(
  supabase: SupabaseClient,
  profileId: string,
) {
  // 1) 찜 목록에서 property_id + 찜한 시각 조회 (최신순)
  const { data: scraps, error: scrapError } = await supabase
    .from("offering_scraps")
    .select("property_id, created_at")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false });

  if (scrapError) {
    console.error("offering_scraps load error:", scrapError.message);
    return [];
  }

  if (!scraps || scraps.length === 0) return [];

  const ids = scraps.map((r: { property_id: number }) => r.property_id);

  // 2) public snapshot에서 해당 현장 정보 조회
  const { data: snapshots, error: snapError } = await supabase
    .from("property_public_snapshots")
    .select("property_id, snapshot")
    .in("property_id", ids);

  if (snapError) {
    console.error("property_public_snapshots load error:", snapError.message);
    return [];
  }

  // 3) 찜 순서(최신순) 유지하며 스냅샷 매핑
  const snapshotMap = new Map<number, unknown>(
    (snapshots ?? []).map((s: { property_id: number; snapshot: unknown }) => [
      s.property_id,
      s.snapshot,
    ]),
  );

  return ids
    .map((id: number) => snapshotMap.get(id))
    .filter(Boolean);
}
