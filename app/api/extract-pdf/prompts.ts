import type { PropertyExtractionData } from "@/lib/schema/property-schema";

type ExtractionMode = "single" | "multi";

export const systemPrompt = `너는 대한민국 분양 관련 PDF 묶음(모집공고문, 브리핑북, 리플렛, 옵션표, 교육자료 등)에서 정형 데이터를 추출하는 전문가다.

## 규칙
1. PDF 텍스트와 **이미지 모두**에서 정보를 추출하라.
2. **이미지에서 해석 가능한 정보는 값으로 취급**한다.
   - 평면도 이미지 → 방 개수(rooms), 화장실 개수(bathrooms) 추출
   - 조감도 이미지 → 건물 외관, 층수 참고
   - 위치도/배치도 이미지 → 주변 시설, 동 배치 참고
3. 텍스트에 명시되지 않았더라도 이미지에서 명확히 확인 가능하면 추출하라.
4. 표(테이블) 내부 셀 값도 반드시 읽어라.
   - "사업주체(시행사) / 시공사(시공자)" 표가 있으면 "회사명/상호" 행을 최우선 근거로 사용하라.
   - 주소/법인등록번호/전화번호를 회사명으로 오인하지 마라.

5. 여러 문서 간 값이 충돌하면, 신뢰 우선순위를 적용하라.
   - 우선순위: 모집공고문 > 브리핑북 > 리플렛/옵션표/교육자료
   - 동일 우선순위에서는 더 구체적인 수치/날짜가 있는 값을 우선한다.
6. 텍스트/이미지에 없거나 불명확한 값은 제공된 web_context(외부 검색 결과)가 있으면 참고해 보완할 수 있다.
7. web_context로 보완한 필드는 web_evidence에 field_path, source_url, source_snippet, confidence(0~1)를 기록하라.
8. 문서 근거와 web_context가 충돌하면 문서 근거를 우선한다.
9. web_context 근거가 없거나 상충하면 추측하지 말고 null로 반환하라.
10. 숫자는 반드시 숫자 타입으로 반환하라 (문자열 금지).
11. 면적은 m2(제곱미터) 단위 숫자로 통일하라.
12. 분양가는 만원 단위 숫자로 반환하라. (예: 5억 3천만원 → 53000)
13. 날짜는 YYYY-MM-DD 형식으로 반환하라. (예: 2025.03.15 → 2025-03-15)
14. 입주 예정일(move_in_date)은 정확한 날짜가 없으면 텍스트 그대로 반환하라. (예: "2027년 3월 예정")
15. facilities.open_start/open_end는 운영 시작일/종료일로 추출하라. 월 단위만 확인되면 YYYY-MM, 일자까지 확인되면 YYYY-MM-DD로 반환하라.

## 분양 상태(status) 판단 기준
- 모집공고 전이거나 청약접수 전이면: "READY"
- 청약접수 중이거나 계약 진행 중이면: "OPEN"
- 계약 종료 후이거나 입주 완료이면: "CLOSED"
- 판단 불가하면: null

## 추출 대상 필드 안내
- properties.name: 단지명/현장명 (예: "힐스테이트 OO", "더샵 OO")
- properties.property_type: "아파트", "오피스텔", "주상복합", "상업시설" 등
- properties.status: 분양 상태 (READY / OPEN / CLOSED)
- location: 소재지 주소에서 도로명/지번/행정구역 분리
- specs.developer: 시행사 / 사업주체
- specs.builder: 시공사
- specs.trust_company: 신탁사 / 관리형 신탁사
- timeline: 모집공고일, 청약접수 시작/마감, 당첨자발표, 계약 시작/종료, 입주 예정
- unit_types: 주택형(타입)별 면적, 세대수, 분양가 (최소~최대를 만원 단위로)
  - unit_count는 해당 타입의 총공급 세대수
  - supply_count는 해당 타입의 일반공급 세대수
- facilities: 모델하우스/홍보관/견본주택 정보 (유형, 명칭, 주소, 상세주소, 운영 시작일/종료일)
- validation.contract_ratio: 계약금 비율(예: 10% -> 0.1)
- validation.transfer_restriction: 전매 제한 여부(있음=true, 없음=false, 불명확=null)
- validation.transfer_restriction_period: 전매 제한 기간 텍스트(예: 6개월, 1년, 소유권이전등기시)
- web_evidence: web_context로 보완한 필드의 근거 URL/스니펫/신뢰도 목록`;

export function buildPhase1ExtractionText(
  extractionMode: ExtractionMode,
  inputFileCount: number,
  extractedText: string,
) {
  return (
    (extractionMode === "single"
      ? "다음은 단일 PDF에서 추출한 정보다. 문서 내부 텍스트/표/이미지를 최대한 활용해 정형 데이터를 추출하라.\n\n"
      : `다음은 동일 분양 현장의 PDF ${inputFileCount}개(문서 유형 혼합)에서 추출한 정보다. 문서별 신뢰 우선순위를 반영하여 하나의 정형 데이터로 통합하라.\n\n`) +
    extractedText
  );
}

export function buildCompanyRescueText(
  extractionMode: ExtractionMode,
  extractedText: string,
) {
  return (
    (extractionMode === "single"
      ? '아래 단일 문서에서 "사업주체(시행사)"와 "시공사(시공자)"의 회사명만 추출하라.\n'
      : '아래 분양 관련 문서 묶음에서 "사업주체(시행사)"와 "시공사(시공자)"의 회사명만 추출하라.\n') +
    '- 표(테이블) 구조가 있으면 반드시 "회사명/상호" 행을 우선으로 판독하라.\n' +
    "- 주소, 법인등록번호, 전화번호, 기타 설명 문구는 절대 회사명으로 반환하지 마라.\n" +
    '- 회사명은 원문 표기(예: "주식회사 엘앤피개발", "효성중공업 주식회사")를 유지하라.\n\n' +
    `[document_text]\n${extractedText}`
  );
}

export function buildSpecsSupplementText(
  extractedText: string,
  specs: PropertyExtractionData["specs"],
) {
  return (
    "다음 이미지/문서에서 표를 읽어 specs 필드를 추출하라: 대지면적(site_area), 건축면적(building_area), 용적률(floor_area_ratio), 건폐율(building_coverage_ratio), 총주차대수(parking_total), 세대당주차(parking_per_household), 난방방식(heating_type).\n" +
    "규칙:\n" +
    "- 표/본문에서 명확히 확인되는 숫자만 반환하고, 불명확하면 null.\n" +
    "- 면적은 m2 기준 숫자, 비율은 % 숫자만 반환(단위 기호는 제외).\n" +
    "- 추측 금지.\n\n" +
    `[document_text]\n${extractedText}\n\n` +
    `[current_specs]\n${JSON.stringify(specs)}`
  );
}

export function buildTimelineSupplementText(
  extractedText: string,
  timeline: PropertyExtractionData["timeline"],
) {
  return (
    "다음 이미지/문서에서 일정 표를 읽어 timeline 필드를 추출하라: announcement_date, application_start, application_end, winner_announce, contract_start, contract_end.\n" +
    "규칙:\n" +
    "- 날짜 형식은 반드시 YYYY-MM-DD.\n" +
    "- 불명확하면 null.\n" +
    "- 추측 금지.\n\n" +
    `[document_text]\n${extractedText}\n\n` +
    `[current_timeline]\n${JSON.stringify(timeline)}`
  );
}

export function buildValidationSupplementText(
  extractedText: string,
  validation: PropertyExtractionData["validation"],
) {
  return (
    "다음 이미지/문서에서 검증 관련 값을 추출하라: contract_ratio(0~1), transfer_restriction(boolean), transfer_restriction_period(string).\n" +
    "규칙:\n" +
    "- contract_ratio는 10%면 0.1로 반환.\n" +
    "- 전매제한이 없으면 transfer_restriction=false, period='없음'.\n" +
    "- 전매제한 기간이 확인되면 transfer_restriction=true.\n" +
    "- 불명확하면 null.\n\n" +
    `[document_text]\n${extractedText}\n\n` +
    `[current_validation]\n${JSON.stringify(validation)}`
  );
}

export function buildUnitSupplementText(
  extractedText: string,
  unitTypes: PropertyExtractionData["unit_types"],
) {
  return (
    "다음 이미지/문서에서 주택형별 방/욕실 수를 추출하라.\n" +
    "반환 형식은 unit_types 배열이며 각 원소는 type_name, rooms, bathrooms만 포함하라.\n" +
    "규칙:\n" +
    "- type_name은 현재 타입명과 동일하게 맞춰라(예: 84A, 84B).\n" +
    "- 불명확하면 null.\n\n" +
    `[document_text]\n${extractedText}\n\n` +
    `[current_unit_types]\n${JSON.stringify(
      unitTypes.map((unit) => ({
        type_name: unit.type_name,
        rooms: unit.rooms,
        bathrooms: unit.bathrooms,
      })),
    )}`
  );
}

export function buildWebRefinementText(args: {
  extractionResult: PropertyExtractionData;
  missingFieldPaths: string[];
  webContextText: string;
  extractedText: string;
}) {
  const { extractionResult, missingFieldPaths, webContextText, extractedText } =
    args;
  return (
    "다음은 1차 문서 추출 결과다. 문서 근거를 우선 유지하고, 문서에 없거나 불명확한 값만 web_context로 보완하라.\n\n" +
    `[first_pass_json]\n${JSON.stringify(extractionResult)}\n\n` +
    `[required_web_evidence_field_paths]\n${missingFieldPaths.join(", ")}\n\n` +
    `${webContextText}\n\n` +
    "반드시 지켜라:\n" +
    "1) required_web_evidence_field_paths에 포함된 필드를 web_context로 채웠다면, 같은 field_path로 web_evidence를 반드시 1건 이상 기록하라.\n" +
    "2) web_context를 사용하지 않은 필드는 web_evidence에 넣지 마라.\n" +
    "3) 근거 URL이 불명확하면 값을 채우지 말고 null을 유지하라.\n\n" +
    `[document_text]\n${extractedText}`
  );
}
