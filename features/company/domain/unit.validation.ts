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

  // 필수: type_name
  const typeNameRequiredError = validateRequired(
    draft.type_name ?? "",
    "평면 타입명",
  );
  if (typeNameRequiredError) {
    fieldErrors.type_name = typeNameRequiredError;
  }

  // 가격 min/max 관계 검증
  if (
    draft.price_min != null &&
    draft.price_max != null &&
    draft.price_min > draft.price_max
  ) {
    fieldErrors.price_max =
      "가격 상한은 가격 하한보다 작거나 같을 수 없습니다.";
  }

  return {
    ok: Object.keys(fieldErrors).length === 0,
    fieldErrors,
  };
}
