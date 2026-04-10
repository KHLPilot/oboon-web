import assert from "node:assert/strict";
import test from "node:test";

import { scorePurposeMatch } from "../features/condition-validation/domain/purposeMatchScoring.ts";

test("residence and investment scores can diverge by property profile", () => {
  const result = scorePurposeMatch({
    property: {
      propertyType: "아파트",
      rooms: 3,
      bathrooms: 2,
      exclusiveArea: 84.91,
      parkingPerHousehold: 1.2,
      householdTotal: 1200,
      heatingType: "지역난방",
      amenities: "피트니스, 어린이집, 작은도서관",
      floorAreaRatio: 180,
      buildingCoverageRatio: 18,
      moveInDate: "2027-03",
      saleType: "일반분양",
      developer: "대형 시행사",
      builder: "대형 시공사",
      regulationArea: "non_regulated",
      transferRestriction: false,
      transferRestrictionPeriod: null,
      contractRatio: 0.1,
    },
    purpose: "investment",
  });

  assert.ok(result.residenceFitScore >= 0);
  assert.ok(result.investmentFitScore >= 0);
  assert.notEqual(result.residenceFitScore, result.investmentFitScore);
});

test("investment score falls when transfer restriction is present", () => {
  const restricted = scorePurposeMatch({
    property: {
      propertyType: "오피스텔",
      rooms: 1,
      bathrooms: 1,
      exclusiveArea: 22.3,
      parkingPerHousehold: 0.4,
      householdTotal: 120,
      heatingType: "개별난방",
      amenities: "공용라운지",
      floorAreaRatio: 650,
      buildingCoverageRatio: 60,
      moveInDate: "2027-10",
      saleType: "일반분양",
      developer: null,
      builder: null,
      regulationArea: "adjustment_target",
      transferRestriction: true,
      transferRestrictionPeriod: "1년",
      contractRatio: 0.2,
    },
    purpose: "investment",
  });

  const unrestricted = scorePurposeMatch({
    property: {
      propertyType: "오피스텔",
      rooms: 1,
      bathrooms: 1,
      exclusiveArea: 22.3,
      parkingPerHousehold: 0.4,
      householdTotal: 120,
      heatingType: "개별난방",
      amenities: "공용라운지",
      floorAreaRatio: 650,
      buildingCoverageRatio: 60,
      moveInDate: "2027-10",
      saleType: "일반분양",
      developer: null,
      builder: null,
      regulationArea: "adjustment_target",
      transferRestriction: false,
      transferRestrictionPeriod: null,
      contractRatio: 0.2,
    },
    purpose: "investment",
  });

  assert.ok(unrestricted.investmentFitScore > restricted.investmentFitScore);
  assert.match(restricted.reason, /전매 제약/);
});

test("residence reason is explanation-first, not a raw label", () => {
  const result = scorePurposeMatch({
    property: {
      propertyType: "아파트",
      rooms: 4,
      bathrooms: 2,
      exclusiveArea: 84.91,
      parkingPerHousehold: 1.3,
      householdTotal: 900,
      heatingType: "지역난방",
      amenities: "피트니스, 어린이집",
      floorAreaRatio: 170,
      buildingCoverageRatio: 19,
      moveInDate: "2027-01",
      saleType: "일반분양",
      developer: "시행사",
      builder: "시공사",
      regulationArea: "non_regulated",
      transferRestriction: false,
      transferRestrictionPeriod: null,
      contractRatio: 0.1,
    },
    purpose: "residence",
  });

  assert.notEqual(result.reason, "실거주");
  assert.match(result.reason, /실거주|거주/);
});
