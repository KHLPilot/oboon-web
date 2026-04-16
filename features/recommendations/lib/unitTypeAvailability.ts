import type { FinalGrade5 } from "@/features/condition-validation/domain/types";
import type { RecommendationUnitType } from "./recommendationUnitTypes";

export function isPositiveGrade(grade: FinalGrade5) {
  return grade === "GREEN" || grade === "LIME";
}

export function isAvailableUnit(unit: RecommendationUnitType) {
  if (!isPositiveGrade(unit.finalGrade)) return false;
  if (unit.categories.length === 0) return true;
  return unit.categories.every((category) => isPositiveGrade(category.grade));
}

export function getAvailableUnitTypes(units: RecommendationUnitType[]) {
  return units.filter(isAvailableUnit);
}
