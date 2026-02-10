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
  status: "pending" | "approved" | "rejected";
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
    .in("status", ["pending", "approved", "rejected"])
    .order("requested_at", { ascending: false });

  let enrichedRequests: AgentPropertyRequest[] = [];
  if (requests && requests.length > 0) {
    const propertyIds = [...new Set(requests.map((r) => r.property_id))];
    const { data: propertiesData } = await supabase
      .from("properties")
      .select("id, name, property_type, image_url, status")
      .in("id", propertyIds);

    const propertiesMap = new Map(
      (propertiesData || []).map((p) => [p.id, p]),
    );

    enrichedRequests = requests.map((r) => ({
      ...r,
      property: propertiesMap.get(r.property_id) || null,
    }));
  }

  const { data: propertiesData } = await supabase
    .from("properties")
    .select("id, name, property_type, image_url, status")
    .order("name");

  return {
    userId: user.id,
    role,
    profile: (profileData as Record<string, unknown>) ?? null,
    requests: enrichedRequests,
    properties: (propertiesData || []) as AgentProperty[],
  };
}
