import type {
  FullPurchasePurpose,
  PropertyValidationProfile,
} from "./types";

type PurposeMatchProperty = Pick<
  PropertyValidationProfile,
  | "propertyType"
  | "rooms"
  | "bathrooms"
  | "exclusiveArea"
  | "parkingPerHousehold"
  | "householdTotal"
  | "heatingType"
  | "amenities"
  | "floorAreaRatio"
  | "buildingCoverageRatio"
  | "moveInDate"
  | "saleType"
  | "developer"
  | "builder"
  | "regulationArea"
  | "transferRestriction"
  | "transferRestrictionPeriod"
  | "contractRatio"
>;

export type PurposeMatchInput = {
  property: PurposeMatchProperty;
  purpose?: FullPurchasePurpose | "both" | null;
};

export type PurposeMatchResult = {
  residenceFitScore: number;
  investmentFitScore: number;
  confidence: number;
  reason: string;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").toLowerCase().replace(/\s+/g, "");
}

function hasText(value: string | null | undefined): boolean {
  return normalizeText(value).length > 0;
}

function scorePropertyType(propertyType: string | null): number {
  const normalized = normalizeText(propertyType);
  if (!normalized) return 8;
  if (normalized.includes("아파트")) return 20;
  if (normalized.includes("오피스텔")) return 15;
  if (normalized.includes("주상복합")) return 14;
  if (normalized.includes("지식산업")) return 2;
  if (normalized.includes("상가") || normalized.includes("상업")) return 0;
  return 10;
}

function scoreUnitConfiguration(params: {
  rooms: number | null;
  bathrooms: number | null;
  exclusiveArea: number | null;
}): number {
  const { rooms, bathrooms, exclusiveArea } = params;
  let score = 0;

  if (rooms != null) {
    if (rooms >= 3) score += 10;
    else if (rooms === 2) score += 7;
    else if (rooms === 1) score += 4;
  } else {
    score += 3;
  }

  if (bathrooms != null) {
    if (bathrooms >= 2) score += 8;
    else if (bathrooms === 1) score += 5;
  } else {
    score += 2;
  }

  if (exclusiveArea != null) {
    if (exclusiveArea >= 59 && exclusiveArea <= 95) score += 7;
    else if (exclusiveArea >= 35 && exclusiveArea < 59) score += 5;
    else if (exclusiveArea > 95 && exclusiveArea <= 120) score += 4;
    else if (exclusiveArea < 35) score += 1;
    else score += 3;
  } else {
    score += 2;
  }

  return clamp(score, 0, 25);
}

function scoreParking(parkingPerHousehold: number | null): number {
  if (parkingPerHousehold == null) return 4;
  if (parkingPerHousehold >= 1.2) return 15;
  if (parkingPerHousehold >= 1.0) return 12;
  if (parkingPerHousehold >= 0.8) return 9;
  if (parkingPerHousehold >= 0.5) return 5;
  return 2;
}

function scoreAmenities(amenities: string | null): number {
  const normalized = normalizeText(amenities);
  if (!normalized) return 4;

  let score = 5;
  const keywords = [
    "피트니스",
    "휘트니스",
    "어린이집",
    "작은도서관",
    "독서실",
    "커뮤니티",
    "라운지",
    "공원",
    "수영장",
    "골프",
  ];
  for (const keyword of keywords) {
    if (normalized.includes(normalizeText(keyword))) score += 1.5;
  }

  return clamp(Math.round(score), 0, 15);
}

function scoreDensity(params: {
  floorAreaRatio: number | null;
  buildingCoverageRatio: number | null;
  householdTotal: number | null;
}): number {
  const { floorAreaRatio, buildingCoverageRatio, householdTotal } = params;
  let score = 0;

  if (floorAreaRatio != null) {
    if (floorAreaRatio <= 180) score += 8;
    else if (floorAreaRatio <= 220) score += 6;
    else if (floorAreaRatio <= 280) score += 3;
    else score += 1;
  } else {
    score += 3;
  }

  if (buildingCoverageRatio != null) {
    if (buildingCoverageRatio <= 20) score += 5;
    else if (buildingCoverageRatio <= 30) score += 4;
    else if (buildingCoverageRatio <= 40) score += 2;
    else score += 0;
  } else {
    score += 2;
  }

  if (householdTotal != null) {
    if (householdTotal >= 500) score += 4;
    else if (householdTotal >= 200) score += 3;
    else if (householdTotal >= 80) score += 2;
    else score += 1;
  } else {
    score += 1;
  }

  return clamp(score, 0, 20);
}

function scoreMoveInTiming(moveInDate: string | null): number {
  if (!moveInDate) return 4;
  const yearMatch = moveInDate.match(/(\d{4})/);
  const monthMatch = moveInDate.match(/(\d{1,2})(?=\D*$)/);
  if (!yearMatch) return 4;

  const year = Number(yearMatch[1]);
  const month = monthMatch ? Number(monthMatch[1]) : 1;
  if (!Number.isFinite(year) || year <= 0) return 4;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const diffMonths = (year - currentYear) * 12 + (month - currentMonth);

  if (diffMonths <= 6) return 10;
  if (diffMonths <= 12) return 8;
  if (diffMonths <= 24) return 5;
  if (diffMonths <= 36) return 3;
  return 1;
}

function scoreTransferRestriction(params: {
  transferRestriction: boolean;
  transferRestrictionPeriod: string | null;
}): number {
  const { transferRestriction, transferRestrictionPeriod } = params;
  if (!transferRestriction) return 20;

  const normalized = normalizeText(transferRestrictionPeriod);
  if (!normalized) return 8;
  if (normalized.includes("소유권이전등기")) return 10;
  if (normalized.includes("6개월")) return 12;
  if (normalized.includes("1년")) return 8;
  if (normalized.includes("2년")) return 5;
  return 7;
}

function scoreRegulationArea(regulationArea: PropertyValidationProfile["regulationArea"]): number {
  if (regulationArea === "non_regulated") return 20;
  if (regulationArea === "adjustment_target") return 11;
  return 4;
}

function scoreContractRatio(contractRatio: number | null): number {
  if (contractRatio == null) return 5;
  if (contractRatio <= 0.1) return 15;
  if (contractRatio <= 0.12) return 13;
  if (contractRatio <= 0.15) return 10;
  if (contractRatio <= 0.2) return 6;
  return 2;
}

function scoreSaleType(saleType: string | null): number {
  const normalized = normalizeText(saleType);
  if (!normalized) return 4;
  if (normalized.includes("후분양")) return 9;
  if (normalized.includes("일반분양")) return 8;
  if (normalized.includes("분양")) return 7;
  return 5;
}

function scoreBrandSignal(params: {
  developer: string | null;
  builder: string | null;
}): number {
  const { developer, builder } = params;
  const hasDeveloper = hasText(developer);
  const hasBuilder = hasText(builder);

  if (hasDeveloper && hasBuilder) return 10;
  if (hasDeveloper || hasBuilder) return 6;
  return 2;
}

function scoreScaleAndLiquidity(params: {
  householdTotal: number | null;
  propertyType: string | null;
}): number {
  const { householdTotal, propertyType } = params;
  const normalizedType = normalizeText(propertyType);
  let score = 0;

  if (normalizedType.includes("아파트")) score += 6;
  else if (normalizedType.includes("오피스텔")) score += 4;
  else if (normalizedType.includes("주상복합")) score += 3;
  else if (normalizedType.includes("상가") || normalizedType.includes("상업")) score += 1;
  else score += 2;

  if (householdTotal != null) {
    if (householdTotal >= 500) score += 9;
    else if (householdTotal >= 200) score += 7;
    else if (householdTotal >= 80) score += 4;
    else if (householdTotal >= 30) score += 2;
    else score += 1;
  } else {
    score += 2;
  }

  return clamp(score, 0, 15);
}

export function scorePurposeMatch(input: PurposeMatchInput): PurposeMatchResult {
  const { property } = input;

  const residenceFitScore = clamp(
    scorePropertyType(property.propertyType) +
      scoreUnitConfiguration({
        rooms: property.rooms,
        bathrooms: property.bathrooms,
        exclusiveArea: property.exclusiveArea,
      }) +
      scoreParking(property.parkingPerHousehold) +
      scoreAmenities(property.amenities) +
      scoreDensity({
        floorAreaRatio: property.floorAreaRatio,
        buildingCoverageRatio: property.buildingCoverageRatio,
        householdTotal: property.householdTotal,
      }) +
      scoreMoveInTiming(property.moveInDate),
    0,
    100,
  );

  const investmentFitScore = clamp(
    scoreTransferRestriction({
      transferRestriction: property.transferRestriction,
      transferRestrictionPeriod: property.transferRestrictionPeriod,
    }) +
      scoreRegulationArea(property.regulationArea) +
      scoreContractRatio(property.contractRatio) +
      scoreSaleType(property.saleType) +
      scoreBrandSignal({
        developer: property.developer,
        builder: property.builder,
      }) +
      scoreScaleAndLiquidity({
        householdTotal: property.householdTotal,
        propertyType: property.propertyType,
      }),
    0,
    100,
  );

  const confidenceFields = [
    property.propertyType,
    property.rooms,
    property.bathrooms,
    property.exclusiveArea,
    property.parkingPerHousehold,
    property.householdTotal,
    property.heatingType,
    property.amenities,
    property.floorAreaRatio,
    property.buildingCoverageRatio,
    property.moveInDate,
    property.saleType,
    property.developer,
    property.builder,
    property.regulationArea,
    property.transferRestrictionPeriod,
    property.contractRatio,
  ];
  const presentCount = confidenceFields.filter((value) => {
    if (typeof value === "number") return Number.isFinite(value);
    if (typeof value === "boolean") return true;
    return hasText(value);
  }).length;
  const confidence = Math.round((presentCount / confidenceFields.length) * 100);

  const residenceSignals: Array<[number, string]> = [
    [scorePropertyType(property.propertyType), "주거형 상품성"],
    [scoreUnitConfiguration({
      rooms: property.rooms,
      bathrooms: property.bathrooms,
      exclusiveArea: property.exclusiveArea,
    }), "공간 구성"],
    [scoreParking(property.parkingPerHousehold), "주차"],
    [scoreAmenities(property.amenities), "부대시설"],
    [scoreDensity({
      floorAreaRatio: property.floorAreaRatio,
      buildingCoverageRatio: property.buildingCoverageRatio,
      householdTotal: property.householdTotal,
    }), "밀도"],
    [scoreMoveInTiming(property.moveInDate), "입주 시점"],
  ];
  const investmentSignals: Array<[number, string]> = [
    [scoreTransferRestriction({
      transferRestriction: property.transferRestriction,
      transferRestrictionPeriod: property.transferRestrictionPeriod,
    }), "전매 제약"],
    [scoreRegulationArea(property.regulationArea), "규제 강도"],
    [scoreContractRatio(property.contractRatio), "계약금 비율"],
    [scoreSaleType(property.saleType), "분양 방식"],
    [scoreBrandSignal({ developer: property.developer, builder: property.builder }), "브랜드"],
    [scoreScaleAndLiquidity({
      householdTotal: property.householdTotal,
      propertyType: property.propertyType,
    }), "유동성"],
  ];

  const dominant = residenceFitScore >= investmentFitScore ? "residence" : "investment";
  const strongestResidenceSignal = [...residenceSignals].sort((a, b) => b[0] - a[0])[0];
  const strongestInvestmentSignal = [...investmentSignals].sort((a, b) => b[0] - a[0])[0];

  const residenceReasonTail =
    strongestResidenceSignal?.[1] === "주거형 상품성"
      ? "주거형 상품성이 좋아서"
      : strongestResidenceSignal?.[1] === "공간 구성"
        ? "공간 구성이 좋아서"
        : strongestResidenceSignal?.[1] === "주차"
          ? "주차 여건이 좋아서"
          : strongestResidenceSignal?.[1] === "부대시설"
            ? "부대시설이 좋아서"
            : strongestResidenceSignal?.[1] === "밀도"
              ? "밀도가 과하지 않아"
              : "입주 시점이 무난해서";

  const investmentReasonTail =
    property.transferRestriction
      ? "전매 제약이 있어"
      : property.regulationArea === "non_regulated"
        ? "전매 제약이 적고 규제가 낮아"
        : strongestInvestmentSignal?.[1] === "규제 강도"
          ? "규제 강도가 낮아"
          : strongestInvestmentSignal?.[1] === "계약금 비율"
            ? "계약금 비율이 유리해서"
            : strongestInvestmentSignal?.[1] === "브랜드"
              ? "브랜드 신호가 좋아서"
              : "유동성이 무난해서";

  const reason =
    dominant === "residence"
      ? `이 현장은 실거주 적합도가 더 높아요. ${residenceReasonTail} 거주 목적에 더 잘 맞습니다.`
      : `이 현장은 투자 적합도가 더 높아요. ${investmentReasonTail} 투자 목적에 더 잘 맞습니다.`;

  return {
    residenceFitScore,
    investmentFitScore,
    confidence,
    reason,
  };
}
