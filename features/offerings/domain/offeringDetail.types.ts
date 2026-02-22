export type PropertyLocationRow = {
  road_address: string | null;
  jibun_address: string | null;
  lat: number | null;
  lng: number | null;
  region_1depth: string | null;
  region_2depth: string | null;
  region_3depth: string | null;
};

export type PropertySpecRow = {
  sale_type: string | null;
  trust_company: string | null;
  developer: string | null;
  builder: string | null;
  site_area: number | null;
  building_area: number | null;
  building_coverage_ratio: number | null;
  floor_area_ratio: number | null;
  floor_ground: number | null;
  floor_underground: number | null;
  building_count: number | null;
  household_total: number | null;
  parking_total: number | null;
  parking_per_household: number | null;
  heating_type: string | null;
  amenities: string | string[] | null;
};

export type PropertyTimelineRow = {
  announcement_date: string | null;
  application_start: string | null;
  application_end: string | null;
  winner_announce: string | null;
  contract_start: string | null;
  contract_end: string | null;
  move_in_date: string | null;
};

export type PropertyUnitTypeRow = {
  id: number;
  type_name: string | null;
  price_min: number | null;
  price_max: number | null;
  is_price_public?: boolean | null;
  is_public?: boolean | null;
  floor_plan_url: string | null;
  image_url: string | null;
  exclusive_area: number | null;
  supply_area: number | null;
  rooms: number | null;
  bathrooms: number | null;
  building_layout: string | null;
  orientation: string | null;
  unit_count: number | null;
  supply_count: number | null;
  sort_order?: number | null;
};

export type PropertyFacilityRow = {
  id: number;
  type: string | null;
  road_address: string | null;
  lat: number | string | null;
  lng: number | string | null;
  is_active?: boolean | null;
};

export type PropertyGalleryImageRow = {
  id: string;
  property_id: number;
  image_url: string;
  sort_order: number;
  created_at: string;
};

export type PropertyRecoPoiRow = {
  category:
    | "HOSPITAL"
    | "CLINIC_DAILY"
    | "MART"
    | "SUBWAY"
    | "HIGH_SPEED_RAIL"
    | "SCHOOL"
    | "DEPARTMENT_STORE"
    | "SHOPPING_MALL";
  rank: number;
  kakao_place_id: string;
  name: string;
  distance_m: number | string | null;
  category_name?: string | null;
  subway_lines?: string[] | null;
  school_level?:
    | "ELEMENTARY"
    | "MIDDLE"
    | "HIGH"
    | "UNIVERSITY"
    | "OTHER"
    | null;
};

export type PropertyRow = {
  id: number;
  created_at: string;
  name: string;
  property_type: string;
  status: string | null;
  description: string | null;
  image_url: string | null;
  floor_plan_url: string | null;
  confirmed_comment: string | null;
  estimated_comment: string | null;
  property_locations: PropertyLocationRow[] | PropertyLocationRow | null;
  property_specs: PropertySpecRow[] | PropertySpecRow | null;
  property_timeline: PropertyTimelineRow[] | PropertyTimelineRow | null;
  property_unit_types: PropertyUnitTypeRow[] | PropertyUnitTypeRow | null;
  property_facilities?: PropertyFacilityRow[] | PropertyFacilityRow | null;
  property_reco_pois?: PropertyRecoPoiRow[] | PropertyRecoPoiRow | null;
  property_gallery_images?:
    | PropertyGalleryImageRow[]
    | PropertyGalleryImageRow
    | null;
};
