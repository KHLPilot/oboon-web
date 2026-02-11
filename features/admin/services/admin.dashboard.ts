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
  request_type: "publish" | "delete";
  status: "pending" | "approved" | "rejected";
  reason?: string | null;
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
  publishedPropertyCount: number;
  todayNewConsultations: number;
  todayVisitConsultations: number;
  todayNewQnaCount: number;
  pendingQnaCount: number;
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
      publishedPropertyCount: 0,
      todayNewConsultations: 0,
      todayVisitConsultations: 0,
      todayNewQnaCount: 0,
      pendingQnaCount: 0,
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
      request_type,
      status,
      reason,
      rejection_reason,
      requested_at
    `,
    )
    .order("requested_at", { ascending: false });

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

  const { count: publishedPropertyCount } = await supabase
    .from("property_public_snapshots")
    .select("property_id", { count: "exact", head: true })
    .not("published_at", "is", null);

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

  const [
    { count: todayNewConsultations },
    { count: todayVisitConsultations },
    { count: todayNewQnaCount },
    { count: pendingQnaCount },
  ] = await Promise.all([
    supabase
      .from("consultations")
      .select("id", { count: "exact", head: true })
      .gte("created_at", startOfToday.toISOString())
      .lt("created_at", startOfTomorrow.toISOString()),
    supabase
      .from("consultations")
      .select("id", { count: "exact", head: true })
      .neq("status", "cancelled")
      .gte("scheduled_at", startOfToday.toISOString())
      .lt("scheduled_at", startOfTomorrow.toISOString()),
    supabase
      .from("qna_questions")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null)
      .gte("created_at", startOfToday.toISOString())
      .lt("created_at", startOfTomorrow.toISOString()),
    supabase
      .from("qna_questions")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null)
      .eq("status", "pending"),
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
    publishedPropertyCount: publishedPropertyCount ?? 0,
    todayNewConsultations: todayNewConsultations ?? 0,
    todayVisitConsultations: todayVisitConsultations ?? 0,
    todayNewQnaCount: todayNewQnaCount ?? 0,
    pendingQnaCount: pendingQnaCount ?? 0,
    deletedUsers: deletedUsers as AdminProfileRow[],
    activeUsers: activeUsers as AdminProfileRow[],
  };
}
