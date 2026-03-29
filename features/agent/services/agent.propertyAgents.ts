import { createSupabaseServer } from "@/lib/supabaseServer";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import {
  AppError,
  ERR,
  ServiceResult,
  createSupabaseServiceError,
} from "@/lib/errors";

function createAdminSupabase() {
  try {
    return createSupabaseAdminClient();
  } catch {
    return null;
  }
}

function missingAdminConfigError() {
  return new AppError(
    ERR.CONFIG,
    "처리 중 오류가 발생했습니다.",
    500,
  );
}

export async function fetchPropertyAgentProfileRole(userId: string) {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  return {
    data: (data as { role: string | null } | null) ?? null,
    error: createSupabaseServiceError(error, {
      scope: "agent.propertyAgents",
      action: "fetchPropertyAgentProfileRole",
      defaultMessage: "프로필 조회 중 오류가 발생했습니다.",
      context: { userId },
      codeMap: {
        PGRST116: {
          code: ERR.NOT_FOUND,
          clientMessage: "프로필을 찾을 수 없습니다.",
          statusHint: 404,
        },
      },
    }),
  } as ServiceResult<{ role: string | null }>;
}

export async function fetchPropertyAgentProperty(propertyId: number) {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("properties")
    .select("id, name")
    .eq("id", propertyId)
    .single();

  return {
    data: (data as { id: number; name: string | null } | null) ?? null,
    error: createSupabaseServiceError(error, {
      scope: "agent.propertyAgents",
      action: "fetchPropertyAgentProperty",
      defaultMessage: "현장 조회 중 오류가 발생했습니다.",
      context: { propertyId },
      codeMap: {
        PGRST116: {
          code: ERR.NOT_FOUND,
          clientMessage: "현장을 찾을 수 없습니다.",
          statusHint: 404,
        },
      },
    }),
  } as ServiceResult<{ id: number; name: string | null }>;
}

export async function fetchExistingPropertyAgent(
  propertyId: number,
  agentId: string,
) {
  const supabase = createAdminSupabase();
  if (!supabase) {
    return {
      data: null,
      error: missingAdminConfigError(),
    } as ServiceResult<{ id: string; status: string | null }>;
  }

  const { data, error } = await supabase
    .from("property_agents")
    .select("id, status")
    .eq("property_id", propertyId)
    .eq("agent_id", agentId)
    .maybeSingle();

  return {
    data: (data as { id: string; status: string | null } | null) ?? null,
    error: createSupabaseServiceError(error, {
      scope: "agent.propertyAgents",
      action: "fetchExistingPropertyAgent",
      defaultMessage: "기존 소속 조회 중 오류가 발생했습니다.",
      context: { propertyId, agentId },
    }),
  } as ServiceResult<{ id: string; status: string | null }>;
}

export async function reactivatePropertyAgentMembership(
  id: string,
  approvedBy: string,
  nowIso: string,
) {
  const supabase = createAdminSupabase();
  if (!supabase) {
    return {
      data: null,
      error: missingAdminConfigError(),
    } as ServiceResult<Record<string, unknown>>;
  }

  const { data, error } = await supabase
    .from("property_agents")
    .update({
      status: "approved",
      requested_at: nowIso,
      approved_at: nowIso,
      approved_by: approvedBy,
      rejected_at: null,
      rejection_reason: null,
      withdrawn_at: null,
    })
    .eq("id", id)
    .select()
    .single();

  return {
    data: (data as Record<string, unknown> | null) ?? null,
    error: createSupabaseServiceError(error, {
      scope: "agent.propertyAgents",
      action: "reactivatePropertyAgentMembership",
      defaultMessage: "소속 재활성화 중 오류가 발생했습니다.",
      context: { id },
    }),
  } as ServiceResult<Record<string, unknown>>;
}

export async function insertApprovedPropertyAgentMembership(
  propertyId: number,
  agentId: string,
  nowIso: string,
) {
  const supabase = createAdminSupabase();
  if (!supabase) {
    return {
      data: null,
      error: missingAdminConfigError(),
    } as ServiceResult<Record<string, unknown>>;
  }

  const { data, error } = await supabase
    .from("property_agents")
    .insert({
      property_id: propertyId,
      agent_id: agentId,
      status: "approved",
      requested_at: nowIso,
      approved_at: nowIso,
      approved_by: agentId,
    })
    .select()
    .single();

  return {
    data: (data as Record<string, unknown> | null) ?? null,
    error: createSupabaseServiceError(error, {
      scope: "agent.propertyAgents",
      action: "insertApprovedPropertyAgentMembership",
      defaultMessage: "소속 등록 중 오류가 발생했습니다.",
      context: { propertyId, agentId },
    }),
  } as ServiceResult<Record<string, unknown>>;
}

export async function fetchPropertyAgentsList(params: {
  userId: string;
  role: string;
  status?: string | null;
}) {
  const supabase = await createSupabaseServer();

  let query = supabase
    .from("property_agents")
    .select(
      `
        id,
        property_id,
        agent_id,
        status,
        requested_at,
        approved_at,
        approved_by,
        rejected_at,
        rejection_reason,
        created_at,
        properties:property_id (
          id,
          name,
          property_type
        ),
        profiles:agent_id (
          id,
          name,
          email,
          phone_number
        )
      `,
    )
    .order("requested_at", { ascending: false });

  if (params.role !== "admin") {
    query = query.eq("agent_id", params.userId);
  }

  if (params.status) {
    query = query.eq("status", params.status);
  }

  const { data, error } = await query;

  return {
    data: (data as Array<Record<string, unknown>> | null) ?? null,
    error: createSupabaseServiceError(error, {
      scope: "agent.propertyAgents",
      action: "fetchPropertyAgentsList",
      defaultMessage: "소속 목록 조회 중 오류가 발생했습니다.",
      context: { userId: params.userId, role: params.role },
    }),
  } as ServiceResult<Array<Record<string, unknown>>>;
}

export async function fetchPropertyMainAssets(propertyIds: number[]) {
  if (propertyIds.length === 0) {
    return {
      data: [],
      error: null,
    } as ServiceResult<
      Array<{
        property_id: number;
        image_url: string | null;
        sort_order: number | null;
        created_at: string | null;
      }>
    >;
  }

  const supabase = createAdminSupabase();
  if (!supabase) {
    return {
      data: null,
      error: missingAdminConfigError(),
    } as ServiceResult<
      Array<{
        property_id: number;
        image_url: string | null;
        sort_order: number | null;
        created_at: string | null;
      }>
    >;
  }

  const { data, error } = await supabase
    .from("property_image_assets")
    .select("property_id, image_url, sort_order, created_at")
    .in("property_id", propertyIds)
    .eq("kind", "main")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  return {
    data:
      (data as Array<{
        property_id: number;
        image_url: string | null;
        sort_order: number | null;
        created_at: string | null;
      }> | null) ?? null,
    error: createSupabaseServiceError(error, {
      scope: "agent.propertyAgents",
      action: "fetchPropertyMainAssets",
      defaultMessage: "대표 이미지 조회 중 오류가 발생했습니다.",
      context: { propertyCount: propertyIds.length },
    }),
  };
}

export async function fetchApprovedPropertyAgentsForUser(agentId: string) {
  const supabase = createAdminSupabase();
  if (!supabase) {
    return {
      data: null,
      error: missingAdminConfigError(),
    } as ServiceResult<Array<{ id: string; property_id: number }>>;
  }

  const { data, error } = await supabase
    .from("property_agents")
    .select("id, property_id")
    .eq("agent_id", agentId)
    .eq("status", "approved")
    .order("approved_at", { ascending: false, nullsFirst: false })
    .order("requested_at", { ascending: false, nullsFirst: false });

  return {
    data: (data as Array<{ id: string; property_id: number }> | null) ?? null,
    error: createSupabaseServiceError(error, {
      scope: "agent.propertyAgents",
      action: "fetchApprovedPropertyAgentsForUser",
      defaultMessage: "승인 소속 조회 중 오류가 발생했습니다.",
      context: { agentId },
    }),
  } as ServiceResult<Array<{ id: string; property_id: number }>>;
}

export async function withdrawPropertyAgents(
  ids: string[],
  withdrawnAt: string,
) {
  const supabase = createAdminSupabase();
  if (!supabase) {
    return {
      data: null,
      error: missingAdminConfigError(),
    } as ServiceResult<Array<{ id: string }>>;
  }

  const { data, error } = await supabase
    .from("property_agents")
    .update({
      status: "withdrawn",
      withdrawn_at: withdrawnAt,
      approved_at: null,
      approved_by: null,
    })
    .in("id", ids)
    .select("id");

  return {
    data: (data as Array<{ id: string }> | null) ?? null,
    error: createSupabaseServiceError(error, {
      scope: "agent.propertyAgents",
      action: "withdrawPropertyAgents",
      defaultMessage: "소속 해제 중 오류가 발생했습니다.",
      context: { membershipCount: ids.length },
    }),
  } as ServiceResult<Array<{ id: string }>>;
}
