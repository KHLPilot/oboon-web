// features/offerings/services/offeringHistory.service.ts
import { type SupabaseClient } from "@supabase/supabase-js";

/**
 * 로그인 사용자의 열람 히스토리 (스냅샷 포함, 최신순 최대 20건)
 */
export async function getViewedOfferings(
  supabase: SupabaseClient,
  profileId: string,
) {
  // 1) 열람 기록 조회 (최신순)
  const { data: history, error: historyError } = await supabase
    .from("offering_view_history")
    .select("property_id, last_viewed_at, view_count")
    .eq("profile_id", profileId)
    .order("last_viewed_at", { ascending: false })
    .limit(20);

  if (historyError) {
    console.error("offering_view_history load error:", historyError.message);
    return [];
  }

  if (!history || history.length === 0) return [];

  const ids = history.map(
    (r: { property_id: number }) => r.property_id,
  );

  // 2) public snapshot에서 해당 현장 정보 조회
  const { data: snapshots, error: snapError } = await supabase
    .from("property_public_snapshots")
    .select("property_id, snapshot")
    .in("property_id", ids);

  if (snapError) {
    console.error("property_public_snapshots load error:", snapError.message);
    return [];
  }

  const snapshotMap = new Map<number, unknown>(
    (snapshots ?? []).map(
      (s: { property_id: number; snapshot: unknown }) => [
        s.property_id,
        s.snapshot,
      ],
    ),
  );

  // 3) 열람 순서(최신순) 유지하며 스냅샷 + 열람 시각 매핑
  return history
    .map(
      (r: { property_id: number; last_viewed_at: string; view_count: number }) => {
        const snapshot = snapshotMap.get(r.property_id);
        if (!snapshot) return null;
        return { snapshot, lastViewedAt: r.last_viewed_at };
      },
    )
    .filter(Boolean) as { snapshot: unknown; lastViewedAt: string }[];
}

/**
 * 특정 현장 열람 기록 삭제
 */
export async function deleteViewHistory(
  supabase: SupabaseClient,
  profileId: string,
  propertyId: number,
) {
  const { error } = await supabase
    .from("offering_view_history")
    .delete()
    .eq("profile_id", profileId)
    .eq("property_id", propertyId);

  if (error) console.error("delete view history error:", error.message);
  return !error;
}

/**
 * 전체 열람 기록 삭제
 */
export async function deleteAllViewHistory(
  supabase: SupabaseClient,
  profileId: string,
) {
  const { error } = await supabase
    .from("offering_view_history")
    .delete()
    .eq("profile_id", profileId);

  if (error) console.error("delete all view history error:", error.message);
  return !error;
}
