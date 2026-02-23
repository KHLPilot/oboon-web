export type SectionStatus = "none" | "partial" | "full";

export type PropertyRow = {
  id: number;
  created_by?: string | null;
  name: string;
  property_type: string | null;
  status: string | null;
  description: string | null;
  image_url: string | null;
  confirmed_comment: string | null;
  estimated_comment: string | null;
};

type RelationRow = { id: number };

type SpecsRow = {
  id: number;
  sale_type?: string | null;
  trust_company?: string | null;
  developer?: string | null;
  builder?: string | null;
  site_area?: number | null;
  building_area?: number | null;
  building_coverage_ratio?: number | null;
  floor_area_ratio?: number | null;
  floor_ground?: number | null;
  floor_underground?: number | null;
  building_count?: number | null;
  household_total?: number | null;
  parking_total?: number | null;
  parking_per_household?: number | null;
  heating_type?: string | null;
  amenities?: string | null;
};

type TimelineRow = {
  id: number;
  announcement_date?: string | null;
  application_start?: string | null;
  application_end?: string | null;
  winner_announce?: string | null;
  contract_start?: string | null;
  contract_end?: string | null;
  move_in_date?: string | null;
  move_in_text?: string | null;
};

export type PropertyDetail = PropertyRow & {
  property_locations?: RelationRow[] | null;
  property_facilities?: RelationRow[] | null;
  property_specs?: SpecsRow | SpecsRow[] | null;
  property_timeline?: TimelineRow | TimelineRow[] | null;
  property_unit_types?: RelationRow[] | null;
};

export type PropertyBasicForm = Pick<
  PropertyRow,
  "name" | "property_type" | "status" | "description" | "image_url"
>;

export type PropertyBasicViewData = Pick<
  PropertyRow,
  "name" | "property_type" | "description" | "image_url"
>;
