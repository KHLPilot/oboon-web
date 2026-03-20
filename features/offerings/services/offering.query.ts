// features/offerings/services/offering.query.ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type OfferingSitemapSnapshotRow = {
  property_id: number | string | null;
  published_at: string | null;
};

function createPublicSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) return null;

  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

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

export async function fetchOfferingSnapshotsForSitemap(
  limit = 500
): Promise<OfferingSitemapSnapshotRow[]> {
  const supabase = createPublicSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("property_public_snapshots")
    .select("property_id, published_at")
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error) return [];
  return (data ?? []) as OfferingSitemapSnapshotRow[];
}
