import { createSupabaseClient } from "@/lib/supabaseClient";

export type AgentProperty = {
  id: number;
  name: string;
  property_type: string;
  image_url?: string | null;
  status?: string | null;
};

export type AgentPropertyRequest = {
  id: string;
  property_id: number;
  status: "pending" | "approved" | "rejected" | "withdrawn";
  requested_at: string;
  approved_at?: string | null;
  rejected_at?: string | null;
  rejection_reason?: string | null;
  property: AgentProperty | null;
};

export type AgentPropertyDashboard = {
  userId: string | null;
  role: string | null;
  profile: Record<string, unknown> | null;
  requests: AgentPropertyRequest[];
  properties: AgentProperty[];
};

function normalizeUrl(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

async function fetchMainImageMap(propertyIds: number[]) {
  if (propertyIds.length === 0) return new Map<number, string>();

  const supabase = createSupabaseClient();
  const { data } = await supabase
    .from("property_image_assets")
    .select("property_id, image_url, sort_order, created_at")
    .in("property_id", propertyIds)
    .eq("kind", "main")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  const map = new Map<number, string>();
  for (const row of data ?? []) {
    const url = normalizeUrl(row.image_url);
    if (!url) continue;
    if (!map.has(row.property_id)) {
      map.set(row.property_id, url);
    }
  }
  return map;
}

export async function fetchAgentPropertyDashboard(): Promise<AgentPropertyDashboard> {
  const supabase = createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      userId: null,
      role: null,
      profile: null,
      requests: [],
      properties: [],
    };
  }

  const { data: profileData } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const role = profileData?.role ?? null;

  const { data: requests } = await supabase
    .from("property_agents")
    .select(
      `
        id,
        property_id,
        status,
        requested_at,
        approved_at,
        rejected_at,
        rejection_reason
      `,
    )
    .eq("agent_id", user.id)
    .in("status", ["pending", "approved", "rejected", "withdrawn"])
    .order("requested_at", { ascending: false });

  let enrichedRequests: AgentPropertyRequest[] = [];
  if (requests && requests.length > 0) {
    const propertyIds = [...new Set(requests.map((r) => r.property_id))];
    const { data: propertiesData } = await supabase
      .from("properties")
      .select("id, name, property_type, status")
      .in("id", propertyIds);

    const mainImageMap = await fetchMainImageMap(propertyIds);
    const propertiesMap = new Map(
      (propertiesData || []).map((p) => [
        p.id,
        {
          ...p,
          image_url: mainImageMap.get(p.id) ?? null,
        },
      ]),
    );

    enrichedRequests = requests.map((r) => ({
      ...r,
      property: propertiesMap.get(r.property_id) || null,
    }));
  }

  const { data: propertiesData } = await supabase
    .from("properties")
    .select("id, name, property_type, status")
    .order("name");

  const allPropertyIds = (propertiesData || []).map((p) => p.id);
  const allMainImageMap = await fetchMainImageMap(allPropertyIds);
  const propertiesWithMainImage = (propertiesData || []).map((p) => ({
    ...p,
    image_url: allMainImageMap.get(p.id) ?? null,
  }));

  return {
    userId: user.id,
    role,
    profile: (profileData as Record<string, unknown>) ?? null,
    requests: enrichedRequests,
    properties: propertiesWithMainImage as AgentProperty[],
  };
}
