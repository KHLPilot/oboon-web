import { createSupabaseClient } from "@/lib/supabaseClient";
import {
  getPropertyProgress,
  getPropertyProgressPercent,
} from "@/features/property/mappers/propertyProgress";

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
  rejection_reason?: string | null;
  requested_at: string;
  properties: {
    id: number;
    name: string;
    progressPercent?: number;
    inputCount?: number;
    totalCount?: number;
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
  propertyAgents: PendingPropertyAgent[];
  approvedPropertyAgentCount: number;
  todayNewConsultations: number;
  todayVisitConsultations: number;
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
      propertyAgents: [],
      approvedPropertyAgentCount: 0,
      todayNewConsultations: 0,
      todayVisitConsultations: 0,
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

  const { data: propertyRequestsAll } = await supabase
    .from("property_requests")
    .select(
      `
      id,
      property_id,
      agent_id,
      status,
      rejection_reason,
      requested_at
    `,
    )
    .order("requested_at", { ascending: true });

  let enrichedPropertyAgents: PendingPropertyAgent[] = [];
  if (propertyRequestsAll && propertyRequestsAll.length > 0) {
    const propertyIds = [
      ...new Set(propertyRequestsAll.map((pa) => pa.property_id)),
    ];
    const agentIds = [
      ...new Set(propertyRequestsAll.map((pa) => pa.agent_id)),
    ];

    const [{ data: propertiesData }, { data: profilesData }] =
      await Promise.all([
        supabase
          .from("properties")
          .select(
            `
            id,
            name,
            confirmed_comment,
            estimated_comment,
            pending_comment,
            property_locations(id),
            property_facilities(id),
            property_specs!properties_id(*),
            property_timeline(*),
            property_unit_types(id)
          `,
          )
          .in("id", propertyIds),
        supabase
          .from("profiles")
          .select("id, name, email, role")
          .in("id", agentIds)
          .in("role", ["admin", "agent"]),
      ]);

    const propertiesMap = new Map(
      (propertiesData || []).map((p) => {
        const progress = getPropertyProgress(p);
        return [
          p.id,
          {
            id: p.id,
            name: p.name,
            progressPercent: getPropertyProgressPercent(p),
            inputCount: progress.inputCount,
            totalCount: progress.totalCount,
          },
        ];
      }),
    );
    const profilesMap = new Map(
      (profilesData || []).map((p) => [p.id, p]),
    );

    enrichedPropertyAgents = propertyRequestsAll.map((pa) => ({
      ...pa,
      properties: propertiesMap.get(pa.property_id) || null,
      profiles: profilesMap.get(pa.agent_id) || null,
    }));
  }

  const { count: approvedPropertyAgentCount } = await supabase
    .from("property_requests")
    .select("id", { count: "exact", head: true })
    .eq("status", "approved");

  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  const startOfTomorrow = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
  );

  const [{ count: todayNewConsultations }, { count: todayVisitConsultations }] =
    await Promise.all([
      supabase
        .from("consultations")
        .select("id", { count: "exact", head: true })
        .gte("created_at", startOfToday.toISOString())
        .lt("created_at", startOfTomorrow.toISOString()),
      supabase
        .from("consultations")
        .select("id", { count: "exact", head: true })
        .gte("scheduled_at", startOfToday.toISOString())
        .lt("scheduled_at", startOfTomorrow.toISOString()),
    ]);

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
    propertyAgents: enrichedPropertyAgents,
    approvedPropertyAgentCount: approvedPropertyAgentCount ?? 0,
    todayNewConsultations: todayNewConsultations ?? 0,
    todayVisitConsultations: todayVisitConsultations ?? 0,
    deletedUsers: deletedUsers as AdminProfileRow[],
    activeUsers: activeUsers as AdminProfileRow[],
  };
}
