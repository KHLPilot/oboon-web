// features/offerings/services/offering.query.ts
import type { SupabaseClient } from "@supabase/supabase-js";

export async function fetchPropertiesForOfferings(
  supabase: SupabaseClient,
  opts?: { limit?: number }
) {
  const limit = opts?.limit ?? 24;

  const { data: snapshots, error } = await supabase
    .from("property_public_snapshots")
    .select("property_id, snapshot, published_at")
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error || !snapshots) {
    return { data: null, error };
  }

  const visibleProperties = snapshots
    .map((row) => row.snapshot)
    .filter((snapshot) => Boolean(snapshot));

  return { data: visibleProperties, error: null };
}
