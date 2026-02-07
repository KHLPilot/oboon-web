import { createSupabaseClient } from "@/lib/supabaseClient";

export type PropertyRequestStatus = "pending" | "approved" | "rejected";

export type PropertyRequestRow = {
  id: number;
  status: PropertyRequestStatus;
  requested_at: string;
  rejection_reason?: string | null;
};

type PropertyRequestResult<T> = {
  data: T | null;
  error: Error | null;
};

export async function fetchMyPropertyRequest(propertyId: number) {
  const supabase = createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: new Error("로그인이 필요합니다.") } as PropertyRequestResult<PropertyRequestRow>;
  }

  const { data, error } = await supabase
    .from("property_requests")
    .select("id, status, requested_at, rejection_reason")
    .eq("property_id", propertyId)
    .eq("agent_id", user.id)
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
  options?: { force?: boolean },
) {
  try {
    const response = await fetch("/api/property-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        propertyId,
        force: Boolean(options?.force),
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
