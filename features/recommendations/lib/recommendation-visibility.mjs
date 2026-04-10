export function isRecommendationCategoryVisible(grade) {
  return grade === "GREEN" || grade === "LIME";
}

export function shouldShowRecommendationForCategoryGrades(grades) {
  return grades.length > 0 && grades.every(isRecommendationCategoryVisible);
}

/**
 * @param {{
 *   cash: string;
 *   income: string;
 *   ltvDsr?: string | null;
 *   credit?: string | null;
 *   ownership: string;
 *   purpose?: string | null;
 *   timing?: string | null;
 * }} params
 */
export function shouldShowRecommendationForPropertyListing({
  cash,
  income,
  ltvDsr,
  credit,
  ownership,
  purpose: _purpose,
  timing,
}) {
  return shouldShowRecommendationForCategoryGrades([
    cash,
    income,
    ltvDsr ?? credit,
    ownership,
    timing,
  ]);
}

/**
 * @param {{
 *   cash: string;
 *   income: string;
 *   ltvDsr?: string | null;
 *   credit?: string | null;
 *   ownership: string;
 *   purpose?: string | null;
 *   timing?: string | null;
 * }} params
 */
export function shouldShowMatchedRecommendationForPropertyListing({
  cash,
  income,
  ltvDsr,
  credit,
  ownership,
  purpose,
  timing,
}) {
  return shouldShowRecommendationForCategoryGrades([
    cash,
    income,
    ltvDsr ?? credit,
    ownership,
    purpose,
    timing,
  ]);
}

/**
 * 카테고리 등급 배열로 현장 분류를 결정한다.
 *
 * - "primary"     : 모든 카테고리가 GREEN 또는 LIME
 * - "alternative" : 정확히 1개만 YELLOW이고, ORANGE/RED 없음
 * - "excluded"    : YELLOW 2개 이상, 또는 ORANGE/RED 하나라도 있음
 *
 * @param {string[]} grades
 * @returns {"primary" | "alternative" | "excluded"}
 */
export function classifyRecommendation(grades) {
  const hasOrangeOrRed = grades.some(
    (g) => g === "ORANGE" || g === "RED",
  );
  if (hasOrangeOrRed) return "excluded";

  const yellowCount = grades.filter((g) => g === "YELLOW").length;
  if (yellowCount === 0) return "primary";
  if (yellowCount === 1) return "alternative";
  return "excluded";
}

/**
 * @param {{
 *   cash: string;
 *   income: string;
 *   ltvDsr?: string | null;
 *   credit?: string | null;
 *   ownership: string;
 *   purpose?: string | null;
 *   timing?: string | null;
 * }} params
 */
export function classifyRecommendationForPropertyListing({
  cash,
  income,
  ltvDsr,
  credit,
  ownership,
  purpose: _purpose,
  timing,
}) {
  return classifyRecommendation([
    cash,
    income,
    ltvDsr ?? credit,
    ownership,
    timing,
  ]);
}
