import { createSupabaseClient } from "@/lib/supabaseClient";
import {
  getPropertySectionStatus,
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
    role?: string | null;
  } | null;
};

export type AdminPropertyCard = {
  propertyId: number;
  title: string;
  progressPercent: number | null;
  inputCount: number | null;
  totalCount: number | null;
  missingLabels: string[];
  latestRequestId: string | null;
  requestType: "publish" | "delete" | null;
  status: "pending" | "approved" | "rejected" | null;
  reason: string | null;
  rejectionReason: string | null;
  requestedAt: string | null;
  agent: string;
  agentRole: string | null;
  email: string;
  createdAt: string;
};

export type AdminDashboardData = {
  user: { id: string } | null;
  role: string | null;
  pendingAgents: AdminProfileRow[];
  propertyAgents: PendingPropertyAgent[];
  propertyCards: AdminPropertyCard[];
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
      propertyCards: [],
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

  const { data: propertiesData } = await supabase
    .from("properties")
    .select(
      `
        id,
        name,
        created_by,
        created_at,
        confirmed_comment,
        estimated_comment,
        property_locations(id),
        property_facilities(id),
        property_specs!properties_id(*),
        property_timeline(*),
        property_unit_types(id)
      `,
    )
    .order("id", { ascending: false });

  const agentIds = [...new Set((propertyRequestsAll || []).map((pa) => pa.agent_id))];
  const creatorIds = [
    ...new Set(
      (propertiesData || [])
        .map((p) => p.created_by)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    ),
  ];
  const profileIds = [...new Set([...agentIds, ...creatorIds])];

  const { data: profilesData } = profileIds.length
    ? await supabase
        .from("profiles")
        .select("id, name, email, role")
        .in("id", profileIds)
    : { data: [] };

  const propertiesMap = new Map(
    (propertiesData || []).map((p) => {
      const status = getPropertySectionStatus(p);
      const sections = [
        { label: "현장 위치", status: status.siteLocationStatus },
        { label: "건물 스펙", status: status.specsStatus },
        { label: "일정", status: status.timelineStatus },
        { label: "평면 타입", status: status.unitStatus },
        { label: "홍보시설", status: status.facilityStatus },
        { label: "감정평가사 메모", status: status.commentStatus },
      ];
      const inputCount = sections.filter((s) => s.status === "full").length;
      const totalCount = sections.length;
      const missingLabels = sections
        .filter((s) => s.status !== "full")
        .map((s) => s.label);

      return [
        p.id,
        {
          id: p.id,
          name: p.name,
          createdAt: p.created_at,
          progressPercent: getPropertyProgressPercent(p),
          inputCount,
          totalCount,
          missingLabels,
        },
      ];
    }),
  );
  const profilesMap = new Map((profilesData || []).map((p) => [p.id, p]));

  const enrichedPropertyAgents = (propertyRequestsAll || []).map((pa) => ({
    ...pa,
    properties: propertiesMap.get(pa.property_id) || null,
    profiles: profilesMap.get(pa.agent_id) || null,
  }));

  const latestRequestByProperty = new Map<
    number,
    {
      id: string;
      request_type: "publish" | "delete";
      status: "pending" | "approved" | "rejected";
      reason: string | null;
      rejection_reason: string | null;
      requested_at: string;
      agent_id: string;
    }
  >();

  (propertyRequestsAll || []).forEach((row) => {
    const normalized = {
      id: row.id,
      request_type: row.request_type,
      status: row.status,
      reason: row.reason ?? null,
      rejection_reason: row.rejection_reason ?? null,
      requested_at: row.requested_at,
      agent_id: row.agent_id,
    };
    const prev = latestRequestByProperty.get(row.property_id);
    if (!prev) {
      latestRequestByProperty.set(row.property_id, normalized);
      return;
    }

    const prevPriority = prev.status === "pending" ? 2 : 1;
    const nextPriority = normalized.status === "pending" ? 2 : 1;
    if (nextPriority > prevPriority) {
      latestRequestByProperty.set(row.property_id, normalized);
      return;
    }
    if (
      nextPriority === prevPriority &&
      new Date(normalized.requested_at).getTime() >
        new Date(prev.requested_at).getTime()
    ) {
      latestRequestByProperty.set(row.property_id, normalized);
    }
  });

  const propertyCards: AdminPropertyCard[] = (propertiesData || []).map((property) => {
    const latestRequest = latestRequestByProperty.get(property.id);
    const creator = profilesMap.get(property.created_by);

    const progress = propertiesMap.get(property.id);
    return {
      propertyId: property.id,
      title: property.name,
      progressPercent: getPropertyProgressPercent(property),
      inputCount: progress?.inputCount ?? null,
      totalCount: progress?.totalCount ?? null,
      missingLabels: progress?.missingLabels ?? [],
      latestRequestId: latestRequest?.id ?? null,
      requestType: latestRequest?.request_type ?? null,
      status: latestRequest?.status ?? null,
      reason: latestRequest?.reason ?? null,
      rejectionReason: latestRequest?.rejection_reason ?? null,
      requestedAt: latestRequest?.requested_at ?? null,
      agent: creator?.name || "-",
      agentRole: creator?.role ?? null,
      email: creator?.email || "-",
      createdAt: property.created_at,
    };
  });

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
    propertyCards,
    publishedPropertyCount: publishedPropertyCount ?? 0,
    todayNewConsultations: todayNewConsultations ?? 0,
    todayVisitConsultations: todayVisitConsultations ?? 0,
    todayNewQnaCount: todayNewQnaCount ?? 0,
    pendingQnaCount: pendingQnaCount ?? 0,
    deletedUsers: deletedUsers as AdminProfileRow[],
    activeUsers: activeUsers as AdminProfileRow[],
  };
}
