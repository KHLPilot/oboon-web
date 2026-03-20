import { createSupabaseClient } from "@/lib/supabaseClient";
import type { SupabaseClient } from "@supabase/supabase-js";

export type PropertyRequestStatus = "pending" | "approved" | "rejected";
export type PropertyRequestType = "publish" | "delete";

export type PropertyRequestRow = {
  id: string | number;
  status: PropertyRequestStatus;
  request_type?: PropertyRequestType;
  reason?: string | null;
  requested_at: string;
  rejection_reason?: string | null;
};

type PropertyRequestResult<T> = {
  data: T | null;
  error: Error | null;
};

export async function fetchPropertyRequestProfile(
  supabase: SupabaseClient,
  userId: string,
) {
  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  return {
    data: (data as { role: string | null } | null) ?? null,
    error: error ? new Error(error.message) : null,
  } as PropertyRequestResult<{ role: string | null }>;
}

export async function fetchPropertyRequestById(
  supabase: SupabaseClient,
  requestId: string,
) {
  const { data, error } = await supabase
    .from("property_requests")
    .select("*")
    .eq("id", requestId)
    .single();

  return {
    data: (data as Record<string, unknown> | null) ?? null,
    error: error ? new Error(error.message) : null,
  } as PropertyRequestResult<Record<string, unknown>>;
}

export async function updatePropertyRequestById(
  supabase: SupabaseClient,
  requestId: string,
  updatePayload: Record<string, unknown>,
) {
  const { data, error } = await supabase
    .from("property_requests")
    .update(updatePayload)
    .eq("id", requestId)
    .select(
      "id, status, request_type, reason, requested_at, property_id, agent_id, rejection_reason",
    )
    .single();

  return {
    data: (data as Record<string, unknown> | null) ?? null,
    error: error ? new Error(error.message) : null,
  } as PropertyRequestResult<Record<string, unknown>>;
}

export async function fetchMyPropertyRequest(propertyId: number) {
  return fetchMyPropertyRequestByType(propertyId, "publish");
}

export async function fetchMyDeleteRequest(propertyId: number) {
  if (!Number.isFinite(propertyId) || propertyId <= 0) {
    return {
      data: null,
      error: new Error("유효하지 않은 propertyId입니다."),
    } as PropertyRequestResult<PropertyRequestRow>;
  }

  const supabase = createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      data: null,
      error: new Error("로그인이 필요합니다."),
    } as PropertyRequestResult<PropertyRequestRow>;
  }

  const { data, error } = await supabase
    .from("property_requests")
    .select("id, status, request_type, reason, requested_at, rejection_reason")
    .eq("property_id", propertyId)
    .eq("agent_id", user.id)
    .eq("request_type", "delete")
    .eq("status", "pending")
    .order("requested_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    data: (data as PropertyRequestRow | null) ?? null,
    error: error ? new Error(error.message) : null,
  } as PropertyRequestResult<PropertyRequestRow>;
}

async function fetchMyPropertyRequestByType(
  propertyId: number,
  requestType: PropertyRequestType,
) {
  if (!Number.isFinite(propertyId) || propertyId <= 0) {
    return {
      data: null,
      error: new Error("유효하지 않은 propertyId입니다."),
    } as PropertyRequestResult<PropertyRequestRow>;
  }

  const supabase = createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: new Error("로그인이 필요합니다.") } as PropertyRequestResult<PropertyRequestRow>;
  }

  const { data, error } = await supabase
    .from("property_requests")
    .select("id, status, request_type, reason, requested_at, rejection_reason")
    .eq("property_id", propertyId)
    .eq("agent_id", user.id)
    .eq("request_type", requestType)
    .order("requested_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    data: (data as PropertyRequestRow | null) ?? null,
    error: error ? new Error(error.message) : null,
  } as PropertyRequestResult<PropertyRequestRow>;
}

export async function createPropertyRequest(
  propertyId: number,
  options?: { force?: boolean; requestType?: PropertyRequestType; reason?: string },
) {
  if (!Number.isFinite(propertyId) || propertyId <= 0) {
    return {
      data: null,
      error: new Error("유효하지 않은 propertyId입니다."),
    } as PropertyRequestResult<PropertyRequestRow>;
  }

  try {
    const response = await fetch("/api/property-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        propertyId,
        force: Boolean(options?.force),
        requestType: options?.requestType ?? "publish",
        reason: options?.reason ?? "",
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      return {
        data: null,
        error: new Error(payload.error || "요청 생성 실패"),
      } as PropertyRequestResult<PropertyRequestRow>;
    }
    return {
      data: (payload.propertyRequest as PropertyRequestRow | null) ?? null,
      error: null,
    } as PropertyRequestResult<PropertyRequestRow>;
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error("요청 생성 실패"),
    } as PropertyRequestResult<PropertyRequestRow>;
  }
}

export async function cancelPropertyRequest(requestId: string | number) {
  try {
    const response = await fetch(`/api/property-requests/${requestId}`, {
      method: "DELETE",
    });
    const payload = await response.json();
    if (!response.ok) {
      return {
        data: null,
        error: new Error(payload.error || "요청 철회 실패"),
      } as PropertyRequestResult<PropertyRequestRow>;
    }
    return {
      data: (payload.propertyRequest as PropertyRequestRow | null) ?? null,
      error: null,
    } as PropertyRequestResult<PropertyRequestRow>;
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error("요청 철회 실패"),
    } as PropertyRequestResult<PropertyRequestRow>;
  }
}
