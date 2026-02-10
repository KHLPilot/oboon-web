import { createSupabaseClient } from "@/lib/supabaseClient";

export type AgentPropertyOption = {
  id: number;
  name: string;
};

export type AgentConsultationOption = {
  id: string;
  scheduled_at: string;
  status: string;
  customer: {
    id: string;
    name: string;
  };
  property: {
    id: number;
    name: string;
  };
};

export type AgentScanBootstrap = {
  userId: string | null;
  role: string | null;
  properties: AgentPropertyOption[];
  consultations: AgentConsultationOption[];
};

export async function fetchAgentScanBootstrap(): Promise<AgentScanBootstrap> {
  const supabase = createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      userId: null,
      role: null,
      properties: [],
      consultations: [],
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = profile?.role ?? null;

  const { data: propertyAgents } = await supabase
    .from("property_agents")
    .select("property_id, properties(id, name)")
    .eq("agent_id", user.id)
    .eq("status", "approved");

  const properties =
    propertyAgents?.map((pa) => {
      const agentRow = pa as {
        properties:
          | {
              id: number;
              name: string;
            }
          | {
              id: number;
              name: string;
            }[]
          | null;
      };
      const property = Array.isArray(agentRow.properties)
        ? (agentRow.properties[0] ?? null)
        : agentRow.properties;
      if (!property) return null;
      return {
        id: property.id,
        name: property.name,
      };
    }).filter((property): property is AgentPropertyOption => property !== null) ?? [];

  const response = await fetch(
    "/api/consultations?role=agent&status=confirmed",
  );
  const consultData = await response.json();
  const consultations = response.ok
    ? (consultData.consultations as AgentConsultationOption[])
    : [];

  return {
    userId: user.id,
    role,
    properties,
    consultations,
  };
}

export function subscribeToVisitConfirmRequests(onChange: () => void) {
  const supabase = createSupabaseClient();
  const channel = supabase
    .channel("visit_confirm_requests_realtime")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "visit_confirm_requests" },
      () => onChange(),
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "visit_confirm_requests" },
      () => onChange(),
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
