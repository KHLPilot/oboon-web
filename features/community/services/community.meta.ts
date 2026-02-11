import { createSupabaseClient } from "@/lib/supabaseClient";

import type { CommunityPropertyOption } from "../domain/community";
import type { CommunityUserRole } from "../domain/community";

type ConsultationPropertyRow = {
  property_id: number | null;
  visited_at: string | null;
  scheduled_at: string | null;
  property:
    | {
        id: number;
        name: string | null;
      }
    | {
        id: number;
        name: string | null;
      }[]
    | null;
};

export async function getCommunityAuthStatus() {
  const supabase = createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let role: CommunityUserRole | null = null;
  if (user?.id) {
    const { data } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const nextRole = (data as { role?: CommunityUserRole | null } | null)?.role;
    role = nextRole ?? null;
  }

  return {
    isLoggedIn: Boolean(user),
    user,
    role,
  };
}

export async function getCommunityPropertyOptions(): Promise<
  CommunityPropertyOption[]
> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("properties")
    .select("id, name")
    .order("name", { ascending: true });

  if (error) {
    console.error("community properties load error:", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name ?? "현장",
    visitedOn: null,
  }));
}

export async function getVisitedCommunityPropertyOptions(): Promise<
  CommunityPropertyOption[]
> {
  const supabase = createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("consultations")
    .select(
      "property_id, visited_at, scheduled_at, property:properties!consultations_property_id_fkey(id, name)",
    )
    .eq("customer_id", user.id)
    .in("status", ["visited", "contracted"])
    .not("property_id", "is", null)
    .order("visited_at", { ascending: false, nullsFirst: false })
    .order("scheduled_at", { ascending: false, nullsFirst: false });

  if (error) {
    console.error("community visited properties load error:", error.message);
    return [];
  }

  const deduped = new Map<number, CommunityPropertyOption>();
  ((data ?? []) as ConsultationPropertyRow[]).forEach((row) => {
    const id = Number(row.property_id);
    const property = Array.isArray(row.property)
      ? row.property[0]
      : row.property;
    if (!Number.isFinite(id)) return;

    const visitedOn = (row.visited_at ?? row.scheduled_at ?? null)?.slice(0, 10);
    if (!deduped.has(id)) {
      deduped.set(id, {
        id,
        name: property?.name ?? "현장",
        visitedOn,
      });
    }
  });

  return Array.from(deduped.values()).sort((a, b) =>
    a.name.localeCompare(b.name, "ko"),
  );
}

export async function canWriteVisitedCommunityPost(): Promise<boolean> {
  const supabase = createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  const { count, error } = await supabase
    .from("consultations")
    .select("id", { count: "exact", head: true })
    .eq("customer_id", user.id)
    .in("status", ["visited", "contracted"]);

  if (error) {
    console.error("community visited eligibility load error:", error.message);
    return false;
  }

  return Boolean(count && count > 0);
}
