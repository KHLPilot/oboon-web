// app/company/properties/[id]/units/validation.ts

import { validateRequired } from "@/shared/validationMessage";

export type UnitDraftLike = {
  type_name?: string | null;
  exclusive_area?: number | null;
  supply_area?: number | null;
  rooms?: number | null;
  bathrooms?: number | null;
  price_min?: number | null;
  price_max?: number | null;
};

export function validateUnitDraft(draft: UnitDraftLike) {
  const fieldErrors: Record<string, string> = {};

  // ?꾩닔: type_name
  const typeNameRequiredError = validateRequired(
    draft.type_name ?? "",
    "평면 타입명"
  );
  if (typeNameRequiredError) {
    fieldErrors.type_name = typeNameRequiredError;
  }

  // (?좏깮) 媛寃?min/max 愿怨?寃利?
  if (
    draft.price_min != null &&
    draft.price_max != null &&
    draft.price_min > draft.price_max
  ) {
    fieldErrors.price_max = "媛寃??곹븳? 媛寃??섑븳蹂대떎 ?ш굅??媛숈븘???댁슂.";
  }

  return {
    ok: Object.keys(fieldErrors).length === 0,
    fieldErrors,
  };
}
