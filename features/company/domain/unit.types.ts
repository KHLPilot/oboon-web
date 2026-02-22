// app/company/properties/[id]/units/types.ts

export type UnitRow = {
  id: number;
  created_at?: string | null;

  properties_id: number;

  type_name: string | null;
  exclusive_area: number | null;
  supply_area: number | null;

  rooms: number | null;
  bathrooms: number | null;

  building_layout: string | null;
  orientation: string | null;

  price_min: number | null;
  price_max: number | null;
  is_price_public: boolean;
  is_public: boolean;

  unit_count: number | null;
  supply_count: number | null;

  floor_plan_url: string | null;
  image_url: string | null;
  sort_order: number | null;
};

export type UnitDraft = Omit<UnitRow, "id" | "created_at">;

export type UnitStatus = "미입력" | "입력 중" | "완료";
