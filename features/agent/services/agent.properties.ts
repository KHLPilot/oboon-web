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
  status: "pending" | "approved" | "rejected" | "withdrawn";
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

type PropertyBaseRow = {
  id: number;
  name: string;
  property_type: string;
  status?: string | null;
};

type MainImageAssetRow = {
  property_id: number;
  image_url: string;
  updated_at?: string | null;
  created_at?: string | null;
};

function toTime(value?: string | null) {
  if (!value) return 0;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : 0;
}

function pickLatestAsset(
  current: MainImageAssetRow | undefined,
  candidate: MainImageAssetRow,
) {
  if (!current) return candidate;
  const currentUpdated = toTime(current.updated_at) || toTime(current.created_at);
  const nextUpdated = toTime(candidate.updated_at) || toTime(candidate.created_at);
  return nextUpdated >= currentUpdated ? candidate : current;
}

async function fetchMainImageMap(
  supabase: ReturnType<typeof createSupabaseClient>,
  propertyIds: number[],
) {
  const uniquePropertyIds = Array.from(
    new Set(propertyIds.filter((id) => Number.isFinite(id) && id > 0)),
  );
  if (uniquePropertyIds.length === 0) return new Map<number, string>();

  const { data, error } = await supabase
    .from("property_image_assets")
    .select("property_id, image_url, updated_at, created_at")
    .eq("kind", "main")
    .eq("is_active", true)
    .in("property_id", uniquePropertyIds);

  if (error) {
    if (error.code === "42P01") return new Map<number, string>();
    throw error;
  }

  const latestByPropertyId = new Map<number, MainImageAssetRow>();
  ((data ?? []) as MainImageAssetRow[]).forEach((row) => {
    const current = latestByPropertyId.get(row.property_id);
    latestByPropertyId.set(row.property_id, pickLatestAsset(current, row));
  });

  const imageMap = new Map<number, string>();
  latestByPropertyId.forEach((row, propertyId) => {
    imageMap.set(propertyId, row.image_url);
  });
  return imageMap;
}

function withMainImageUrl(rows: PropertyBaseRow[], imageMap: Map<number, string>) {
  return rows.map((row) => ({
    ...row,
    image_url: imageMap.get(row.id) ?? null,
  }));
}

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
    .in("status", ["pending", "approved", "rejected", "withdrawn"])
    .order("requested_at", { ascending: false });

  let enrichedRequests: AgentPropertyRequest[] = [];
  if (requests && requests.length > 0) {
    const propertyIds = [...new Set(requests.map((r) => r.property_id))];
    const { data: propertiesData } = await supabase
      .from("properties")
      .select("id, name, property_type, status")
      .in("id", propertyIds);
    const propertyRows = (propertiesData ?? []) as PropertyBaseRow[];
    const imageMap = await fetchMainImageMap(supabase, propertyRows.map((p) => p.id));
    const propertiesWithImage = withMainImageUrl(propertyRows, imageMap);

    const propertiesMap = new Map(
      propertiesWithImage.map((p) => [p.id, p]),
    );

    enrichedRequests = requests.map((r) => ({
      ...r,
      property: propertiesMap.get(r.property_id) || null,
    }));
  }

  const { data: propertiesData } = await supabase
    .from("properties")
    .select("id, name, property_type, status")
    .order("name");
  const propertyRows = (propertiesData ?? []) as PropertyBaseRow[];
  const imageMap = await fetchMainImageMap(supabase, propertyRows.map((p) => p.id));
  const propertiesWithImage = withMainImageUrl(propertyRows, imageMap);

  return {
    userId: user.id,
    role,
    profile: (profileData as Record<string, unknown>) ?? null,
    requests: enrichedRequests,
    properties: propertiesWithImage as AgentProperty[],
  };
}
