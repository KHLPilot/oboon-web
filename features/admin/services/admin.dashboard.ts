import { createSupabaseClient } from "@/lib/supabaseClient";

export type AdminProfileRow = {
  id: string;
  name: string | null;
  email: string;
  phone_number: string | null;
  role: string;
  created_at: string;
  deleted_at: string | null;
};

export type PendingPropertyAgent = {
  id: string;
  property_id: number;
  agent_id: string;
  status: "pending" | "approved" | "rejected";
  requested_at: string;
  properties: {
    id: number;
    name: string;
  } | null;
  profiles: {
    id: string;
    name: string;
    email: string;
  } | null;
};

export type AdminDashboardData = {
  user: { id: string } | null;
  role: string | null;
  pendingAgents: AdminProfileRow[];
  pendingPropertyAgents: PendingPropertyAgent[];
  deletedUsers: AdminProfileRow[];
  activeUsers: AdminProfileRow[];
};

export async function fetchAdminDashboardData(): Promise<AdminDashboardData> {
  const supabase = createSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      user: null,
      role: null,
      pendingAgents: [],
      pendingPropertyAgents: [],
      deletedUsers: [],
      activeUsers: [],
    };
  }

  const { data: adminProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = adminProfile?.role ?? null;

  const { data: pending } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "agent_pending")
    .order("created_at", { ascending: true });

  const { data: propertyAgentsPending } = await supabase
    .from("property_agents")
    .select(
      `
      id,
      property_id,
      agent_id,
      status,
      requested_at
    `,
    )
    .eq("status", "pending")
    .order("requested_at", { ascending: true });

  let enrichedPropertyAgents: PendingPropertyAgent[] = [];
  if (propertyAgentsPending && propertyAgentsPending.length > 0) {
    const propertyIds = [
      ...new Set(propertyAgentsPending.map((pa) => pa.property_id)),
    ];
    const agentIds = [
      ...new Set(propertyAgentsPending.map((pa) => pa.agent_id)),
    ];

    const [{ data: propertiesData }, { data: profilesData }] =
      await Promise.all([
        supabase.from("properties").select("id, name").in("id", propertyIds),
        supabase.from("profiles").select("id, name, email").in("id", agentIds),
      ]);

    const propertiesMap = new Map(
      (propertiesData || []).map((p) => [p.id, p]),
    );
    const profilesMap = new Map(
      (profilesData || []).map((p) => [p.id, p]),
    );

    enrichedPropertyAgents = propertyAgentsPending.map((pa) => ({
      ...pa,
      properties: propertiesMap.get(pa.property_id) || null,
      profiles: profilesMap.get(pa.agent_id) || null,
    }));
  }

  const { data: users } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  const deletedUsers = (users || []).filter((u) => u.deleted_at !== null);
  const activeUsers = (users || []).filter((u) => u.deleted_at === null);

  return {
    user: { id: user.id },
    role,
    pendingAgents: (pending || []) as AdminProfileRow[],
    pendingPropertyAgents: enrichedPropertyAgents,
    deletedUsers: deletedUsers as AdminProfileRow[],
    activeUsers: activeUsers as AdminProfileRow[],
  };
}
