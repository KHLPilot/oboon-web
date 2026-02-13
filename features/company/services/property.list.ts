import { createSupabaseClient } from "@/lib/supabaseClient";
import type {
  PropertyProgressRow,
  RelationRow,
  SpecsRow,
  TimelineRow,
} from "@/features/property/mappers/propertyProgress";

export type PropertyListProfile = {
  id: string;
  name: string;
  role: string;
};

export type PropertyListRow = {
  id: number;
  name: string;
  created_by: string;
  profiles?: PropertyListProfile | PropertyListProfile[] | null;
  property_locations?: RelationRow[] | null;
  property_facilities?: RelationRow[] | null;
  property_specs?: SpecsRow | SpecsRow[] | null;
  property_timeline?: TimelineRow | TimelineRow[] | null;
  property_unit_types?: RelationRow[] | null;
  confirmed_comment?: PropertyProgressRow["confirmed_comment"];
  estimated_comment?: PropertyProgressRow["estimated_comment"];
  request_status?: "pending" | "approved" | "rejected" | null;
  request_rejection_reason?: string | null;
  request_requested_at?: string | null;
  delete_request_status?: "pending" | "approved" | "rejected" | null;
  delete_request_requested_at?: string | null;
};

export async function fetchPropertyListData() {
  const supabase = createSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { userId: null, role: null, rows: [] as PropertyListRow[] };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  let allowedPropertyIds: number[] | null = null;
  if (profile?.role === "agent") {
    const { data: memberships } = await supabase
      .from("property_agents")
      .select("property_id, approved_at, requested_at")
      .eq("agent_id", user.id)
      .eq("status", "approved");

    const latestApproved = [...(memberships ?? [])].sort((a, b) => {
      const aTime = new Date(a.approved_at ?? a.requested_at).getTime();
      const bTime = new Date(b.approved_at ?? b.requested_at).getTime();
      return bTime - aTime;
    })[0];

    allowedPropertyIds = latestApproved ? [latestApproved.property_id] : [];
  }

  let query = supabase
    .from("properties")
    .select(
      `
      id,
      name,
      created_by,
      profiles (id, name, role),
      property_locations(id),
      property_facilities(id),
      property_specs(
        id,
        sale_type,
        trust_company,
        developer,
        builder,
        site_area,
        building_area,
        building_coverage_ratio,
        floor_area_ratio,
        floor_ground,
        floor_underground,
        building_count,
        household_total,
        parking_total,
        parking_per_household,
        heating_type,
        amenities
      ),
      property_timeline(
        id,
        announcement_date,
        application_start,
        application_end,
        winner_announce,
        contract_start,
        contract_end,
        move_in_date
      ),
      property_unit_types(id)
    `,
    )
    .order("id", { ascending: false });

  if (allowedPropertyIds) {
    if (allowedPropertyIds.length === 0) {
      return {
        userId: user.id,
        role: profile?.role ?? null,
        rows: [] as PropertyListRow[],
        error: null,
      };
    }
    query = query.in("id", allowedPropertyIds);
  }

  const { data, error } = await query;

  const rows = (error ? [] : (data ?? [])) as PropertyListRow[];

  if (!error && rows.length > 0) {
    const propertyIds = rows.map((r) => r.id);
    const { data: requests } = await supabase
      .from("property_requests")
      .select("property_id, status, request_type, requested_at, rejection_reason")
      .in("property_id", propertyIds)
      .eq("agent_id", user.id)
      .order("requested_at", { ascending: false });

    const publishRequestMap = new Map<
      number,
      {
        status: PropertyListRow["request_status"];
        requested_at: string;
        rejection_reason?: string | null;
      }
    >();
    const deleteRequestMap = new Map<
      number,
      {
        status: PropertyListRow["delete_request_status"];
        requested_at: string;
      }
    >();
    (requests || []).forEach((req) => {
      if (req.request_type === "publish") {
        if (!publishRequestMap.has(req.property_id)) {
          publishRequestMap.set(req.property_id, {
            status: req.status,
            requested_at: req.requested_at,
            rejection_reason: req.rejection_reason ?? null,
          });
        }
        return;
      }

      if (req.request_type === "delete") {
        if (!deleteRequestMap.has(req.property_id)) {
          deleteRequestMap.set(req.property_id, {
            status: req.status,
            requested_at: req.requested_at,
          });
        }
      }
    });

    rows.forEach((row) => {
      const req = publishRequestMap.get(row.id);
      const deleteReq = deleteRequestMap.get(row.id);
      row.request_status = req?.status ?? null;
      row.request_requested_at = req?.requested_at ?? null;
      row.request_rejection_reason = req?.rejection_reason ?? null;
      row.delete_request_status = deleteReq?.status ?? null;
      row.delete_request_requested_at = deleteReq?.requested_at ?? null;
    });
  }

  return {
    userId: user.id,
    role: profile?.role ?? null,
    rows,
    error: error ?? null,
  };
}

export async function deletePropertyById(id: number) {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("properties")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (!error && !data) {
    return {
      error: new Error("삭제 권한이 없거나 삭제할 현장을 찾을 수 없습니다."),
    };
  }
  return { error };
}
