import { createSupabaseClient } from "@/lib/supabaseClient";

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
  property_locations?: any;
  property_facilities?: any;
  property_specs?: any;
  property_timeline?: any;
  property_unit_types?: any;
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

  const { data, error } = await supabase
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

  return {
    userId: user.id,
    role: profile?.role ?? null,
    rows: (error ? [] : (data ?? [])) as PropertyListRow[],
    error: error ?? null,
  };
}

export async function deletePropertyById(id: number) {
  const supabase = createSupabaseClient();
  const { error } = await supabase.from("properties").delete().eq("id", id);
  return { error };
}
