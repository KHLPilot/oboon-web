export type RecoPoiCategory =
  | "HOSPITAL"
  | "CLINIC_DAILY"
  | "MART"
  | "SUBWAY"
  | "HIGH_SPEED_RAIL"
  | "SCHOOL"
  | "DEPARTMENT_STORE"
  | "SHOPPING_MALL";

export type SchoolLevel =
  | "ELEMENTARY"
  | "MIDDLE"
  | "HIGH"
  | "UNIVERSITY"
  | "OTHER";

export type KakaoPlace = {
  id: string;
  place_name: string;
  category_name: string;
  category_group_code: string;
  phone: string;
  address_name: string;
  road_address_name: string;
  x: string;
  y: string;
  place_url: string;
  distance?: string;
};

export type PoiUpsertRow = {
  property_id: number;
  category: RecoPoiCategory;
  rank: number;
  kakao_place_id: string;
  name: string;
  distance_m: number;
  lat: number | null;
  lng: number | null;
  address: string | null;
  road_address: string | null;
  phone: string | null;
  place_url: string | null;
  category_name: string | null;
  fetched_at: string;
  raw_kakao: Record<string, unknown>;
  subway_lines: string[] | null;
  subway_station_code: string | null;
  raw_public: Record<string, unknown> | null;
  school_level: SchoolLevel | null;
  updated_at: string;
};

export type BatchStats = {
  scanned: number;
  dueCandidates: number;
  queuedPicked: number;
  processed: number;
  succeeded: number;
  failed: number;
  upsertedRows: number;
  categoryCounts: Record<RecoPoiCategory, number>;
};
