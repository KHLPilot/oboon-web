import { z } from 'zod';

// properties 테이블
const propertiesSchema = z.object({
  name: z.string().describe("분양 현장명/단지명 (예: 힐스테이트 광안)"),
  property_type: z.string().nullable().describe("분양 유형 (예: 아파트, 오피스텔, 상업시설, 주상복합)"),
  status: z.enum(["READY", "OPEN", "CLOSED"]).nullable().describe("분양 상태: READY(분양 예정), OPEN(분양 중), CLOSED(분양 종료). 모집공고 전이면 READY, 청약접수 중이면 OPEN, 계약 종료 후면 CLOSED"),
  description: z.string().nullable().describe("현장에 대한 간단 설명/특징"),
});

// property_locations 테이블
const propertyLocationSchema = z.object({
  road_address: z.string().nullable().describe("도로명 주소"),
  jibun_address: z.string().nullable().describe("지번 주소"),
  region_1depth: z.string().nullable().describe("시/도 (예: 서울특별시, 경기도)"),
  region_2depth: z.string().nullable().describe("시/군/구 (예: 강남구, 성남시)"),
  region_3depth: z.string().nullable().describe("읍/면/동 (예: 역삼동)"),
});

// property_specs 테이블
const propertySpecsSchema = z.object({
  developer: z.string().nullable().describe("시행사/사업주체 명칭"),
  builder: z.string().nullable().describe("시공사 명칭"),
  trust_company: z.string().nullable().describe("신탁사 명칭"),
  sale_type: z.string().nullable().describe("분양 방식 (예: 일반분양, 후분양)"),
  land_use_zone: z.string().nullable().describe("용도지역 (예: 제3종일반주거지역, 준주거지역)"),
  site_area: z.number().nullable().describe("대지면적 (m2)"),
  building_area: z.number().nullable().describe("건축면적 (m2)"),
  floor_ground: z.number().nullable().describe("지상 층수"),
  floor_underground: z.number().nullable().describe("지하 층수"),
  building_count: z.number().nullable().describe("건물/동 수"),
  household_total: z.number().nullable().describe("총 세대수/호수"),
  parking_total: z.number().nullable().describe("총 주차 대수"),
  parking_per_household: z.number().nullable().describe("세대당 주차 대수"),
  heating_type: z.string().nullable().describe("난방 방식 (예: 개별난방, 지역난방)"),
  amenities: z.string().nullable().describe("부대시설/편의시설 목록"),
  floor_area_ratio: z.number().nullable().describe("용적률 (%)"),
  building_coverage_ratio: z.number().nullable().describe("건폐율 (%)"),
});

// property_timeline 테이블 (고정 날짜 필드)
const propertyTimelineSchema = z.object({
  announcement_date: z.string().nullable().describe("모집공고일 (YYYY-MM-DD)"),
  application_start: z.string().nullable().describe("청약 접수 시작일 (YYYY-MM-DD)"),
  application_end: z.string().nullable().describe("청약 접수 마감일 (YYYY-MM-DD)"),
  winner_announce: z.string().nullable().describe("당첨자 발표일 (YYYY-MM-DD)"),
  contract_start: z.string().nullable().describe("계약 시작일 (YYYY-MM-DD)"),
  contract_end: z.string().nullable().describe("계약 종료일 (YYYY-MM-DD)"),
  move_in_date: z.string().nullable().describe("입주 예정일/시기 (예: 2027년 3월 예정)"),
});

// property_unit_types 테이블
const propertyUnitTypeSchema = z.object({
  type_name: z.string().describe("타입명 (예: 84A, 59B)"),
  exclusive_area: z.number().nullable().describe("전용면적 (m2)"),
  supply_area: z.number().nullable().describe("공급면적 (m2)"),
  rooms: z.number().nullable().describe("방 수"),
  bathrooms: z.number().nullable().describe("욕실 수"),
  price_min: z.number().nullable().describe("최소 분양가 (만원 단위)"),
  price_max: z.number().nullable().describe("최대 분양가 (만원 단위)"),
  unit_count: z.number().nullable().describe("해당 타입 세대수"),
});

// property_facilities 테이블 (홍보시설/모델하우스)
const propertyFacilitySchema = z.object({
  type: z.string().describe("시설 유형 (예: 모델하우스, 홍보관, 견본주택)"),
  name: z.string().describe("시설 명칭 (예: OO 모델하우스)"),
  road_address: z.string().nullable().describe("시설 도로명 주소"),
  open_start: z.string().nullable().describe("운영 시작시간 (예: 10:00)"),
  open_end: z.string().nullable().describe("운영 종료시간 (예: 18:00)"),
});

// Phase 1: 텍스트 + 이미지 기반 속성 추출 (이미지 분류 없음)
export const propertyExtractionSchema = z.object({
  properties: propertiesSchema,
  location: propertyLocationSchema,
  specs: propertySpecsSchema,
  timeline: propertyTimelineSchema,
  unit_types: z.array(propertyUnitTypeSchema),
  facilities: z.array(propertyFacilitySchema),
});

export type PropertyExtractionData = z.infer<typeof propertyExtractionSchema>;

// Phase 2: 이미지 분류 전용 스키마 (별도 Gemini 호출)
const imageClassificationItemSchema = z.object({
  imageIndex: z.number().describe("이미지 순서 번호 (0부터 시작)"),
  type: z.enum(["building", "floor_plan", "other"]).describe(
    "이미지 유형: building(건물 외관/렌더/조감도/실사/투시도), floor_plan(평면도/단위세대 도면/층별 배치도), other(로고/지도/표/장식 등 불필요)"
  ),
});

export const imageClassificationResultSchema = z.object({
  classifications: z.array(imageClassificationItemSchema).max(40).describe(
    "첨부된 각 이미지의 유형을 분류하라. 건물 외관/렌더/조감도는 building, 평면도/단위세대 도면은 floor_plan, 그 외(로고/지도/표/장식)는 other"
  ),
});
