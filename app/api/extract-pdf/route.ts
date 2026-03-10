import { google } from '@ai-sdk/google';
import { generateObject, generateText } from 'ai';
import { z } from 'zod';
import {
  propertyExtractionSchema,
  imageClassificationResultSchema,
  type PropertyExtractionData,
} from '@/lib/schema/property-schema';
import { extractImagesFromPDF, renderPagesAsImages, convertImageToBase64 } from '@/lib/pdf-utils';
import { createSupabaseServer } from '@/lib/supabaseServer';
import { DeleteObjectCommand, GetObjectCommand, S3Client } from '@aws-sdk/client-s3';

export const runtime = 'nodejs';
export const maxDuration = 120;

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse');

const MAX_TEXT_LENGTH = 50000;
const MAX_TOTAL_SIZE = 150 * 1024 * 1024; // 150MB
const MAX_MULTIPART_OVERHEAD = 5 * 1024 * 1024; // 5MB
const PHASE1_IMAGE_LIMIT = 8;
const PHASE1_RENDER_PRIORITY_LIMIT = 6;
const COMPANY_RESCUE_RENDER_IMAGE_LIMIT = 6;
const EXTRACTION_TEXT_HEADER_BUDGET = 2400;
const MIN_FILE_TEXT_BUDGET = 1200;
const FILE_TEXT_OVERFLOW_MARKER = '\n\n[... 파일 텍스트 일부 생략 ...]\n\n';
const MAX_PHASE2_CLASSIFICATION_IMAGES = 100;
const MAX_CLASSIFICATION_FALLBACK_IMAGES = 20;
const MAX_WEB_QUERIES = 6;
const MAX_WEB_RESULTS_PER_QUERY = 3;
const MAX_WEB_CONTEXT_CHARS = 6000;
const MAX_TABLE_SUPPLEMENT_IMAGES = 16;
const WEB_EVIDENCE_MIN_CONFIDENCE = 0.55;
const R2_BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME!;

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  },
});

const systemPrompt = `너는 대한민국 분양 관련 PDF 묶음(모집공고문, 브리핑북, 리플렛, 옵션표, 교육자료 등)에서 정형 데이터를 추출하는 전문가다.

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
- facilities: 모델하우스/홍보관/견본주택 정보 (유형, 명칭, 주소, 상세주소, 운영 시작일/종료일)
- validation.contract_ratio: 계약금 비율(예: 10% -> 0.1)
- validation.transfer_restriction: 전매 제한 여부(있음=true, 없음=false, 불명확=null)
- validation.transfer_restriction_period: 전매 제한 기간 텍스트(예: 6개월, 1년, 소유권이전등기시)
- web_evidence: web_context로 보완한 필드의 근거 URL/스니펫/신뢰도 목록`;

function toKoreanErrorMessage(message: string) {
  const raw = message.trim();
  const lower = raw.toLowerCase();

  if (
    lower.includes("quota exceeded") ||
    lower.includes("rate limit") ||
    lower.includes("free_tier_requests") ||
    lower.includes("you exceeded your current quota")
  ) {
    return "오늘 무료 요청 한도(일 20회) 초과로 분석을 진행할 수 없습니다. 한도 리셋 후 다시 시도해주세요.";
  }

  if (lower.includes("timeout") || lower.includes("timed out")) {
    return "AI 응답 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.";
  }

  if (lower.includes("network") || lower.includes("fetch failed")) {
    return "외부 AI 서비스와 통신 중 네트워크 오류가 발생했습니다.";
  }

  return "PDF 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
}

function toHttpStatus(message: string) {
  const lower = message.toLowerCase();
  if (
    lower.includes("quota exceeded") ||
    lower.includes("rate limit") ||
    lower.includes("free_tier_requests") ||
    lower.includes("you exceeded your current quota")
  ) {
    return 429;
  }
  return 500;
}

function extractErrorCode(error: unknown) {
  const candidate = error as {
    name?: unknown;
    code?: unknown;
    Code?: unknown;
  };
  const raw = candidate?.Code ?? candidate?.code ?? candidate?.name;
  return typeof raw === "string" ? raw : "";
}

function toApiError(error: unknown) {
  const message = error instanceof Error ? error.message : "분석 중 오류 발생";
  const lower = message.toLowerCase();
  const code = extractErrorCode(error).toLowerCase();

  if (code === "nosuchkey" || lower.includes("nosuchkey")) {
    return {
      status: 400,
      error: "업로드한 PDF 임시 파일을 찾을 수 없습니다. 다시 업로드 후 재시도해주세요.",
    };
  }

  if (code === "accessdenied" || lower.includes("access denied")) {
    return {
      status: 500,
      error:
        "R2 파일 접근 권한 오류가 발생했습니다. CLOUDFLARE_R2_ACCESS_KEY_ID/SECRET의 Object Read 권한을 확인해주세요.",
    };
  }

  if (
    lower.includes("google_generative_ai_api_key") ||
    lower.includes("missing api key") ||
    lower.includes("api key not valid")
  ) {
    return {
      status: 500,
      error:
        "AI API 키 설정 오류가 발생했습니다. GOOGLE_GENERATIVE_AI_API_KEY 환경변수를 확인해주세요.",
    };
  }

  return {
    status: toHttpStatus(message),
    error: toKoreanErrorMessage(message),
  };
}

type GeoAddressResult = {
  lat: number | null;
  lng: number | null;
  road_address: string | null;
  jibun_address: string | null;
  region_1depth: string | null;
  region_2depth: string | null;
  region_3depth: string | null;
};

type FileProcessMeta = {
  fileName: string;
  sizeBytes: number;
  pages: number | null;
  textLength: number;
  textExtracted: boolean;
  extractedImageCount: number;
  renderedImageCount: number;
};

type ExtractInputFile = {
  fileName: string;
  sizeBytes: number;
  buffer: Buffer;
};

type ExtractPdfJsonBody = {
  fileKeys?: unknown;
  textOnly?: unknown;
  cleanupTempKeys?: unknown;
};

type WebSearchResultItem = {
  query: string;
  title: string;
  url: string;
  snippet: string;
  date: string | null;
};

type WebEvidenceItem = {
  field_path: string;
  source_url: string | null;
  source_snippet: string | null;
  confidence: number | null;
};

type DocumentType =
  | 'announcement'
  | 'briefing'
  | 'leaflet'
  | 'option_sheet'
  | 'education'
  | 'other';

type DocumentProfile = {
  fileName: string;
  documentType: DocumentType;
  pages: number | null;
  textLength: number;
  keywordHits: string[];
};

type ParsedDocument = {
  fileName: string;
  pages: number | null;
  text: string;
  textLength: number;
  documentType: DocumentType;
  keywordHits: string[];
};

type AnalyzedImage = {
  base64: string;
  fileName: string;
  index: number;
  source: 'extract' | 'render';
  pageNum: number | null;
};

const companyInfoSchema = z.object({
  developer: z.string().nullable(),
  builder: z.string().nullable(),
});

const specTableSupplementSchema = z.object({
  site_area: z.number().nullable(),
  building_area: z.number().nullable(),
  floor_area_ratio: z.number().nullable(),
  building_coverage_ratio: z.number().nullable(),
  parking_total: z.number().nullable(),
  parking_per_household: z.number().nullable(),
  heating_type: z.string().nullable(),
});

const timelineTableSupplementSchema = z.object({
  announcement_date: z.string().nullable(),
  application_start: z.string().nullable(),
  application_end: z.string().nullable(),
  winner_announce: z.string().nullable(),
  contract_start: z.string().nullable(),
  contract_end: z.string().nullable(),
});

const validationTableSupplementSchema = z.object({
  contract_ratio: z.number().nullable(),
  transfer_restriction: z.boolean().nullable(),
  transfer_restriction_period: z.string().nullable(),
});

const unitTableSupplementSchema = z.object({
  unit_types: z
    .array(
      z.object({
        type_name: z.string(),
        rooms: z.number().nullable(),
        bathrooms: z.number().nullable(),
      }),
    )
    .default([]),
});

async function streamToBuffer(stream: unknown): Promise<Buffer> {
  if (!stream) return Buffer.alloc(0);
  if (stream instanceof Uint8Array) return Buffer.from(stream);
  if (stream instanceof Blob) return Buffer.from(await stream.arrayBuffer());
  if (typeof stream === 'string') return Buffer.from(stream);
  if (typeof (stream as { transformToByteArray?: unknown }).transformToByteArray === 'function') {
    const bytes = await (stream as { transformToByteArray: () => Promise<Uint8Array> }).transformToByteArray();
    return Buffer.from(bytes);
  }

  const chunks: Uint8Array[] = [];
  for await (const chunk of stream as AsyncIterable<Uint8Array | string | Buffer>) {
    const bytes =
      typeof chunk === 'string'
        ? new TextEncoder().encode(chunk)
        : Uint8Array.from(chunk);
    chunks.push(bytes);
  }
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const merged = new Uint8Array(totalLength);
  let offset = 0;
  chunks.forEach((chunk) => {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  });
  return Buffer.from(merged.buffer, merged.byteOffset, merged.byteLength);
}

function keyToFileName(key: string) {
  const raw = key.split('/').pop() || key;
  const withoutPrefix = raw.replace(/^\d+-[0-9a-f-]+-/, '');
  return decodeURIComponent(withoutPrefix);
}

function parseFileKeys(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((v): v is string => typeof v === 'string')
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
}

function splitRoadAddressAndDetail(raw: string | null | undefined): {
  roadAddress: string | null;
  addressDetail: string | null;
} {
  const value = (raw ?? '').trim().replace(/\s+/g, ' ');
  if (!value) return { roadAddress: null, addressDetail: null };

  // "서울 ... 495, 1층" -> road/detail
  const commaIndex = value.indexOf(',');
  if (commaIndex > 0) {
    const roadAddress = value.slice(0, commaIndex).trim() || null;
    const addressDetail = value.slice(commaIndex + 1).trim() || null;
    return { roadAddress, addressDetail };
  }

  // "서울 ... 495 1층" / "서울 ... 495 B1층" / "서울 ... 495 101호"
  const trailingDetailMatch = value.match(
    /^(.*\d)\s+((?:지하\s*)?B?\d+\s*층(?:\s+.*)?|\d+\s*호(?:\s+.*)?)$/i
  );
  if (trailingDetailMatch) {
    const roadAddress = trailingDetailMatch[1].trim() || null;
    const addressDetail = trailingDetailMatch[2].trim() || null;
    return { roadAddress, addressDetail };
  }

  return { roadAddress: value, addressDetail: null };
}

async function geocodeAddress(address: string): Promise<GeoAddressResult | null> {
  const apiKey = process.env.KAKAO_REST_API_KEY;
  if (!apiKey || !address) return null;

  try {
    const res = await fetch(
      `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(address)}`,
      { headers: { Authorization: `KakaoAK ${apiKey}` } }
    );

    if (!res.ok) return null;

    const json = await res.json();
    if (!json.documents || json.documents.length === 0) return null;

    const doc = json.documents[0];
    const lat = parseFloat(doc.y);
    const lng = parseFloat(doc.x);
    return {
      lat: Number.isFinite(lat) ? lat : null,
      lng: Number.isFinite(lng) ? lng : null,
      road_address: doc.road_address?.address_name ?? null,
      jibun_address: doc.address?.address_name ?? null,
      region_1depth: doc.address?.region_1depth_name ?? null,
      region_2depth: doc.address?.region_2depth_name ?? null,
      region_3depth: doc.address?.region_3depth_name ?? null,
    };
  } catch {
    return null;
  }
}

async function resolveLocationAddresses(input: {
  road_address: string | null | undefined;
  jibun_address: string | null | undefined;
}): Promise<GeoAddressResult | null> {
  const road = input.road_address?.trim() || null;
  const jibun = input.jibun_address?.trim() || null;

  const primaryQuery = road || jibun;
  if (!primaryQuery) return null;

    const primary = await geocodeAddress(primaryQuery);
  if (!primary) return null;

  let roadAddress = road || primary.road_address;
  let jibunAddress = jibun || primary.jibun_address;
  let merged: GeoAddressResult = {
    ...primary,
    road_address: roadAddress,
    jibun_address: jibunAddress,
  };

  // 도로명만 있고 지번이 없거나, 지번만 있고 도로명이 없는 경우
  // 반대 주소를 카카오 주소검색으로 한번 더 보완한다.
  if (!roadAddress && jibunAddress) {
    const fill = await geocodeAddress(jibunAddress);
    if (fill) {
      roadAddress = fill.road_address || roadAddress;
      merged = {
        lat: merged.lat ?? fill.lat,
        lng: merged.lng ?? fill.lng,
        road_address: roadAddress,
        jibun_address: jibunAddress,
        region_1depth: merged.region_1depth || fill.region_1depth,
        region_2depth: merged.region_2depth || fill.region_2depth,
        region_3depth: merged.region_3depth || fill.region_3depth,
      };
    }
  }

  if (!jibunAddress && roadAddress) {
    const fill = await geocodeAddress(roadAddress);
    if (fill) {
      jibunAddress = fill.jibun_address || jibunAddress;
      merged = {
        lat: merged.lat ?? fill.lat,
        lng: merged.lng ?? fill.lng,
        road_address: roadAddress,
        jibun_address: jibunAddress,
        region_1depth: merged.region_1depth || fill.region_1depth,
        region_2depth: merged.region_2depth || fill.region_2depth,
        region_3depth: merged.region_3depth || fill.region_3depth,
      };
    }
  }

  return merged;
}

function isBlank(value: string | null | undefined) {
  return !value || value.trim().length === 0;
}

const COMMON_EXTRACTION_KEYWORDS = [
  '사업주체',
  '시행사',
  '시공사',
  '시공회사',
  '시공자',
  '회사명',
  '상호',
  '신탁사',
  '모집공고',
  '청약',
  '계약',
  '모델하우스',
  '유상옵션',
  '무상옵션',
  '분양가',
  '주택형',
  '오피스텔',
  '아파트',
];

const DOCUMENT_TYPE_KEYWORDS: Record<DocumentType, string[]> = {
  announcement: ['모집공고', '입주자모집공고', '청약홈', '당첨자', '공급규칙'],
  briefing: ['브리핑북', '사업개요', '상품개요', '분양개요', '입지환경'],
  leaflet: ['리플렛', '리플릿', 'leaflet', 'brochure', '브로셔'],
  option_sheet: ['옵션', '유상옵션', '무상옵션', '선택품목', '타입별 옵션'],
  education: ['교육자료', '교육', '가이드', '안내자료', '매뉴얼'],
  other: ['분양', '사업', '공급'],
};

const DOCUMENT_TYPE_PRIORITY: Record<DocumentType, number> = {
  announcement: 5,
  briefing: 4,
  leaflet: 3,
  option_sheet: 2,
  education: 1,
  other: 0,
};

function detectDocumentType(fileName: string, text: string): {
  documentType: DocumentType;
  keywordHits: string[];
} {
  const corpus = `${fileName}\n${text.slice(0, 40000)}`.toLowerCase();
  const scoreByType: Record<DocumentType, number> = {
    announcement: 0,
    briefing: 0,
    leaflet: 0,
    option_sheet: 0,
    education: 0,
    other: 0,
  };
  const keywordHits: string[] = [];

  for (const [type, keywords] of Object.entries(DOCUMENT_TYPE_KEYWORDS) as Array<[DocumentType, string[]]>) {
    for (const keyword of keywords) {
      const lowerKeyword = keyword.toLowerCase();
      if (!corpus.includes(lowerKeyword)) continue;
      scoreByType[type] += fileName.toLowerCase().includes(lowerKeyword) ? 3 : 1;
      keywordHits.push(keyword);
    }
  }

  if (scoreByType.announcement === 0 && /공고/.test(corpus)) {
    scoreByType.announcement += 1;
  }
  if (scoreByType.option_sheet === 0 && /옵션/.test(corpus)) {
    scoreByType.option_sheet += 1;
  }

  let picked: DocumentType = 'other';
  let pickedScore = scoreByType.other;
  for (const type of Object.keys(scoreByType) as DocumentType[]) {
    const score = scoreByType[type];
    if (score > pickedScore) {
      picked = type;
      pickedScore = score;
      continue;
    }
    if (
      score === pickedScore &&
      DOCUMENT_TYPE_PRIORITY[type] > DOCUMENT_TYPE_PRIORITY[picked]
    ) {
      picked = type;
      pickedScore = score;
    }
  }

  return {
    documentType: picked,
    keywordHits: Array.from(new Set(keywordHits)).slice(0, 10),
  };
}

function buildKeywordFocusText(
  rawText: string,
  maxChars: number,
  keywords: string[] = COMMON_EXTRACTION_KEYWORDS,
) {
  if (maxChars <= 0) return '';
  const snippets: string[] = [];
  let totalLength = 0;

  for (const keyword of keywords) {
    let cursor = 0;
    while (totalLength < maxChars) {
      const index = rawText.indexOf(keyword, cursor);
      if (index < 0) break;
      const start = Math.max(0, index - 120);
      const end = Math.min(rawText.length, index + keyword.length + 180);
      const body = rawText.slice(start, end).replace(/\s+/g, ' ').trim();
      cursor = index + keyword.length;
      if (!body) continue;

      const line = `- ${keyword}: ...${body}...\n`;
      if (snippets.includes(line)) continue;
      if (totalLength + line.length > maxChars) {
        return snippets.join('').trim();
      }
      snippets.push(line);
      totalLength += line.length;
      if (snippets.length >= 14) return snippets.join('').trim();
    }
  }

  return snippets.join('').trim();
}

function buildFileTextSnippet(
  rawText: string,
  maxChars: number,
  keywords: string[],
): { text: string; truncated: boolean } {
  if (rawText.length <= maxChars) {
    return { text: rawText, truncated: false };
  }
  if (maxChars <= 0) {
    return { text: '', truncated: rawText.length > 0 };
  }

  const markerChars = FILE_TEXT_OVERFLOW_MARKER.length;
  const headLength = Math.floor(maxChars * 0.4);
  const tailLength = Math.floor(maxChars * 0.35);
  const keywordHeader = '[keyword_focus]\n';
  const keywordFooter = '\n[/keyword_focus]\n';
  const keywordBudget =
    maxChars - headLength - tailLength - markerChars - keywordHeader.length - keywordFooter.length;
  const keywordFocus = buildKeywordFocusText(
    rawText,
    Math.max(0, keywordBudget),
    keywords,
  );

  const parts = [
    rawText.slice(0, headLength),
    FILE_TEXT_OVERFLOW_MARKER,
    keywordFocus ? `${keywordHeader}${keywordFocus}${keywordFooter}` : '',
    rawText.slice(-tailLength),
  ].filter((part) => part.length > 0);
  const merged = parts.join('');
  return {
    text: merged.length > maxChars ? merged.slice(0, maxChars) : merged,
    truncated: true,
  };
}

function buildSingleDocumentExtractionText(
  document: ParsedDocument,
): { text: string; truncated: boolean } {
  const rawText = document.text;
  if (rawText.length <= MAX_TEXT_LENGTH) {
    return { text: rawText, truncated: false };
  }

  const keywords = Array.from(
    new Set([...COMMON_EXTRACTION_KEYWORDS, ...DOCUMENT_TYPE_KEYWORDS[document.documentType]]),
  );
  const headLength = Math.floor(MAX_TEXT_LENGTH * 0.5);
  const tailLength = Math.floor(MAX_TEXT_LENGTH * 0.3);
  const middleMarker = '\n\n[... 문서 중간 일부 생략 ...]\n\n';
  const tailMarker = '\n\n[... 문서 후반부 발췌 ...]\n\n';
  const keywordHeader = '[keyword_focus]\n';
  const keywordFooter = '\n[/keyword_focus]\n\n';
  const keywordBudget =
    MAX_TEXT_LENGTH -
    headLength -
    tailLength -
    middleMarker.length -
    tailMarker.length -
    keywordHeader.length -
    keywordFooter.length;
  const keywordFocus = buildKeywordFocusText(
    rawText,
    Math.max(0, keywordBudget),
    keywords,
  );

  const parts = [
    rawText.slice(0, headLength),
    middleMarker,
    keywordFocus ? `${keywordHeader}${keywordFocus}${keywordFooter}` : '',
    tailMarker,
    rawText.slice(-tailLength),
  ].filter((part) => part.length > 0);

  const merged = parts.join('');
  return {
    text: merged.length > MAX_TEXT_LENGTH ? merged.slice(0, MAX_TEXT_LENGTH) : merged,
    truncated: true,
  };
}

function buildExtractionText(documents: ParsedDocument[]): {
  extractedText: string;
  truncated: boolean;
  documentProfiles: DocumentProfile[];
} {
  const profiles: DocumentProfile[] = documents.map((doc) => ({
    fileName: doc.fileName,
    documentType: doc.documentType,
    pages: doc.pages,
    textLength: doc.textLength,
    keywordHits: doc.keywordHits,
  }));
  if (documents.length === 0) {
    return {
      extractedText: '',
      truncated: false,
      documentProfiles: profiles,
    };
  }

  if (documents.length === 1) {
    const doc = documents[0];
    if (doc.textLength === 0) {
      return {
        extractedText: `[single_document]\nfile: ${doc.fileName}\ntype: ${doc.documentType}\n(텍스트 추출 실패)\n[/single_document]`,
        truncated: false,
        documentProfiles: profiles,
      };
    }
    const single = buildSingleDocumentExtractionText(doc);
    const header = `[single_document]\nfile: ${doc.fileName}\ntype: ${doc.documentType}\n[/single_document]\n\n`;
    const budget = Math.max(0, MAX_TEXT_LENGTH - header.length);
    const body = single.text.length > budget ? single.text.slice(0, budget) : single.text;
    return {
      extractedText: `${header}${body}`,
      truncated: single.truncated || single.text.length > budget,
      documentProfiles: profiles,
    };
  }

  const sortedDocs = [...documents].sort(
    (a, b) =>
      DOCUMENT_TYPE_PRIORITY[b.documentType] - DOCUMENT_TYPE_PRIORITY[a.documentType] ||
      b.textLength - a.textLength,
  );

  const profileLines = ['[document_bundle_profile]'];
  for (const doc of sortedDocs) {
    profileLines.push(
      `- file: ${doc.fileName} | type: ${doc.documentType} | pages: ${doc.pages ?? 'unknown'} | text_length: ${doc.textLength}`,
    );
  }
  profileLines.push('[/document_bundle_profile]');

  const docsWithText = sortedDocs.filter((doc) => doc.textLength > 0);
  const textBudget = Math.max(0, MAX_TEXT_LENGTH - EXTRACTION_TEXT_HEADER_BUDGET);
  const perDocBudget =
    docsWithText.length > 0
      ? Math.max(MIN_FILE_TEXT_BUDGET, Math.floor(textBudget / docsWithText.length))
      : textBudget;

  const sections: string[] = [profileLines.join('\n')];
  let truncated = false;

  for (const doc of sortedDocs) {
    const header = `\n\n[document]\nfile: ${doc.fileName}\ntype: ${doc.documentType}\n`;
    if (doc.textLength === 0) {
      sections.push(`${header}(텍스트 추출 실패)\n[/document]`);
      continue;
    }

    const keywords = Array.from(
      new Set([...COMMON_EXTRACTION_KEYWORDS, ...DOCUMENT_TYPE_KEYWORDS[doc.documentType]]),
    );
    const snippet = buildFileTextSnippet(doc.text, perDocBudget, keywords);
    truncated = truncated || snippet.truncated;
    sections.push(`${header}${snippet.text}\n[/document]`);
  }

  const merged = sections.join('');
  if (merged.length > MAX_TEXT_LENGTH) {
    return {
      extractedText: merged.slice(0, MAX_TEXT_LENGTH),
      truncated: true,
      documentProfiles: profiles,
    };
  }

  return {
    extractedText: merged,
    truncated,
    documentProfiles: profiles,
  };
}

function imageUniqueKey(image: AnalyzedImage) {
  return `${image.fileName}:${image.source}:${image.index}`;
}

function sortFileNamesForSelection(
  fileNames: string[],
  documentProfiles: DocumentProfile[],
): string[] {
  const indexByFile = new Map(fileNames.map((name, index) => [name, index]));
  const typeByFile = new Map(documentProfiles.map((profile) => [profile.fileName, profile.documentType]));
  return [...fileNames].sort(
    (a, b) =>
      DOCUMENT_TYPE_PRIORITY[typeByFile.get(b) ?? 'other'] -
        DOCUMENT_TYPE_PRIORITY[typeByFile.get(a) ?? 'other'] ||
      (indexByFile.get(a) ?? 0) - (indexByFile.get(b) ?? 0),
  );
}

function pickRepresentativeImage(images: AnalyzedImage[]) {
  if (images.length === 0) return null;
  return images[Math.floor(images.length / 2)] ?? images[0];
}

function selectPhase1Images(
  images: AnalyzedImage[],
  documentProfiles: DocumentProfile[],
): AnalyzedImage[] {
  if (images.length <= PHASE1_IMAGE_LIMIT) return images;

  const selected: AnalyzedImage[] = [];
  const seen = new Set<string>();

  const pushUnique = (img: AnalyzedImage | null) => {
    if (!img) return false;
    const key = imageUniqueKey(img);
    if (seen.has(key)) return false;
    seen.add(key);
    selected.push(img);
    return true;
  };

  const fileNames = sortFileNamesForSelection(
    Array.from(new Set(images.map((img) => img.fileName))),
    documentProfiles,
  );

  if (fileNames.length === 1) {
    const fileName = fileNames[0];
    const renderList = images
      .filter((img) => img.fileName === fileName && img.source === 'render')
      .sort((a, b) => (a.pageNum ?? Number.MAX_SAFE_INTEGER) - (b.pageNum ?? Number.MAX_SAFE_INTEGER));
    const extractList = images
      .filter((img) => img.fileName === fileName && img.source === 'extract')
      .sort((a, b) => a.index - b.index);

    const preferred = [
      pickRepresentativeImage(renderList),
      renderList[renderList.length - 1] ?? null,
      renderList[0] ?? null,
      ...[...renderList].slice(0, -1).reverse(),
      ...extractList,
    ];

    for (const candidate of preferred) {
      if (selected.length >= PHASE1_IMAGE_LIMIT) break;
      pushUnique(candidate);
    }

    if (selected.length < PHASE1_IMAGE_LIMIT) {
      for (const image of images) {
        if (selected.length >= PHASE1_IMAGE_LIMIT) break;
        pushUnique(image);
      }
    }
    return selected;
  }

  const renderByFile = new Map<string, AnalyzedImage[]>();
  const extractByFile = new Map<string, AnalyzedImage[]>();

  for (const fileName of fileNames) {
    const fileImages = images.filter((img) => img.fileName === fileName);
    const renderList = fileImages
      .filter((img) => img.source === 'render')
      .sort((a, b) => (a.pageNum ?? Number.MAX_SAFE_INTEGER) - (b.pageNum ?? Number.MAX_SAFE_INTEGER));
    const extractList = fileImages
      .filter((img) => img.source === 'extract')
      .sort((a, b) => a.index - b.index);
    renderByFile.set(fileName, renderList);
    extractByFile.set(fileName, extractList);
  }

  // 파일별 최소 1장 보장
  for (const fileName of fileNames) {
    if (selected.length >= PHASE1_IMAGE_LIMIT) break;
    const renderList = renderByFile.get(fileName) ?? [];
    const extractList = extractByFile.get(fileName) ?? [];
    pushUnique(pickRepresentativeImage(renderList) ?? pickRepresentativeImage(extractList));
  }

  // 렌더 이미지를 우선 보강
  for (const fileName of fileNames) {
    if (selected.length >= PHASE1_IMAGE_LIMIT) break;
    const renderList = renderByFile.get(fileName) ?? [];
    pushUnique(renderList[renderList.length - 1] ?? null);
  }

  // round-robin으로 남은 슬롯 채우기
  let progress = true;
  while (selected.length < PHASE1_IMAGE_LIMIT && progress) {
    progress = false;
    for (const fileName of fileNames) {
      if (selected.length >= PHASE1_IMAGE_LIMIT) break;
      const renderList = renderByFile.get(fileName) ?? [];
      const extractList = extractByFile.get(fileName) ?? [];
      const candidates = [...renderList, ...extractList];
      for (const candidate of candidates) {
        if (selected.length >= PHASE1_IMAGE_LIMIT) break;
        if (pushUnique(candidate)) {
          progress = true;
          break;
        }
      }
    }
  }

  if (selected.length < PHASE1_IMAGE_LIMIT) {
    for (const image of images) {
      if (selected.length >= PHASE1_IMAGE_LIMIT) break;
      pushUnique(image);
    }
  }

  return selected;
}

function selectCompanyRescueImages(
  images: AnalyzedImage[],
  documentProfiles: DocumentProfile[],
): AnalyzedImage[] {
  if (images.length <= COMPANY_RESCUE_RENDER_IMAGE_LIMIT) return images;

  const selected: AnalyzedImage[] = [];
  const seen = new Set<string>();
  const pushUnique = (img: AnalyzedImage | null) => {
    if (!img) return false;
    const key = imageUniqueKey(img);
    if (seen.has(key)) return false;
    seen.add(key);
    selected.push(img);
    return true;
  };

  const fileNames = sortFileNamesForSelection(
    Array.from(new Set(images.map((img) => img.fileName))),
    documentProfiles,
  );

  if (fileNames.length === 1) {
    const fileName = fileNames[0];
    const renderList = images
      .filter((img) => img.fileName === fileName && img.source === 'render')
      .sort((a, b) => (a.pageNum ?? Number.MAX_SAFE_INTEGER) - (b.pageNum ?? Number.MAX_SAFE_INTEGER));
    const extractList = images
      .filter((img) => img.fileName === fileName && img.source === 'extract')
      .sort((a, b) => a.index - b.index);

    for (const image of [...renderList].slice(-COMPANY_RESCUE_RENDER_IMAGE_LIMIT).reverse()) {
      if (selected.length >= COMPANY_RESCUE_RENDER_IMAGE_LIMIT) break;
      pushUnique(image);
    }
    for (const image of [...extractList].reverse()) {
      if (selected.length >= COMPANY_RESCUE_RENDER_IMAGE_LIMIT) break;
      pushUnique(image);
    }
    return selected;
  }

  for (const fileName of fileNames) {
    if (selected.length >= COMPANY_RESCUE_RENDER_IMAGE_LIMIT) break;
    const renderList = images
      .filter((img) => img.fileName === fileName && img.source === 'render')
      .sort((a, b) => (a.pageNum ?? Number.MAX_SAFE_INTEGER) - (b.pageNum ?? Number.MAX_SAFE_INTEGER));
    const extractList = images
      .filter((img) => img.fileName === fileName && img.source === 'extract')
      .sort((a, b) => a.index - b.index);
    pushUnique(renderList[renderList.length - 1] ?? pickRepresentativeImage(renderList) ?? extractList[0] ?? null);
  }

  if (selected.length < COMPANY_RESCUE_RENDER_IMAGE_LIMIT) {
    for (const image of images.filter((img) => img.source === 'render')) {
      if (selected.length >= COMPANY_RESCUE_RENDER_IMAGE_LIMIT) break;
      pushUnique(image);
    }
  }

  if (selected.length < COMPANY_RESCUE_RENDER_IMAGE_LIMIT) {
    for (const image of images) {
      if (selected.length >= COMPANY_RESCUE_RENDER_IMAGE_LIMIT) break;
      pushUnique(image);
    }
  }
  return selected;
}

function sanitizeCompanyNameCandidate(value: string | null | undefined) {
  if (isBlank(value)) return null;
  const cleaned = String(value)
    .replace(/\s+/g, ' ')
    .replace(/^[|/\-•·\s]+/, '')
    .replace(/^(회사명|상호명|상호|법인명)\s*[:：]?\s*/i, '')
    .trim();
  if (!cleaned) return null;
  if (/^\d[\d-]*$/.test(cleaned)) return null;
  const blocked = ['주소', '법인등록번호', '사업자등록번호', '우편번호', '전화', '팩스'];
  if (blocked.some((token) => cleaned.includes(token))) return null;
  return cleaned;
}

function hasMeaningfulValue(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value === 'boolean') return true;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function preferBaseValue<T>(baseValue: T, candidateValue: T): T {
  return hasMeaningfulValue(baseValue) ? baseValue : candidateValue;
}

function normalizeMergeKey(value: string | null | undefined) {
  return String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
}

function mergeExtractionResultPreferBase(
  base: PropertyExtractionData,
  candidate: PropertyExtractionData,
): PropertyExtractionData {
  const mergeRecord = <T extends Record<string, unknown>>(left: T, right: T): T => {
    const output = { ...left } as Record<string, unknown>;
    for (const key of Object.keys(right)) {
      output[key] = preferBaseValue(left[key], right[key]);
    }
    return output as T;
  };

  const mergedUnits = (() => {
    const leftRows = Array.isArray(base.unit_types) ? base.unit_types : [];
    const rightRows = Array.isArray(candidate.unit_types) ? candidate.unit_types : [];
    if (leftRows.length === 0) return rightRows;
    if (rightRows.length === 0) return leftRows;

    const rightByKey = new Map<string, (typeof rightRows)[number]>();
    rightRows.forEach((row, index) => {
      const key = normalizeMergeKey(row.type_name) || `idx:${index}`;
      if (!rightByKey.has(key)) rightByKey.set(key, row);
    });

    const usedRightKeys = new Set<string>();
    const merged = leftRows.map((leftRow, index) => {
      const key = normalizeMergeKey(leftRow.type_name) || `idx:${index}`;
      const matched = rightByKey.get(key) ?? rightRows[index];
      if (!matched) return leftRow;
      usedRightKeys.add(key);
      return mergeRecord(leftRow, matched);
    });

    rightRows.forEach((row, index) => {
      const key = normalizeMergeKey(row.type_name) || `idx:${index}`;
      if (usedRightKeys.has(key)) return;
      merged.push(row);
    });

    return merged;
  })();

  const mergedFacilities = (() => {
    const leftRows = Array.isArray(base.facilities) ? base.facilities : [];
    const rightRows = Array.isArray(candidate.facilities) ? candidate.facilities : [];
    if (leftRows.length === 0) return rightRows;
    if (rightRows.length === 0) return leftRows;

    const rightByKey = new Map<string, (typeof rightRows)[number]>();
    rightRows.forEach((row, index) => {
      const key =
        normalizeMergeKey(row.name) ||
        normalizeMergeKey(row.road_address) ||
        normalizeMergeKey(row.type) ||
        `idx:${index}`;
      if (!rightByKey.has(key)) rightByKey.set(key, row);
    });

    const usedRightKeys = new Set<string>();
    const merged = leftRows.map((leftRow, index) => {
      const key =
        normalizeMergeKey(leftRow.name) ||
        normalizeMergeKey(leftRow.road_address) ||
        normalizeMergeKey(leftRow.type) ||
        `idx:${index}`;
      const matched = rightByKey.get(key) ?? rightRows[index];
      if (!matched) return leftRow;
      usedRightKeys.add(key);
      return mergeRecord(leftRow, matched);
    });

    rightRows.forEach((row, index) => {
      const key =
        normalizeMergeKey(row.name) ||
        normalizeMergeKey(row.road_address) ||
        normalizeMergeKey(row.type) ||
        `idx:${index}`;
      if (usedRightKeys.has(key)) return;
      merged.push(row);
    });

    return merged;
  })();

  const mergedEvidence = normalizeWebEvidence([
    ...(base.web_evidence ?? []),
    ...(candidate.web_evidence ?? []),
  ]);

  return {
    properties: mergeRecord(base.properties, candidate.properties),
    location: mergeRecord(base.location, candidate.location),
    specs: mergeRecord(base.specs, candidate.specs),
    timeline: mergeRecord(base.timeline, candidate.timeline),
    validation: mergeRecord(base.validation, candidate.validation),
    unit_types: mergedUnits,
    facilities: mergedFacilities,
    web_evidence: mergedEvidence,
  };
}

function normalizeCompanyName(value: string | null | undefined) {
  if (isBlank(value)) return null;
  const cleaned = String(value)
    .replace(/\s+/g, ' ')
    .replace(/^[|/\-•·\s]+/, '')
    .replace(/[|/\-•·\s]+$/, '')
    .trim();
  if (!cleaned) return null;
  if (/^\d[\d-]*$/.test(cleaned)) return null;
  const blocked = ['주소', '법인등록번호', '사업자등록번호', '우편번호', '전화', '팩스'];
  if (blocked.some((token) => cleaned.includes(token))) return null;
  return cleaned;
}

function extractDeveloperBuilderFromRawText(rawText: string): {
  developer: string | null;
  builder: string | null;
} {
  const anchorKeywords = ['사업주체 및 시공회사', '사업주체(시행자)', '시공회사(시공자)'];
  const anchorIndex = anchorKeywords
    .map((keyword) => rawText.indexOf(keyword))
    .find((index) => index >= 0);
  if (anchorIndex == null || anchorIndex < 0) {
    return { developer: null, builder: null };
  }

  const section = rawText
    .slice(anchorIndex, anchorIndex + 1800)
    .replace(/\s+/g, ' ')
    .trim();
  const companyLineMatch = section.match(
    /회사명\s*([\s\S]{1,220}?)(?:법인등록번호|대표자|전화번호|$)/,
  );
  if (!companyLineMatch) {
    return { developer: null, builder: null };
  }

  const companyLine = companyLineMatch[1].replace(/\s+/g, ' ').trim();
  let developer: string | null = null;
  let builder: string | null = null;

  const builderSuffixMatch = companyLine.match(
    /([가-힣A-Za-z0-9()&.\-·]{2,}(?:\s+[가-힣A-Za-z0-9()&.\-·]{2,}){0,4}\s*주식회사)\s*$/,
  );
  if (builderSuffixMatch) {
    builder = normalizeCompanyName(builderSuffixMatch[1]);
    const builderRaw = builderSuffixMatch[1];
    const splitIndex = companyLine.lastIndexOf(builderRaw);
    const developerRaw = splitIndex >= 0 ? companyLine.slice(0, splitIndex).trim() : '';
    developer = normalizeCompanyName(developerRaw);
  }

  if (!developer || !builder) {
    const companyMatches = companyLine.match(
      /(?:\(\s*주\s*\)\s*[가-힣A-Za-z0-9()&.\-·]{2,}|주식회사\s*[가-힣A-Za-z0-9()&.\-·]{2,}|[가-힣A-Za-z0-9()&.\-·]{2,}\s*주식회사)/g,
    );
    if (companyMatches && companyMatches.length >= 2) {
      developer = developer ?? normalizeCompanyName(companyMatches[0]);
      builder = builder ?? normalizeCompanyName(companyMatches[1]);
    }
  }

  // pdf-parse가 표의 두 컬럼을 붙여버리는 케이스:
  // 예) "주식회사 엘앤피개발효성중공업 주식회사"
  if ((!developer || !builder) && /^주식회사\s+.+\s+주식회사$/.test(companyLine)) {
    const inner = companyLine
      .replace(/^주식회사\s+/, '')
      .replace(/\s+주식회사$/, '')
      .trim();
    const developerTailKeywords = [
      '개발',
      '홀딩스',
      '자산신탁',
      '신탁',
      '디벨로퍼',
      '도시개발',
      '주택',
    ];
    const builderTailKeywords = [
      '중공업',
      '종합건설',
      '건설',
      '토건',
      '엔지니어링',
      '산업개발',
      '이앤씨',
      '디앤씨',
      'E&C',
      '건영',
      '건업',
      '건축',
    ];

    let splitPos = -1;
    for (const token of developerTailKeywords) {
      const tokenIndex = inner.indexOf(token);
      if (tokenIndex < 0) continue;
      const candidatePos = tokenIndex + token.length;
      if (candidatePos >= inner.length - 2) continue;
      const builderCore = inner.slice(candidatePos).trim();
      if (builderTailKeywords.some((tail) => builderCore.endsWith(tail))) {
        splitPos = candidatePos;
        break;
      }
    }

    if (splitPos > 0) {
      const developerCore = inner.slice(0, splitPos).trim();
      const builderCore = inner.slice(splitPos).trim();
      developer = normalizeCompanyName(`주식회사 ${developerCore}`);
      builder = normalizeCompanyName(`${builderCore} 주식회사`);
    }
  }

  return {
    developer: normalizeCompanyName(developer),
    builder: normalizeCompanyName(builder),
  };
}

function extractTrustCompanyFromRawText(rawText: string): string | null {
  const trustKeywords = ['신탁사', '신탁회사', '관리형토지신탁', '토지신탁', '신탁'];
  const companyPattern =
    /(?:\(\s*주\s*\)\s*[가-힣A-Za-z0-9()&.\-·]{2,}|주식회사\s*[가-힣A-Za-z0-9()&.\-·]{2,}|[가-힣A-Za-z0-9()&.\-·]{2,}\s*주식회사|[가-힣A-Za-z0-9()&.\-·]{2,}(?:자산신탁|신탁))/g;

  const lines = rawText
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => line.length > 0);

  const pickCandidate = (text: string) => {
    const matches = text.match(companyPattern) ?? [];
    for (const raw of matches) {
      const normalized = normalizeCompanyName(raw);
      if (!normalized) continue;
      if (!/신탁/.test(normalized)) continue;
      return normalized;
    }
    return null;
  };

  for (const line of lines) {
    if (!trustKeywords.some((keyword) => line.includes(keyword))) continue;
    const candidate = pickCandidate(line);
    if (candidate) return candidate;
  }

  const collapsed = rawText.replace(/\s+/g, ' ');
  const nearPattern =
    /(신탁사|신탁회사|관리형토지신탁|토지신탁|신탁)[^.\n]{0,140}((?:\(\s*주\s*\)\s*[가-힣A-Za-z0-9()&.\-·]{2,}|주식회사\s*[가-힣A-Za-z0-9()&.\-·]{2,}|[가-힣A-Za-z0-9()&.\-·]{2,}\s*주식회사|[가-힣A-Za-z0-9()&.\-·]{2,}(?:자산신탁|신탁)))/g;
  for (const match of collapsed.matchAll(nearPattern)) {
    const candidate = normalizeCompanyName(match[2]);
    if (!candidate) continue;
    if (!/신탁/.test(candidate)) continue;
    return candidate;
  }

  return null;
}

function parseCommaNumber(value: string) {
  const parsed = Number(value.replaceAll(',', ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toNumberOrNull(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const normalized = value.trim().replaceAll(',', '');
    if (!normalized) return null;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function extractUnitPriceRangesFromRawText(
  rawText: string,
  typeNames: string[],
): Map<string, { min: number; max: number }> {
  const normalizedTypeNames = Array.from(
    new Set(typeNames.map((type) => type.trim()).filter((type) => type.length > 0)),
  );
  if (normalizedTypeNames.length === 0) return new Map();

  const sectionIndex = rawText.indexOf('공급금액 및 납부일정');
  const sectionSource =
    sectionIndex >= 0 ? rawText.slice(sectionIndex, sectionIndex + 22000) : rawText;
  const section = sectionSource.replace(/\s+/g, ' ').trim();
  if (!section) return new Map();

  const candidatesByType = new Map<string, number[]>();
  const pushCandidate = (typeName: string, totalThousandWon: number) => {
    if (!Number.isFinite(totalThousandWon)) return;
    if (totalThousandWon < 400000 || totalThousandWon > 3000000) return;
    const key = normalizeMergeKey(typeName);
    const existing = candidatesByType.get(key) ?? [];
    existing.push(totalThousandWon);
    candidatesByType.set(key, existing);
  };

  const lines = sectionSource
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => line.length > 0);

  for (let i = 0; i < lines.length; i += 1) {
    const joined = [lines[i], lines[i + 1] ?? '', lines[i + 2] ?? '']
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!joined) continue;

    for (const typeName of normalizedTypeNames) {
      const typePattern = new RegExp(
        `(^|[^0-9A-Za-z가-힣])${escapeRegExp(typeName)}($|[^0-9A-Za-z가-힣])`,
      );
      if (!typePattern.test(joined)) continue;

      const nums = Array.from(joined.matchAll(/\b\d{2,3},\d{3}\b/g))
        .map((match) => parseCommaNumber(match[0]))
        .filter((value): value is number => value != null);
      if (nums.length === 0) continue;

      for (let j = 0; j <= nums.length - 3; j += 1) {
        const [total, contract, balance] = nums.slice(j, j + 3);
        const contractMatches = Math.abs(Math.round(total * 0.1) - contract) <= 180;
        const balanceMatches = Math.abs(Math.round(total * 0.9) - balance) <= 180;
        if (contractMatches && balanceMatches) {
          pushCandidate(typeName, total);
        }
      }

      if ((candidatesByType.get(normalizeMergeKey(typeName)) ?? []).length === 0) {
        nums
          .filter((value) => value >= 400000 && value <= 3000000)
          .forEach((value) => pushCandidate(typeName, value));
      }
    }
  }

  const byType = new Map<string, { min: number; max: number }>();

  for (const typeName of normalizedTypeNames) {
    const totals = candidatesByType.get(normalizeMergeKey(typeName)) ?? [];
    if (totals.length === 0) continue;

    const manwonValues = totals.map((value) => Math.round(value / 10));
    const min = Math.min(...manwonValues);
    const max = Math.max(...manwonValues);
    byType.set(normalizeMergeKey(typeName), { min, max });
  }

  return byType;
}

function extractUnitCountsFromRawText(rawText: string, typeNames: string[]): Map<string, number> {
  const normalizedTypeNames = Array.from(
    new Set(typeNames.map((type) => type.trim()).filter((type) => type.length > 0)),
  );
  if (normalizedTypeNames.length === 0) return new Map();

  const counts = new Map<string, number>();
  const pushCount = (typeName: string, rawValue: number | null) => {
    if (rawValue == null || !Number.isFinite(rawValue)) return;
    let value = Math.trunc(rawValue);
    if (value >= 100 && value <= 999) {
      // pdf-parse 컬럼 병합으로 '279호'처럼 붙는 경우(=27호 + 9호) 보정
      value = Math.trunc(value / 10);
    }
    if (value < 1 || value > 300) return;
    counts.set(normalizeMergeKey(typeName), value);
  };

  const sectionIndex = rawText.indexOf('공급금액 및 납부일정');
  if (sectionIndex >= 0) {
    const section = rawText
      .slice(sectionIndex, sectionIndex + 20000)
      .replace(/\s+/g, ' ')
      .trim();

    for (const typeName of normalizedTypeNames) {
      const start = section.indexOf(typeName);
      if (start < 0) continue;

      const nextTypePositions = normalizedTypeNames
        .map((name) => section.indexOf(name, start + typeName.length))
        .filter((index) => index > start);
      const end = nextTypePositions.length > 0
        ? Math.min(...nextTypePositions)
        : Math.min(section.length, start + 700);
      const block = section.slice(start, end);

      const compactHoMatch = block.match(new RegExp(`^${typeName}\\s*(\\d{1,3})\\s*호`));
      if (compactHoMatch) {
        pushCount(typeName, Number(compactHoMatch[1]));
        continue;
      }
      const splitHoMatch = block.match(new RegExp(`^${typeName}\\s*(\\d{1,2})\\s+\\d+호`));
      if (splitHoMatch) {
        pushCount(typeName, Number(splitHoMatch[1]));
      }
    }
  }

  if (counts.size > 0) return counts;

  const collapsed = rawText.replace(/\s+/g, ' ');
  for (const typeName of normalizedTypeNames) {
    const explicitMatch = collapsed.match(
      new RegExp(`${typeName}[^\\n]{0,30}?(\\d{1,3})\\s*세대`),
    );
    if (!explicitMatch) continue;
    pushCount(typeName, Number(explicitMatch[1]));
  }

  return counts;
}

function extractContractRatioFromRawText(rawText: string): number | null {
  const collapsed = rawText.replace(/\s+/g, ' ');
  const match = collapsed.match(/계약금\s*\(?\s*(\d{1,2}(?:\.\d+)?)\s*%\s*\)?/);
  if (!match) return null;
  const percent = Number(match[1]);
  if (!Number.isFinite(percent) || percent <= 0 || percent > 100) return null;
  return Math.round((percent / 100) * 10000) / 10000;
}

function extractTransferRestrictionFromRawText(rawText: string): boolean | null {
  const collapsed = rawText.replace(/\s+/g, ' ');
  if (!collapsed.includes('전매')) return null;

  const noRestriction = /(전매[^.\n]{0,80}(제한\s*없음|해당\s*없음|제한\s*없|적용하지\s*않))/;
  if (noRestriction.test(collapsed)) return false;

  const hasRestriction = /(전매[^.\n]{0,100}(제한|금지|불가|기간|가능시기))/;
  if (hasRestriction.test(collapsed)) return true;

  return null;
}

function extractTransferRestrictionPeriodFromRawText(rawText: string): string | null {
  const collapsed = rawText.replace(/\s+/g, ' ');
  if (!collapsed.includes('전매')) return null;

  const periodPatterns = [
    /전매[^.\n]{0,120}?(?:제한\s*기간|제한|기간)[^.\n]{0,40}?(\d{1,2}\s*(?:년|개월|월))/,
    /전매[^.\n]{0,120}?(\d{1,2}\s*(?:년|개월|월))\s*(?:간|동안|후|이내)/,
    /당첨자[^.\n]{0,80}?로부터\s*(\d{1,2}\s*(?:년|개월|월))/,
  ];

  for (const pattern of periodPatterns) {
    const match = collapsed.match(pattern);
    if (!match?.[1]) continue;
    return match[1].replace(/\s+/g, '');
  }

  const ownershipTransferMatch = collapsed.match(
    /전매[^.\n]{0,120}?(소유권이전등기(?:일|시|후)?(?:까지|후)?)/,
  );
  if (ownershipTransferMatch?.[1]) {
    return ownershipTransferMatch[1].replace(/\s+/g, '');
  }

  const noRestriction = /(전매[^.\n]{0,80}(제한\s*없음|해당\s*없음|제한\s*없|적용하지\s*않))/;
  if (noRestriction.test(collapsed)) return '없음';

  return null;
}

function formatFacilityOpenDate(
  year: number,
  month: number,
  day?: number | null,
): string | null {
  if (!Number.isInteger(year) || year < 1900 || year > 2100) return null;
  if (!Number.isInteger(month) || month < 1 || month > 12) return null;
  if (day == null) {
    return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}`;
  }
  if (!Number.isInteger(day) || day < 1 || day > 31) return null;
  const parsed = new Date(Date.UTC(year, month - 1, day));
  const isValid =
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() + 1 === month &&
    parsed.getUTCDate() === day;
  if (!isValid) return null;
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function parseFacilityDateToken(
  raw: string,
  fallbackYear: number,
): { value: string | null; year: number } {
  const value = raw.trim().replace(/\s+/g, ' ');
  if (!value) return { value: null, year: fallbackYear };

  const iso = value.match(/^(\d{4})[./-](\d{1,2})(?:[./-](\d{1,2}))?$/);
  if (iso) {
    const year = Number(iso[1]);
    const month = Number(iso[2]);
    const day = iso[3] ? Number(iso[3]) : null;
    return { value: formatFacilityOpenDate(year, month, day), year };
  }

  const koreanYmd = value.match(
    /^(\d{4})\s*년\s*(\d{1,2})\s*월(?:\s*(\d{1,2})\s*일?)?$/,
  );
  if (koreanYmd) {
    const year = Number(koreanYmd[1]);
    const month = Number(koreanYmd[2]);
    const day = koreanYmd[3] ? Number(koreanYmd[3]) : null;
    return { value: formatFacilityOpenDate(year, month, day), year };
  }

  const koreanMd = value.match(/^(\d{1,2})\s*월(?:\s*(\d{1,2})\s*일?)?$/);
  if (koreanMd) {
    const month = Number(koreanMd[1]);
    const day = koreanMd[2] ? Number(koreanMd[2]) : null;
    return {
      value: formatFacilityOpenDate(fallbackYear, month, day),
      year: fallbackYear,
    };
  }

  return { value: null, year: fallbackYear };
}

function toDateFromFacilityOpenValue(value: string): Date | null {
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}$/.test(trimmed)) {
    return new Date(`${trimmed}-01T00:00:00+09:00`);
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return new Date(`${trimmed}T00:00:00+09:00`);
  }
  return null;
}

function extractFacilityFromRawText(
  rawText: string,
  propertyName: string | null | undefined,
): { name: string | null; roadAddress: string | null; openStart: string | null; openEnd: string | null } {
  const collapsed = rawText.replace(/\s+/g, ' ');
  const lines = rawText
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => line.length > 0);
  const nameFallback = propertyName ? `${propertyName} 견본주택` : null;

  const nameMatch = collapsed.match(
    /((?:[가-힣A-Za-z0-9()·\-\s]{2,40})\s*(견본주택|모델하우스|홍보관))/,
  );
  let name = nameMatch?.[1]?.trim() ?? nameFallback;
  if (name) {
    const genericOrNoisy = /(사업주체|시행사|시공사|신탁사|입주자모집공고|당첨자)/;
    if (genericOrNoisy.test(name)) {
      name = nameFallback;
    }
  }

  const addressPatterns = [
    /(견본주택|모델하우스|홍보관)[^.\n]{0,120}?(?:위치|주소)\s*[:：]?\s*([가-힣0-9\s\-(),.]+?(?:로|길)\s*\d+[^\n.]*)/,
    /(견본주택|모델하우스|홍보관)[^.\n]{0,120}?([가-힣0-9\s\-(),.]+?(?:시|군|구)[^.\n]{0,80}(?:로|길)\s*\d+[^\n.]*)/,
  ];
  let roadAddress: string | null = null;
  for (const pattern of addressPatterns) {
    const match = collapsed.match(pattern);
    if (!match?.[2]) continue;
    roadAddress = match[2].trim().replace(/[)\]]+$/, '').trim();
    break;
  }

  let openStart: string | null = null;
  let openEnd: string | null = null;

  const dateToken =
    '(?:\\d{4}[./-]\\d{1,2}(?:[./-]\\d{1,2})?|\\d{4}\\s*년\\s*\\d{1,2}\\s*월(?:\\s*\\d{1,2}\\s*일)?|\\d{1,2}\\s*월(?:\\s*\\d{1,2}\\s*일)?)';
  const dateRangePattern = new RegExp(
    `(${dateToken})\\s*(?:~|∼|부터|\\s[-–—]\\s)\\s*(${dateToken})(?:\\s*까지)?`,
  );
  const facilityDateKeywords = /(견본주택|모델하우스|홍보관)/;
  const operationDateKeywords =
    /(운영기간|운영일정|관람기간|개관일|오픈일|운영시작|운영종료|개관기간)/;

  const dateCandidates: Array<{ start: string; end: string; score: number }> = [];
  const currentYear = new Date().getFullYear();
  for (let i = 0; i < lines.length; i += 1) {
    const near = `${lines[i - 1] ?? ''} ${lines[i]} ${lines[i + 1] ?? ''}`
      .replace(/\s+/g, ' ')
      .trim();
    const normalizedNear = near.toLowerCase();
    if (
      normalizedNear.includes('청약홈') ||
      normalizedNear.includes('pc·모바일') ||
      normalizedNear.includes('인터넷 청약') ||
      normalizedNear.includes('청약통장 가입은행')
    ) {
      continue;
    }
    if (!facilityDateKeywords.test(near)) continue;
    if (!operationDateKeywords.test(near)) continue;
    const rangeMatch = near.match(dateRangePattern);
    if (!rangeMatch?.[1] || !rangeMatch?.[2]) continue;
    const parsedStart = parseFacilityDateToken(rangeMatch[1], currentYear);
    const parsedEnd = parseFacilityDateToken(rangeMatch[2], parsedStart.year);
    if (!parsedStart.value || !parsedEnd.value) continue;
    const startDate = toDateFromFacilityOpenValue(parsedStart.value);
    const endDate = toDateFromFacilityOpenValue(parsedEnd.value);
    if (startDate && endDate && startDate.getTime() > endDate.getTime()) continue;
    let score = 0;
    if (near.includes('견본주택') || near.includes('모델하우스')) score += 3;
    if (operationDateKeywords.test(near)) score += 2;
    dateCandidates.push({
      start: parsedStart.value,
      end: parsedEnd.value,
      score,
    });
  }

  if (dateCandidates.length > 0) {
    dateCandidates.sort((a, b) => b.score - a.score);
    openStart = dateCandidates[0].start;
    openEnd = dateCandidates[0].end;
  }

  if (!openStart || !openEnd) {
    const fallbackMatch = collapsed.match(
      new RegExp(
        `(견본주택|모델하우스|홍보관)[^.\\n]{0,140}?(${dateToken})\\s*(?:~|∼|부터|\\s[-–—]\\s)\\s*(${dateToken})(?:\\s*까지)?`,
      ),
    );
    if (fallbackMatch?.[2] && fallbackMatch?.[3]) {
      const parsedStart = parseFacilityDateToken(fallbackMatch[2], currentYear);
      const parsedEnd = parseFacilityDateToken(
        fallbackMatch[3],
        parsedStart.year,
      );
      openStart = parsedStart.value;
      openEnd = parsedEnd.value;
    }
  }

  return { name, roadAddress, openStart, openEnd };
}

function parseIsoDate(value: string | null | undefined): Date | null {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const date = new Date(`${trimmed}T00:00:00+09:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function inferStatusFromTimeline(
  timeline: PropertyExtractionData['timeline'],
): 'READY' | 'OPEN' | 'CLOSED' | null {
  const today = new Date();
  const todayOnly = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );

  const applicationStart = parseIsoDate(timeline.application_start);
  const contractEnd = parseIsoDate(timeline.contract_end);
  const contractStart = parseIsoDate(timeline.contract_start);

  if (contractEnd && todayOnly > contractEnd) return 'CLOSED';
  if (applicationStart && todayOnly < applicationStart) return 'READY';
  if (applicationStart || contractStart || contractEnd) return 'OPEN';
  return null;
}

function extractSpecNumbersFromRawText(rawText: string) {
  const collapsed = rawText.replace(/\s+/g, ' ');
  const lines = rawText
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => line.length > 0);
  const pickNumber = (patterns: RegExp[], min: number, max: number): number | null => {
    for (const pattern of patterns) {
      const match = collapsed.match(pattern);
      const raw = match?.[1];
      if (!raw) continue;
      const value = Number(raw.replaceAll(',', ''));
      if (!Number.isFinite(value)) continue;
      if (value < min || value > max) continue;
      return value;
    }
    return null;
  };

  const parseLooseNumber = (raw: string): number | null => {
    const value = Number(raw.replaceAll(',', '').replace(/\s+/g, ''));
    return Number.isFinite(value) ? value : null;
  };

  const pickNumberFromSectionWindows = (
    fieldKeywords: RegExp[],
    min: number,
    max: number,
  ): number | null => {
    const sectionAnchors = [
      '사업개요',
      '건축개요',
      '개요',
      '면적',
      '용적률',
      '건폐율',
    ];
    const windows: string[] = [];
    for (const anchor of sectionAnchors) {
      let cursor = 0;
      while (true) {
        const idx = rawText.indexOf(anchor, cursor);
        if (idx < 0) break;
        const start = Math.max(0, idx - 120);
        const end = Math.min(rawText.length, idx + 900);
        windows.push(rawText.slice(start, end).replace(/\s+/g, ' '));
        cursor = idx + anchor.length;
      }
    }
    if (windows.length === 0) {
      windows.push(collapsed);
    }

    for (const windowText of windows) {
      for (const keyword of fieldKeywords) {
        const match = windowText.match(
          new RegExp(`${keyword.source}[^0-9]{0,30}([\\d,][\\d,\\s.]{0,22})`, 'i'),
        );
        const raw = match?.[1];
        if (!raw) continue;
        const parsed = parseLooseNumber(raw);
        if (parsed == null) continue;
        if (parsed < min || parsed > max) continue;
        return parsed;
      }
    }
    return null;
  };

  const pickNumberFromNearbyLines = (
    keywordPatterns: RegExp[],
    valuePattern: RegExp,
    min: number,
    max: number,
  ): number | null => {
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      if (!keywordPatterns.some((pattern) => pattern.test(line))) continue;
      const near = `${line} ${lines[i + 1] ?? ''} ${lines[i + 2] ?? ''}`
        .replace(/\s+/g, ' ')
        .trim();
      const match = near.match(valuePattern);
      const raw = match?.[1];
      if (!raw) continue;
      const value = Number(raw.replaceAll(',', ''));
      if (!Number.isFinite(value)) continue;
      if (value < min || value > max) continue;
      return value;
    }
    return null;
  };

  const siteArea = pickNumber(
    [
      /대지면적[^0-9]{0,12}([\d,]+(?:\.\d+)?)\s*(?:㎡|m2|m²)/,
      /사업부지면적[^0-9]{0,12}([\d,]+(?:\.\d+)?)\s*(?:㎡|m2|m²)/,
    ],
    100,
    10000000,
  );
  const siteAreaNearby = pickNumberFromNearbyLines(
    [/대지면적/, /사업부지면적/],
    /([\d,]+(?:\.\d+)?)/,
    100,
    10000000,
  );
  const siteAreaSection = pickNumberFromSectionWindows(
    [/대지면적/, /사업부지면적/, /부지면적/],
    100,
    10000000,
  );
  const buildingArea = pickNumber(
    [/건축면적[^0-9]{0,12}([\d,]+(?:\.\d+)?)\s*(?:㎡|m2|m²)/],
    50,
    10000000,
  );
  const buildingAreaNearby = pickNumberFromNearbyLines(
    [/건축면적/],
    /([\d,]+(?:\.\d+)?)/,
    50,
    10000000,
  );
  const buildingAreaSection = pickNumberFromSectionWindows([/건축면적/], 50, 10000000);
  const floorAreaRatio = pickNumber([/용적률[^0-9]{0,12}([\d,]+(?:\.\d+)?)\s*%/], 10, 3000);
  const floorAreaRatioFallback = pickNumber(
    [/용적률[^0-9]{0,12}([\d,]+(?:\.\d+)?)/, /법정용적률[^0-9]{0,12}([\d,]+(?:\.\d+)?)/],
    10,
    3000,
  );
  const buildingCoverageRatio = pickNumber([/건폐율[^0-9]{0,12}([\d,]+(?:\.\d+)?)\s*%/], 1, 100);
  const buildingCoverageRatioFallback = pickNumber(
    [/건폐율[^0-9]{0,12}([\d,]+(?:\.\d+)?)/, /법정건폐율[^0-9]{0,12}([\d,]+(?:\.\d+)?)/],
    1,
    100,
  );
  const floorAreaRatioNearby = pickNumberFromNearbyLines(
    [/용적률/, /법정용적률/],
    /([\d,]+(?:\.\d+)?)/,
    10,
    3000,
  );
  const floorAreaRatioSection = pickNumberFromSectionWindows(
    [/용적률/, /법정용적률/],
    10,
    3000,
  );
  const buildingCoverageRatioNearby = pickNumberFromNearbyLines(
    [/건폐율/, /법정건폐율/],
    /([\d,]+(?:\.\d+)?)/,
    1,
    100,
  );
  const buildingCoverageRatioSection = pickNumberFromSectionWindows(
    [/건폐율/, /법정건폐율/],
    1,
    100,
  );
  const parkingTotal = pickNumber(
    [
      /총\s*주차대수[^0-9]{0,12}([\d,]+)\s*대/,
      /주차대수[^0-9]{0,12}([\d,]+)\s*대/,
    ],
    10,
    100000,
  );
  const parkingPerHousehold = pickNumber(
    [/세대당\s*주차[^0-9]{0,12}([\d,]+(?:\.\d+)?)/, /주차대수\s*\/\s*세대[^0-9]{0,12}([\d,]+(?:\.\d+)?)/],
    0.1,
    10,
  );

  let heatingType: string | null = null;
  const heatingMatch = collapsed.match(
    /(난방방식|난방)[^.\n]{0,20}(개별난방|지역난방|중앙난방|열병합)/,
  );
  if (heatingMatch?.[2]) {
    heatingType = heatingMatch[2];
  }

  return {
    siteArea: siteArea ?? siteAreaNearby ?? siteAreaSection,
    buildingArea: buildingArea ?? buildingAreaNearby ?? buildingAreaSection,
    floorAreaRatio,
    buildingCoverageRatio,
    floorAreaRatioFallback:
      floorAreaRatioFallback ?? floorAreaRatioNearby ?? floorAreaRatioSection,
    buildingCoverageRatioFallback:
      buildingCoverageRatioFallback ??
      buildingCoverageRatioNearby ??
      buildingCoverageRatioSection,
    parkingTotal,
    parkingPerHousehold,
    heatingType,
  };
}

function extractTotalHouseholdCountFromRawText(rawText: string): number | null {
  const collapsed = rawText.replace(/\s+/g, ' ');
  const candidates: number[] = [];
  const patterns = [
    /총\s*세대수[^0-9]{0,12}([\d,]+)\s*세대?/gi,
    /총\s*([\d,]+)\s*세대/gi,
    /세대수[^0-9]{0,12}([\d,]+)\s*세대?/gi,
  ];

  for (const pattern of patterns) {
    for (const match of collapsed.matchAll(pattern)) {
      const raw = match[1];
      if (!raw) continue;
      const start = Math.max(0, (match.index ?? 0) - 24);
      const end = Math.min(collapsed.length, (match.index ?? 0) + match[0].length + 24);
      const near = collapsed.slice(start, end);
      if (
        /(일반분양|특별공급|공공분양|민간분양|기관추천|신혼부부|생애최초)\s*세대수?/i.test(
          near,
        )
      ) {
        continue;
      }
      const parsed = Number(raw.replaceAll(',', ''));
      if (!Number.isFinite(parsed) || parsed < 10 || parsed > 200000) continue;
      candidates.push(parsed);
    }
  }

  if (candidates.length === 0) return null;
  return Math.max(...candidates);
}

function sanitizeTrustCompanyName(value: string | null | undefined): string | null {
  if (isBlank(value)) return null;
  const compact = String(value).replace(/\s+/g, ' ').trim();
  const deNoised = compact
    .replace(/(계좌|예금주|납부계좌|공급대금|추가선택품목|계약금|중도금|잔금|우리은행|국민은행|신한은행|기업은행|농협은행|하나은행)/g, ' ')
    .replace(/[0-9-]{6,}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const trustMatches = Array.from(
    deNoised.matchAll(
      /((?:주식회사\s*)?[가-힣A-Za-z&.\-·()]{1,20}(?:자산신탁|신탁)(?:\s*주식회사)?)/g,
    ),
  )
    .map((match) => normalizeCompanyName(match[1]))
    .filter((name): name is string => Boolean(name && /신탁/.test(name)));

  if (trustMatches.length > 0) {
    const preferred = trustMatches[trustMatches.length - 1];
    return preferred;
  }

  const fallback = normalizeCompanyName(deNoised);
  if (!fallback || !fallback.includes('신탁')) return null;
  return fallback;
}

function sanitizeDeveloperFromBuilder(
  developer: string | null | undefined,
  builder: string | null | undefined,
): string | null {
  if (isBlank(developer)) return null;
  const normalizedDeveloper = String(developer).replace(/\s+/g, ' ').trim();
  const normalizedBuilder = String(builder ?? '').replace(/\s+/g, ' ').trim();
  const parts = normalizedDeveloper
    .split(/[,\u00b7·/]/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  if (parts.length === 0) return normalizeCompanyName(normalizedDeveloper);
  const picked =
    parts.find((part) => normalizeMergeKey(part) !== normalizeMergeKey(normalizedBuilder)) ??
    parts[0];
  return normalizeCompanyName(picked);
}

function normalizeUnitPriceScale(unit: PropertyExtractionData['unit_types'][number]) {
  const min = toNumberOrNull(unit.price_min);
  const max = toNumberOrNull(unit.price_max);
  if (min == null && max == null) return unit;
  const area = toNumberOrNull(unit.exclusive_area);

  const normalizeOne = (value: number | null) => {
    if (value == null) return value;
    let next = value;
    if (next >= 1000000) next = Math.round(next / 10);
    if (area != null && area < 130 && next >= 200000) next = Math.round(next / 10);
    return next;
  };

  return {
    ...unit,
    price_min: normalizeOne(min),
    price_max: normalizeOne(max),
  };
}

function applyDeterministicTextEnrichment(
  result: PropertyExtractionData,
  rawText: string,
): PropertyExtractionData {
  const next: PropertyExtractionData = {
    ...result,
    properties: { ...result.properties },
    location: { ...result.location },
    specs: { ...result.specs },
    timeline: { ...result.timeline },
    unit_types: [...result.unit_types],
    facilities: [...result.facilities],
    web_evidence: [...(result.web_evidence ?? [])],
  };

  const { developer, builder } = extractDeveloperBuilderFromRawText(rawText);
  const trustCompany = extractTrustCompanyFromRawText(rawText);
  if (developer) {
    const shouldReplaceDeveloper =
      isBlank(next.specs.developer) ||
      normalizeMergeKey(next.specs.developer) === normalizeMergeKey(next.specs.trust_company) ||
      (builder != null &&
        normalizeMergeKey(next.specs.developer) === normalizeMergeKey(builder));
    if (shouldReplaceDeveloper) {
      next.specs.developer = developer;
    }
  }
  if (builder) {
    const shouldReplaceBuilder =
      isBlank(next.specs.builder) ||
      (developer != null &&
        normalizeMergeKey(next.specs.builder) === normalizeMergeKey(developer));
    if (shouldReplaceBuilder) {
      next.specs.builder = builder;
    }
  }
  if (trustCompany) {
    const shouldReplaceTrust =
      isBlank(next.specs.trust_company) ||
      (!String(next.specs.trust_company).includes('신탁') && trustCompany.includes('신탁'));
    if (shouldReplaceTrust) {
      next.specs.trust_company = trustCompany;
    }
  }
  next.specs.developer = sanitizeDeveloperFromBuilder(next.specs.developer, next.specs.builder);
  next.specs.trust_company = sanitizeTrustCompanyName(next.specs.trust_company);

  const priceRanges = extractUnitPriceRangesFromRawText(
    rawText,
    next.unit_types.map((unit) => unit.type_name),
  );
  if (priceRanges.size > 0) {
    next.unit_types = next.unit_types.map((unit) => {
      const key = normalizeMergeKey(unit.type_name);
      const range = priceRanges.get(key);
      if (!range) return unit;
      return {
        ...unit,
        price_min: hasMeaningfulValue(unit.price_min) ? unit.price_min : range.min,
        price_max: hasMeaningfulValue(unit.price_max) ? unit.price_max : range.max,
      };
    });
  }
  next.unit_types = next.unit_types.map((unit) => normalizeUnitPriceScale(unit));

  const unitCounts = extractUnitCountsFromRawText(
    rawText,
    next.unit_types.map((unit) => unit.type_name),
  );
  if (unitCounts.size > 0) {
    next.unit_types = next.unit_types.map((unit) => {
      const key = normalizeMergeKey(unit.type_name);
      const parsedCount = unitCounts.get(key);
      if (parsedCount == null) return unit;
      const currentCount = toNumberOrNull(unit.unit_count);
      const shouldReplaceCount =
        currentCount == null ||
        currentCount <= 0 ||
        Math.abs(currentCount - parsedCount) >= 5;
      return {
        ...unit,
        unit_count: shouldReplaceCount ? parsedCount : currentCount,
      };
    });
  }

  const contractRatio = extractContractRatioFromRawText(rawText);
  const transferRestriction = extractTransferRestrictionFromRawText(rawText);
  const transferRestrictionPeriod = extractTransferRestrictionPeriodFromRawText(rawText);
  const specNumbers = extractSpecNumbersFromRawText(rawText);
  const facilityInfo = extractFacilityFromRawText(rawText, next.properties?.name);
  next.validation = {
    contract_ratio:
      typeof next.validation?.contract_ratio === 'number'
        ? next.validation.contract_ratio
        : contractRatio,
    transfer_restriction:
      typeof next.validation?.transfer_restriction === 'boolean'
        ? next.validation.transfer_restriction
        : transferRestriction,
    transfer_restriction_period:
      typeof next.validation?.transfer_restriction_period === 'string' &&
      next.validation.transfer_restriction_period.trim().length > 0
        ? next.validation.transfer_restriction_period.trim()
        : transferRestrictionPeriod,
  };

  // 전매 제한 일관성 보정:
  // - 기간 텍스트가 있으면 true
  // - 기간이 '없음' 계열이면 false
  // - false인데 기간이 남아 있으면 기간은 '없음'으로 정규화
  const normalizedPeriod = next.validation.transfer_restriction_period?.trim() ?? null;
  if (normalizedPeriod) {
    const isNoRestrictionPeriod = /^(없음|해당없음|없다|미적용|적용안함)$/i.test(
      normalizedPeriod.replace(/\s+/g, ''),
    );
    if (isNoRestrictionPeriod) {
      next.validation.transfer_restriction = false;
      next.validation.transfer_restriction_period = '없음';
    } else {
      next.validation.transfer_restriction = true;
      next.validation.transfer_restriction_period = normalizedPeriod;
    }
  } else if (next.validation.transfer_restriction === false) {
    next.validation.transfer_restriction_period = '없음';
  }

  if (!hasMeaningfulValue(next.specs.site_area) && specNumbers.siteArea != null) {
    next.specs.site_area = specNumbers.siteArea;
  }
  if (!hasMeaningfulValue(next.specs.building_area) && specNumbers.buildingArea != null) {
    next.specs.building_area = specNumbers.buildingArea;
  }
  if (!hasMeaningfulValue(next.specs.floor_area_ratio)) {
    next.specs.floor_area_ratio =
      specNumbers.floorAreaRatio ?? specNumbers.floorAreaRatioFallback ?? null;
  }
  if (
    !hasMeaningfulValue(next.specs.building_coverage_ratio)
  ) {
    next.specs.building_coverage_ratio =
      specNumbers.buildingCoverageRatio ??
      specNumbers.buildingCoverageRatioFallback ??
      null;
  }
  if (!hasMeaningfulValue(next.specs.parking_total) && specNumbers.parkingTotal != null) {
    next.specs.parking_total = specNumbers.parkingTotal;
  }
  if (
    !hasMeaningfulValue(next.specs.parking_per_household) &&
    specNumbers.parkingPerHousehold != null
  ) {
    next.specs.parking_per_household = specNumbers.parkingPerHousehold;
  }
  if (isBlank(next.specs.heating_type) && specNumbers.heatingType) {
    next.specs.heating_type = specNumbers.heatingType;
  }
  const totalHouseholdCount = extractTotalHouseholdCountFromRawText(rawText);
  if (totalHouseholdCount != null) {
    next.specs.household_total = totalHouseholdCount;
  }

  if (next.facilities.length === 0 && (facilityInfo.name || facilityInfo.roadAddress)) {
    next.facilities = [
      {
        type: '견본주택',
        name: facilityInfo.name ?? `${next.properties.name ?? '현장'} 견본주택`,
        road_address: facilityInfo.roadAddress,
        address_detail: null,
        open_start: facilityInfo.openStart,
        open_end: facilityInfo.openEnd,
      },
    ];
  } else if (next.facilities.length > 0) {
    next.facilities = next.facilities.map((facility, index) => {
      if (index > 0) return facility;
      return {
        ...facility,
        name: isBlank(facility.name) ? facilityInfo.name ?? facility.name : facility.name,
        road_address: isBlank(facility.road_address)
          ? facilityInfo.roadAddress ?? facility.road_address
          : facility.road_address,
        address_detail: facility.address_detail ?? null,
        open_start: isBlank(facility.open_start)
          ? facilityInfo.openStart ?? facility.open_start
          : facility.open_start,
        open_end: isBlank(facility.open_end)
          ? facilityInfo.openEnd ?? facility.open_end
          : facility.open_end,
      };
    });
  }

  const inferredStatus = inferStatusFromTimeline(next.timeline);
  if (inferredStatus) {
    next.properties.status = inferredStatus;
  }

  return next;
}

function collectMissingFieldPaths(result: PropertyExtractionData): string[] {
  const paths: string[] = [];

  if (isBlank(result.specs.developer)) paths.push('specs.developer');
  if (isBlank(result.specs.builder)) paths.push('specs.builder');
  if (isBlank(result.specs.trust_company)) paths.push('specs.trust_company');
  if (!hasMeaningfulValue(result.specs.site_area)) paths.push('specs.site_area');
  if (!hasMeaningfulValue(result.specs.building_area)) paths.push('specs.building_area');
  if (!hasMeaningfulValue(result.specs.parking_total)) paths.push('specs.parking_total');
  if (!hasMeaningfulValue(result.specs.parking_per_household)) paths.push('specs.parking_per_household');
  if (isBlank(result.specs.heating_type)) paths.push('specs.heating_type');
  if (isBlank(result.timeline.announcement_date)) paths.push('timeline.announcement_date');
  if (isBlank(result.timeline.application_start)) paths.push('timeline.application_start');
  if (isBlank(result.timeline.application_end)) paths.push('timeline.application_end');
  if (isBlank(result.timeline.contract_start)) paths.push('timeline.contract_start');
  if (isBlank(result.timeline.contract_end)) paths.push('timeline.contract_end');
  if (result.facilities.length === 0) paths.push('facilities');
  if (!result.unit_types.some((unit) => unit.rooms !== null)) paths.push('unit_types.rooms');
  if (!result.unit_types.some((unit) => unit.bathrooms !== null)) paths.push('unit_types.bathrooms');

  return Array.from(new Set(paths));
}

function hasMissingTableSpecFields(result: PropertyExtractionData): boolean {
  return (
    !hasMeaningfulValue(result.specs.site_area) ||
    !hasMeaningfulValue(result.specs.building_area) ||
    !hasMeaningfulValue(result.specs.floor_area_ratio) ||
    !hasMeaningfulValue(result.specs.building_coverage_ratio) ||
    !hasMeaningfulValue(result.specs.parking_total) ||
    !hasMeaningfulValue(result.specs.parking_per_household) ||
    isBlank(result.specs.heating_type)
  );
}

function applyTableSpecSupplement(
  result: PropertyExtractionData,
  supplement: z.infer<typeof specTableSupplementSchema>,
): PropertyExtractionData {
  const next: PropertyExtractionData = {
    ...result,
    specs: { ...result.specs },
  };

  if (!hasMeaningfulValue(next.specs.site_area) && hasMeaningfulValue(supplement.site_area)) {
    next.specs.site_area = supplement.site_area;
  }
  if (
    !hasMeaningfulValue(next.specs.building_area) &&
    hasMeaningfulValue(supplement.building_area)
  ) {
    next.specs.building_area = supplement.building_area;
  }
  if (
    !hasMeaningfulValue(next.specs.floor_area_ratio) &&
    hasMeaningfulValue(supplement.floor_area_ratio)
  ) {
    next.specs.floor_area_ratio = supplement.floor_area_ratio;
  }
  if (
    !hasMeaningfulValue(next.specs.building_coverage_ratio) &&
    hasMeaningfulValue(supplement.building_coverage_ratio)
  ) {
    next.specs.building_coverage_ratio = supplement.building_coverage_ratio;
  }
  if (!hasMeaningfulValue(next.specs.parking_total) && hasMeaningfulValue(supplement.parking_total)) {
    next.specs.parking_total = supplement.parking_total;
  }
  if (
    !hasMeaningfulValue(next.specs.parking_per_household) &&
    hasMeaningfulValue(supplement.parking_per_household)
  ) {
    next.specs.parking_per_household = supplement.parking_per_household;
  }
  if (isBlank(next.specs.heating_type) && !isBlank(supplement.heating_type)) {
    next.specs.heating_type = supplement.heating_type?.trim() ?? null;
  }

  return next;
}

function isIsoDateString(value: string | null | undefined): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.trim());
}

function hasMissingTimelineTableFields(result: PropertyExtractionData): boolean {
  return (
    isBlank(result.timeline.announcement_date) ||
    isBlank(result.timeline.application_start) ||
    isBlank(result.timeline.application_end) ||
    isBlank(result.timeline.winner_announce) ||
    isBlank(result.timeline.contract_start) ||
    isBlank(result.timeline.contract_end)
  );
}

function applyTimelineTableSupplement(
  result: PropertyExtractionData,
  supplement: z.infer<typeof timelineTableSupplementSchema>,
): PropertyExtractionData {
  const next: PropertyExtractionData = {
    ...result,
    timeline: { ...result.timeline },
  };

  const assignIsoDate = (
    key: keyof PropertyExtractionData['timeline'],
    value: string | null | undefined,
  ) => {
    if (!isBlank(next.timeline[key] as string | null | undefined)) return;
    if (!isIsoDateString(value)) return;
    next.timeline[key] = value.trim() as PropertyExtractionData['timeline'][typeof key];
  };

  assignIsoDate('announcement_date', supplement.announcement_date);
  assignIsoDate('application_start', supplement.application_start);
  assignIsoDate('application_end', supplement.application_end);
  assignIsoDate('winner_announce', supplement.winner_announce);
  assignIsoDate('contract_start', supplement.contract_start);
  assignIsoDate('contract_end', supplement.contract_end);

  return next;
}

function hasMissingValidationTableFields(result: PropertyExtractionData): boolean {
  return (
    !hasMeaningfulValue(result.validation.contract_ratio) ||
    result.validation.transfer_restriction === null ||
    (result.validation.transfer_restriction === true &&
      isBlank(result.validation.transfer_restriction_period))
  );
}

function applyValidationTableSupplement(
  result: PropertyExtractionData,
  supplement: z.infer<typeof validationTableSupplementSchema>,
): PropertyExtractionData {
  const next: PropertyExtractionData = {
    ...result,
    validation: { ...result.validation },
  };

  if (
    !hasMeaningfulValue(next.validation.contract_ratio) &&
    hasMeaningfulValue(supplement.contract_ratio)
  ) {
    next.validation.contract_ratio = supplement.contract_ratio;
  }
  if (
    next.validation.transfer_restriction === null &&
    typeof supplement.transfer_restriction === 'boolean'
  ) {
    next.validation.transfer_restriction = supplement.transfer_restriction;
  }
  if (
    isBlank(next.validation.transfer_restriction_period) &&
    !isBlank(supplement.transfer_restriction_period)
  ) {
    next.validation.transfer_restriction_period =
      supplement.transfer_restriction_period?.trim() ?? null;
  }

  const normalizedPeriod = next.validation.transfer_restriction_period?.trim() ?? null;
  if (normalizedPeriod) {
    const isNoRestrictionPeriod = /^(없음|해당없음|없다|미적용|적용안함)$/i.test(
      normalizedPeriod.replace(/\s+/g, ''),
    );
    if (isNoRestrictionPeriod) {
      next.validation.transfer_restriction = false;
      next.validation.transfer_restriction_period = '없음';
    } else {
      next.validation.transfer_restriction = true;
      next.validation.transfer_restriction_period = normalizedPeriod;
    }
  } else if (next.validation.transfer_restriction === false) {
    next.validation.transfer_restriction_period = '없음';
  }

  return next;
}

function hasMissingUnitTableFields(result: PropertyExtractionData): boolean {
  if (!Array.isArray(result.unit_types) || result.unit_types.length === 0) return false;
  return result.unit_types.some(
    (unit) => !hasMeaningfulValue(unit.rooms) || !hasMeaningfulValue(unit.bathrooms),
  );
}

function applyUnitTableSupplement(
  result: PropertyExtractionData,
  supplement: z.infer<typeof unitTableSupplementSchema>,
): PropertyExtractionData {
  const next: PropertyExtractionData = {
    ...result,
    unit_types: [...result.unit_types],
  };
  if (!Array.isArray(supplement.unit_types) || supplement.unit_types.length === 0) {
    return next;
  }

  const byType = new Map(
    supplement.unit_types
      .map((row) => [normalizeMergeKey(row.type_name), row] as const)
      .filter(([key]) => key.length > 0),
  );

  next.unit_types = next.unit_types.map((unit) => {
    const key = normalizeMergeKey(unit.type_name);
    const supplemented = byType.get(key);
    if (!supplemented) return unit;
    return {
      ...unit,
      rooms: hasMeaningfulValue(unit.rooms) ? unit.rooms : supplemented.rooms,
      bathrooms: hasMeaningfulValue(unit.bathrooms) ? unit.bathrooms : supplemented.bathrooms,
    };
  });

  return next;
}

function collectMissingFieldHints(result: PropertyExtractionData): string[] {
  const missingPaths = collectMissingFieldPaths(result);
  const hints: string[] = [];

  if (missingPaths.includes('specs.developer')) hints.push('시행사');
  if (missingPaths.includes('specs.builder')) hints.push('시공사');
  if (missingPaths.includes('specs.trust_company')) hints.push('신탁사');
  if (
    missingPaths.includes('specs.site_area') ||
    missingPaths.includes('specs.building_area') ||
    missingPaths.includes('specs.parking_total') ||
    missingPaths.includes('specs.parking_per_household') ||
    missingPaths.includes('specs.heating_type')
  ) {
    hints.push('대지면적 건축면적 주차 난방');
  }
  if (missingPaths.includes('timeline.announcement_date')) hints.push('모집공고일');
  if (missingPaths.includes('timeline.application_start') || missingPaths.includes('timeline.application_end')) hints.push('청약접수 일정');
  if (missingPaths.includes('timeline.contract_start') || missingPaths.includes('timeline.contract_end')) hints.push('계약 일정');
  if (missingPaths.includes('facilities')) hints.push('모델하우스 정보');
  if (missingPaths.includes('unit_types.rooms') || missingPaths.includes('unit_types.bathrooms')) hints.push('방수/욕실수');

  return Array.from(new Set(hints));
}

function buildWebQueries(result: PropertyExtractionData, missingFieldPaths: string[]): string[] {
  if (missingFieldPaths.length === 0) return [];

  const name = result.properties.name?.trim() || '';
  const road = result.location.road_address?.trim() || '';
  const area = [result.location.region_1depth, result.location.region_2depth].filter(Boolean).join(' ');
  const anchor = [name, area || road].filter(Boolean).join(' ');
  const base = anchor || name;
  if (!base) return [];

  const missing = new Set(missingFieldPaths.map((path) => normalizeEvidenceFieldPath(path)));
  const hints = collectMissingFieldHints(result).join(', ');
  const candidates: string[] = [];

  const hasAny = (...paths: string[]) => paths.some((path) => missing.has(path));

  if (hasAny(
    'specs.developer',
    'specs.builder',
    'specs.trust_company',
    'timeline.announcement_date',
    'timeline.application_start',
    'timeline.application_end',
    'timeline.contract_start',
    'timeline.contract_end',
  )) {
    candidates.push(`${base} 모집공고문`);
  }
  if (hasAny('specs.developer', 'specs.builder', 'specs.trust_company')) {
    candidates.push(`${base} 분양 시행사 시공사 신탁사`);
  }
  if (hasAny('timeline.announcement_date', 'timeline.application_start', 'timeline.application_end', 'timeline.contract_start', 'timeline.contract_end')) {
    candidates.push(`${base} 청약 일정 계약 일정`);
  }
  if (hasAny('facilities')) {
    candidates.push(`${base} 모델하우스 주소 운영기간`);
  }
  if (hasAny('unit_types.rooms', 'unit_types.bathrooms')) {
    candidates.push(`${base} 평면도 방 욕실`);
  }
  if (hasAny(
    'specs.site_area',
    'specs.building_area',
    'specs.parking_total',
    'specs.parking_per_household',
    'specs.heating_type',
  ) && hints) {
    candidates.push(`${base} ${hints}`);
  }

  return Array.from(new Set(candidates.map((q) => q.trim()).filter((q) => q.length > 0))).slice(0, MAX_WEB_QUERIES);
}

async function searchWithGoogleSearch(query: string): Promise<WebSearchResultItem[]> {
  try {
    const { sources } = await generateText({
      model: google('gemini-2.5-flash'),
      tools: {
        google_search: google.tools.googleSearch({ mode: 'MODE_UNSPECIFIED' }),
      },
      prompt:
        `다음 검색어에 대해 최신 웹 근거를 찾고 핵심만 요약하라: "${query}". ` +
        `반드시 google_search를 사용하고, 근거가 불분명하면 추측하지 마라.`,
    });

    const items: WebSearchResultItem[] = [];
    for (const source of sources) {
      if (source.type !== 'source' || source.sourceType !== 'url') continue;
      const url = source.url.trim();
      const title = typeof source.title === 'string' && source.title.trim().length > 0
        ? source.title.trim()
        : url;
      if (!url || !title) continue;

      items.push({
        query,
        title,
        url,
        snippet: '',
        date: null,
      });
    }

    return Array.from(
      new Map(items.map((item) => [item.url, item])).values()
    ).slice(0, MAX_WEB_RESULTS_PER_QUERY);
  } catch (error) {
    console.warn('Google Search 검색 실패:', error);
    return [];
  }
}

async function searchWebContext(queries: string[]): Promise<WebSearchResultItem[]> {
  if (queries.length === 0) return [];
  const results = await Promise.all(queries.map((query) => searchWithGoogleSearch(query)));
  return results.flat();
}

function buildWebContextText(items: WebSearchResultItem[]): string {
  if (items.length === 0) return '';

  const lines: string[] = ['[web_context]'];
  items.forEach((item, index) => {
    lines.push(`${index + 1}. query: ${item.query}`);
    lines.push(`title: ${item.title}`);
    lines.push(`url: ${item.url}`);
    lines.push(`date: ${item.date ?? 'unknown'}`);
    lines.push(`snippet: ${item.snippet || '(snippet 없음)'}`);
  });

  const joined = lines.join('\n');
  return joined.length > MAX_WEB_CONTEXT_CHARS ? joined.slice(0, MAX_WEB_CONTEXT_CHARS) : joined;
}

function normalizeWebEvidence(items: WebEvidenceItem[] | undefined): WebEvidenceItem[] {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => ({
      field_path:
        typeof item.field_path === 'string'
          ? normalizeEvidenceFieldPath(item.field_path)
          : '',
      source_url: typeof item.source_url === 'string' ? item.source_url.trim() : null,
      source_snippet: typeof item.source_snippet === 'string' ? item.source_snippet.trim() : null,
      confidence:
        typeof item.confidence === 'number' && Number.isFinite(item.confidence)
          ? Math.max(0, Math.min(1, item.confidence))
          : null,
    }))
    .filter((item) => item.field_path.length > 0);
}

function normalizeEvidenceFieldPath(path: string) {
  return path.trim().replace(/\[\d+\]/g, '');
}

const WEB_FIELD_KEYWORDS: Record<string, string[]> = {
  'specs.developer': ['시행사', '사업주체'],
  'specs.builder': ['시공사'],
  'specs.trust_company': ['신탁사', '신탁'],
  'specs.site_area': ['대지면적'],
  'specs.building_area': ['건축면적'],
  'specs.parking_total': ['주차대수'],
  'specs.parking_per_household': ['세대당 주차'],
  'specs.heating_type': ['난방'],
  'timeline.announcement_date': ['모집공고'],
  'timeline.application_start': ['청약', '접수 일정'],
  'timeline.application_end': ['청약', '접수 일정'],
  'timeline.contract_start': ['계약 일정'],
  'timeline.contract_end': ['계약 일정'],
  facilities: ['모델하우스', '견본주택', '홍보관'],
  'unit_types.rooms': ['평면도', '방', '욕실'],
  'unit_types.bathrooms': ['평면도', '방', '욕실'],
  'validation.contract_ratio': ['계약금'],
  'validation.transfer_restriction': ['전매', '전매제한'],
  'validation.transfer_restriction_period': ['전매', '전매제한', '기간'],
};

const HIGH_TRUST_DOMAIN_SUFFIXES = [
  'go.kr',
  'applyhome.co.kr',
  'lh.or.kr',
  'molit.go.kr',
  'kbland.kr',
  'korea.kr',
];

function extractHostname(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function extractDomainFromSnippet(value: string | null | undefined): string | null {
  if (!value) return null;
  const match = value.toLowerCase().match(/\b([a-z0-9.-]+\.[a-z]{2,})\b/);
  return match?.[1] ?? null;
}

function isHighTrustDomain(domain: string | null): boolean {
  if (!domain) return false;
  return HIGH_TRUST_DOMAIN_SUFFIXES.some((suffix) => domain === suffix || domain.endsWith(`.${suffix}`));
}

function scoreWebEvidenceForField(fieldPath: string, item: WebEvidenceItem): number {
  const keywords = WEB_FIELD_KEYWORDS[fieldPath] ?? [];
  const snippet = `${item.source_snippet ?? ''}`.toLowerCase();
  const urlHost = extractHostname(item.source_url);
  const snippetDomain = extractDomainFromSnippet(item.source_snippet);

  let score = 0;
  const conf = item.confidence ?? 0;
  if (conf >= 0.75) score += 0.4;
  else if (conf >= WEB_EVIDENCE_MIN_CONFIDENCE) score += 0.3;
  else if (conf >= 0.45) score += 0.15;

  if (isHighTrustDomain(urlHost) || isHighTrustDomain(snippetDomain)) {
    score += 0.35;
  } else {
    score += 0.05;
  }

  if (keywords.some((keyword) => snippet.includes(keyword.toLowerCase()))) {
    score += 0.2;
  }

  if (urlHost?.includes('vertexaisearch.cloud.google.com')) {
    score -= 0.1;
  }

  return score;
}

function filterAcceptedWebEvidence(items: WebEvidenceItem[]): WebEvidenceItem[] {
  return items.filter((item) => {
    if (!item.field_path) return false;
    if ((item.confidence ?? 0) < WEB_EVIDENCE_MIN_CONFIDENCE) return false;
    return scoreWebEvidenceForField(item.field_path, item) >= 0.55;
  });
}

function cloneExtractionResult(result: PropertyExtractionData): PropertyExtractionData {
  return JSON.parse(JSON.stringify(result)) as PropertyExtractionData;
}

function getFieldValueByPath(result: PropertyExtractionData, fieldPath: string): unknown {
  switch (fieldPath) {
    case 'specs.developer':
      return result.specs.developer;
    case 'specs.builder':
      return result.specs.builder;
    case 'specs.trust_company':
      return result.specs.trust_company;
    case 'specs.site_area':
      return result.specs.site_area;
    case 'specs.building_area':
      return result.specs.building_area;
    case 'specs.parking_total':
      return result.specs.parking_total;
    case 'specs.parking_per_household':
      return result.specs.parking_per_household;
    case 'specs.heating_type':
      return result.specs.heating_type;
    case 'timeline.announcement_date':
      return result.timeline.announcement_date;
    case 'timeline.application_start':
      return result.timeline.application_start;
    case 'timeline.application_end':
      return result.timeline.application_end;
    case 'timeline.contract_start':
      return result.timeline.contract_start;
    case 'timeline.contract_end':
      return result.timeline.contract_end;
    case 'facilities':
      return result.facilities;
    case 'unit_types.rooms':
      return result.unit_types.map((u) => u.rooms);
    case 'unit_types.bathrooms':
      return result.unit_types.map((u) => u.bathrooms);
    default:
      return undefined;
  }
}

function restoreFieldValueByPath(
  target: PropertyExtractionData,
  source: PropertyExtractionData,
  fieldPath: string,
) {
  switch (fieldPath) {
    case 'specs.developer':
      target.specs.developer = source.specs.developer;
      return;
    case 'specs.builder':
      target.specs.builder = source.specs.builder;
      return;
    case 'specs.trust_company':
      target.specs.trust_company = source.specs.trust_company;
      return;
    case 'specs.site_area':
      target.specs.site_area = source.specs.site_area;
      return;
    case 'specs.building_area':
      target.specs.building_area = source.specs.building_area;
      return;
    case 'specs.parking_total':
      target.specs.parking_total = source.specs.parking_total;
      return;
    case 'specs.parking_per_household':
      target.specs.parking_per_household = source.specs.parking_per_household;
      return;
    case 'specs.heating_type':
      target.specs.heating_type = source.specs.heating_type;
      return;
    case 'timeline.announcement_date':
      target.timeline.announcement_date = source.timeline.announcement_date;
      return;
    case 'timeline.application_start':
      target.timeline.application_start = source.timeline.application_start;
      return;
    case 'timeline.application_end':
      target.timeline.application_end = source.timeline.application_end;
      return;
    case 'timeline.contract_start':
      target.timeline.contract_start = source.timeline.contract_start;
      return;
    case 'timeline.contract_end':
      target.timeline.contract_end = source.timeline.contract_end;
      return;
    case 'facilities':
      target.facilities = source.facilities;
      return;
    case 'unit_types.rooms':
      target.unit_types = target.unit_types.map((unit, idx) => ({
        ...unit,
        rooms: source.unit_types[idx]?.rooms ?? null,
      }));
      return;
    case 'unit_types.bathrooms':
      target.unit_types = target.unit_types.map((unit, idx) => ({
        ...unit,
        bathrooms: source.unit_types[idx]?.bathrooms ?? null,
      }));
      return;
    default:
      return;
  }
}

function hasValueForFieldPath(result: PropertyExtractionData, fieldPath: string): boolean {
  switch (fieldPath) {
    case 'specs.developer':
      return !isBlank(result.specs.developer);
    case 'specs.builder':
      return !isBlank(result.specs.builder);
    case 'specs.trust_company':
      return !isBlank(result.specs.trust_company);
    case 'timeline.announcement_date':
      return !isBlank(result.timeline.announcement_date);
    case 'specs.site_area':
      return hasMeaningfulValue(result.specs.site_area);
    case 'specs.building_area':
      return hasMeaningfulValue(result.specs.building_area);
    case 'specs.parking_total':
      return hasMeaningfulValue(result.specs.parking_total);
    case 'specs.parking_per_household':
      return hasMeaningfulValue(result.specs.parking_per_household);
    case 'specs.heating_type':
      return !isBlank(result.specs.heating_type);
    case 'timeline.application_start':
      return !isBlank(result.timeline.application_start);
    case 'timeline.application_end':
      return !isBlank(result.timeline.application_end);
    case 'timeline.contract_start':
      return !isBlank(result.timeline.contract_start);
    case 'timeline.contract_end':
      return !isBlank(result.timeline.contract_end);
    case 'facilities':
      return result.facilities.length > 0;
    case 'unit_types.rooms':
      return result.unit_types.some((unit) => unit.rooms !== null);
    case 'unit_types.bathrooms':
      return result.unit_types.some((unit) => unit.bathrooms !== null);
    default:
      return false;
  }
}

function pickWebSourceForFieldPath(
  fieldPath: string,
  webResults: WebSearchResultItem[],
): WebSearchResultItem | null {
  const keywords = WEB_FIELD_KEYWORDS[fieldPath] ?? [];
  if (keywords.length === 0) return webResults[0] ?? null;

  for (const result of webResults) {
    const haystack = `${result.query} ${result.title} ${result.snippet}`.toLowerCase();
    if (keywords.some((keyword) => haystack.includes(keyword.toLowerCase()))) {
      return result;
    }
  }
  return webResults[0] ?? null;
}

function buildFallbackWebEvidence(input: {
  missingFieldPaths: string[];
  extractionResult: PropertyExtractionData;
  webResults: WebSearchResultItem[];
}): WebEvidenceItem[] {
  const { missingFieldPaths, extractionResult, webResults } = input;
  if (missingFieldPaths.length === 0 || webResults.length === 0) return [];

  const evidence: WebEvidenceItem[] = [];
  for (const fieldPath of missingFieldPaths) {
    if (!hasValueForFieldPath(extractionResult, fieldPath)) continue;
    const source = pickWebSourceForFieldPath(fieldPath, webResults);
    if (!source || isBlank(source.url)) continue;

    evidence.push({
      field_path: fieldPath,
      source_url: source.url,
      source_snippet: !isBlank(source.snippet) ? source.snippet : source.title,
      confidence: 0.6,
    });
  }

  return normalizeWebEvidence(
    Array.from(new Map(evidence.map((item) => [item.field_path, item])).values()),
  );
}

export async function POST(req: Request) {
  let tempKeysToCleanup: string[] = [];
  let cleanupTempKeys = false;
  try {
    console.info("extract-pdf env check", {
      vercelEnv: process.env.VERCEL_ENV ?? null,
      nodeEnv: process.env.NODE_ENV ?? null,
      hasGoogleKey: Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY),
    });

    const contentType = req.headers.get('content-type') || '';
    const inputFiles: ExtractInputFile[] = [];
    let textOnly = false;

    if (contentType.includes('multipart/form-data')) {
      const contentLength = req.headers.get('content-length');
      if (contentLength) {
        const bodyBytes = Number.parseInt(contentLength, 10);
        if (Number.isFinite(bodyBytes) && bodyBytes > MAX_TOTAL_SIZE + MAX_MULTIPART_OVERHEAD) {
          return Response.json(
            { error: `PDF 합산 용량이 150MB를 초과합니다. (${(bodyBytes / 1024 / 1024).toFixed(1)}MB)` },
            { status: 400 }
          );
        }
      }

      const formData = await req.formData();
      const files = formData
        .getAll('files')
        .filter((entry): entry is File => entry instanceof File);
      textOnly = formData.get('textOnly') === 'true';

      if (files.length === 0) {
        return Response.json({ error: '파일이 없습니다.' }, { status: 400 });
      }

      const nonPdf = files.find(
        (f) => f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf'),
      );
      if (nonPdf) {
        return Response.json({ error: `PDF 파일만 업로드 가능합니다: ${nonPdf.name}` }, { status: 400 });
      }

      const totalSize = files.reduce((sum, f) => sum + f.size, 0);
      if (totalSize > MAX_TOTAL_SIZE) {
        return Response.json(
          { error: `PDF 합산 용량이 150MB를 초과합니다. (${(totalSize / 1024 / 1024).toFixed(1)}MB)` },
          { status: 400 }
        );
      }

      for (const file of files) {
        inputFiles.push({
          fileName: file.name,
          sizeBytes: file.size,
          buffer: Buffer.from(await file.arrayBuffer()),
        });
      }
    } else {
      const body = (await req.json()) as ExtractPdfJsonBody;
      const fileKeys = parseFileKeys(body.fileKeys);
      textOnly = body.textOnly === true;
      cleanupTempKeys = body.cleanupTempKeys !== false;

      if (fileKeys.length === 0) {
        return Response.json({ error: 'fileKeys가 비어 있습니다.' }, { status: 400 });
      }

      const supabase = await createSupabaseServer();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return Response.json({ error: '로그인이 필요합니다.' }, { status: 401 });
      }

      const uniqueKeys = Array.from(new Set(fileKeys));
      tempKeysToCleanup = cleanupTempKeys ? uniqueKeys : [];
      let totalSize = 0;

      for (const key of uniqueKeys) {
        if (!key.startsWith(`pdf-temp/${user.id}/`)) {
          return Response.json({ error: '허용되지 않은 파일 키입니다.' }, { status: 403 });
        }

        const object = await r2.send(
          new GetObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: key,
          }),
        );
        const buffer = await streamToBuffer(object.Body);
        totalSize += buffer.length;
        if (totalSize > MAX_TOTAL_SIZE) {
          return Response.json(
            { error: `PDF 합산 용량이 150MB를 초과합니다. (${(totalSize / 1024 / 1024).toFixed(1)}MB)` },
            { status: 400 }
          );
        }

        inputFiles.push({
          fileName: keyToFileName(key),
          sizeBytes: buffer.length,
          buffer,
        });
      }
    }

    const textParts: string[] = [];
    const parsedDocuments: ParsedDocument[] = [];
    const allImages: AnalyzedImage[] = [];
    const tableSupplementImages: AnalyzedImage[] = [];
    const filesMeta: FileProcessMeta[] = [];
    const combinedStats = {
      totalPages: 0,
      imagesFound: 0,
      imagesExtracted: 0,
      imagesFailed: 0,
      renderFallbackUsed: false,
    };

    for (const file of inputFiles) {
      const buffer = file.buffer;
      const fileMeta: FileProcessMeta = {
        fileName: file.fileName,
        sizeBytes: file.sizeBytes,
        pages: null,
        textLength: 0,
        textExtracted: false,
        extractedImageCount: 0,
        renderedImageCount: 0,
      };

      if (buffer.length < 5 || buffer.subarray(0, 5).toString('ascii') !== '%PDF-') {
        return Response.json(
          { error: `유효한 PDF 파일이 아닙니다: ${file.fileName}` },
          { status: 400 }
        );
      }

      // 텍스트 추출
      const parsed = await pdfParse(buffer);
      fileMeta.pages = Number.isFinite(parsed.numpages) ? parsed.numpages : null;
      const parsedText = parsed.text?.trim() ?? '';
      fileMeta.textLength = parsedText.length;
      const detected = detectDocumentType(file.fileName, parsedText);
      parsedDocuments.push({
        fileName: file.fileName,
        pages: fileMeta.pages,
        text: parsedText,
        textLength: parsedText.length,
        documentType: detected.documentType,
        keywordHits: detected.keywordHits,
      });
      if (parsedText) {
        fileMeta.textExtracted = true;
        textParts.push(`=== [${file.fileName}] ===\n${parsedText}`);
      }

      // 이미지 추출 (textOnly 모드일 때 스킵)
      if (!textOnly) {
        try {
          const { images, stats } = await extractImagesFromPDF(buffer);

          combinedStats.totalPages += stats.totalPages;
          combinedStats.imagesFound += stats.imagesFound;
          combinedStats.imagesExtracted += stats.imagesExtracted;
          combinedStats.imagesFailed += stats.imagesFailed;
          combinedStats.renderFallbackUsed = combinedStats.renderFallbackUsed || stats.renderFallbackUsed;

          for (let i = 0; i < images.length; i++) {
            const base64 = convertImageToBase64(images[i].buffer, images[i].format);
            allImages.push({
              base64,
              fileName: file.fileName,
              index: i,
              source: 'extract',
              pageNum: null,
            });
            fileMeta.extractedImageCount += 1;
          }
        } catch (error) {
          console.warn(`${file.fileName}에서 이미지 추출 실패:`, error);
        }

        // 페이지 렌더링 (벡터 평면도 캡처용)
        try {
          const renderedPages = await renderPagesAsImages(buffer);
          for (const renderedPage of renderedPages) {
            allImages.push({
              base64: renderedPage.dataUrl,
              fileName: file.fileName,
              index: renderedPage.pageNum,
              source: 'render',
              pageNum: renderedPage.pageNum,
            });
            fileMeta.renderedImageCount += 1;
          }
        } catch (error) {
          console.warn(`${file.fileName}에서 페이지 렌더링 실패:`, error);
        }
      } else if (tableSupplementImages.length < MAX_TABLE_SUPPLEMENT_IMAGES) {
        try {
          const renderedPages = await renderPagesAsImages(buffer);
          const remaining = Math.max(
            0,
            MAX_TABLE_SUPPLEMENT_IMAGES - tableSupplementImages.length,
          );
          renderedPages.slice(0, remaining).forEach((renderedPage) => {
            tableSupplementImages.push({
              base64: renderedPage.dataUrl,
              fileName: file.fileName,
              index: renderedPage.pageNum,
              source: 'render',
              pageNum: renderedPage.pageNum,
            });
          });
        } catch (error) {
          console.warn(`${file.fileName}에서 표 보강용 렌더링 실패:`, error);
        }
      }

      filesMeta.push(fileMeta);
    }

    if (textParts.length === 0 && allImages.length === 0 && tableSupplementImages.length === 0) {
      return Response.json(
        { error: 'PDF에서 텍스트/이미지를 추출하지 못했습니다. 파일 형식을 확인해주세요.' },
        { status: 400 }
      );
    }

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return Response.json(
        { error: 'GOOGLE_GENERATIVE_AI_API_KEY 환경변수가 설정되지 않았습니다.' },
        { status: 500 }
      );
    }

    const rawText = textParts.join('\n\n');
    const {
      extractedText,
      truncated,
      documentProfiles,
    } = buildExtractionText(parsedDocuments);
    const extractionMode = parsedDocuments.length > 1 ? 'multi' : 'single';

    // ── Phase 1: 텍스트 + 우선순위 이미지로 속성 데이터 추출 (분류 없음) ──
    const phase1Content: Array<
      | { type: 'text'; text: string }
      | { type: 'image'; image: string }
    > = [
      {
        type: 'text',
        text:
          (extractionMode === 'single'
            ? `다음은 단일 PDF에서 추출한 정보다. 문서 내부 텍스트/표/이미지를 최대한 활용해 정형 데이터를 추출하라.\n\n`
            : `다음은 동일 분양 현장의 PDF ${inputFiles.length}개(문서 유형 혼합)에서 추출한 정보다. ` +
              `문서별 신뢰 우선순위를 반영하여 하나의 정형 데이터로 통합하라.\n\n`) +
          extractedText,
      },
    ];

    // 데이터 추출 참고용 이미지: 렌더 페이지(표/본문 포함) 우선 + 임베디드 이미지 일부
    const phase1Images = selectPhase1Images(allImages, documentProfiles);
    for (const image of phase1Images) {
      phase1Content.push({
        type: 'image',
        image: image.base64,
      });
    }

    const { object: firstPassResult } = await generateObject({
      model: google('gemini-2.5-flash'),
      schema: propertyExtractionSchema,
      system: systemPrompt,
      messages: [{ role: 'user', content: phase1Content }],
    });

    let extractionResult: PropertyExtractionData = {
      ...firstPassResult,
      web_evidence: normalizeWebEvidence(firstPassResult.web_evidence),
    };
    extractionResult = applyDeterministicTextEnrichment(extractionResult, rawText);
    let webEnrichmentAttempted = false;
    let webEnrichmentApplied = false;
    let webSearchResultCount = 0;
    let webQueriesUsed: string[] = [];

    const normalizedDeveloper = normalizeMergeKey(extractionResult.specs.developer);
    const normalizedBuilder = normalizeMergeKey(extractionResult.specs.builder);
    const normalizedTrustCompany = normalizeMergeKey(extractionResult.specs.trust_company);
    const companyRescueNeeded =
      isBlank(extractionResult.specs.developer) ||
      isBlank(extractionResult.specs.builder) ||
      (normalizedDeveloper.length > 0 && normalizedDeveloper === normalizedTrustCompany) ||
      (normalizedDeveloper.length > 0 && normalizedDeveloper === normalizedBuilder);
    if (companyRescueNeeded) {
      const companyRescueImages = selectCompanyRescueImages(allImages, documentProfiles);
      const companyRescueContent: Array<
        | { type: 'text'; text: string }
        | { type: 'image'; image: string }
      > = [
        {
          type: 'text',
          text:
            (extractionMode === 'single'
              ? `아래 단일 문서에서 "사업주체(시행사)"와 "시공사(시공자)"의 회사명만 추출하라.\n`
              : `아래 분양 관련 문서 묶음에서 "사업주체(시행사)"와 "시공사(시공자)"의 회사명만 추출하라.\n`) +
            `- 표(테이블) 구조가 있으면 반드시 "회사명/상호" 행을 우선으로 판독하라.\n` +
            `- 주소, 법인등록번호, 전화번호, 기타 설명 문구는 절대 회사명으로 반환하지 마라.\n` +
            `- 회사명은 원문 표기(예: "주식회사 엘앤피개발", "효성중공업 주식회사")를 유지하라.\n\n` +
            `[document_text]\n${extractedText}`,
        },
      ];

      for (const image of companyRescueImages) {
        companyRescueContent.push({
          type: 'image',
          image: image.base64,
        });
      }

      try {
        const { object: companyInfo } = await generateObject({
          model: google('gemini-2.5-flash'),
          schema: companyInfoSchema,
          system:
            '너는 분양 문서 표 판독 전문가다. developer는 사업주체/시행사 회사명, builder는 시공사 회사명만 반환하라.',
          messages: [{ role: 'user', content: companyRescueContent }],
        });

        const developerCandidate = sanitizeCompanyNameCandidate(companyInfo.developer);
        const builderCandidate = sanitizeCompanyNameCandidate(companyInfo.builder);
        if (isBlank(extractionResult.specs.developer) && developerCandidate) {
          extractionResult.specs.developer = developerCandidate;
        }
        if (isBlank(extractionResult.specs.builder) && builderCandidate) {
          extractionResult.specs.builder = builderCandidate;
        }
      } catch (error) {
        console.warn('시행사/시공사 표 보강 추출 실패 - 1차 결과를 유지합니다:', error);
      }

      extractionResult = applyDeterministicTextEnrichment(extractionResult, rawText);
    }

    // ── 표 전용 보강: specs 그룹 (Gemini Vision) ──
    const tableCandidateImages = (textOnly ? tableSupplementImages : phase1Images).slice(
      0,
      MAX_TABLE_SUPPLEMENT_IMAGES,
    );
    if (hasMissingTableSpecFields(extractionResult) && tableCandidateImages.length > 0) {
      const tableSupplementContent: Array<
        | { type: 'text'; text: string }
        | { type: 'image'; image: string }
      > = [
        {
          type: 'text',
          text:
            `다음 이미지/문서에서 표를 읽어 specs 필드를 추출하라: 대지면적(site_area), 건축면적(building_area), 용적률(floor_area_ratio), 건폐율(building_coverage_ratio), 총주차대수(parking_total), 세대당주차(parking_per_household), 난방방식(heating_type).\n` +
            `규칙:\n` +
            `- 표/본문에서 명확히 확인되는 숫자만 반환하고, 불명확하면 null.\n` +
            `- 면적은 m2 기준 숫자, 비율은 % 숫자만 반환(단위 기호는 제외).\n` +
            `- 추측 금지.\n\n` +
            `[document_text]\n${extractedText}\n\n` +
            `[current_specs]\n${JSON.stringify(extractionResult.specs)}`,
        },
      ];
      for (const image of tableCandidateImages) {
        tableSupplementContent.push({
          type: 'image',
          image: image.base64,
        });
      }

      try {
        const { object: tableSupplement } = await generateObject({
          model: google('gemini-2.5-flash'),
          schema: specTableSupplementSchema,
          system: '너는 분양 공고문 표 판독 전문가다. 주어진 specs 필드만 정확히 추출하라.',
          messages: [{ role: 'user', content: tableSupplementContent }],
        });
        extractionResult = applyTableSpecSupplement(extractionResult, tableSupplement);
      } catch (error) {
        console.warn('표 전용 보강 추출 실패 - 기존 결과 유지:', error);
      }
    }

    // ── 표 전용 보강: timeline 그룹 (Gemini Vision) ──
    if (hasMissingTimelineTableFields(extractionResult) && tableCandidateImages.length > 0) {
      const timelineSupplementContent: Array<
        | { type: 'text'; text: string }
        | { type: 'image'; image: string }
      > = [
        {
          type: 'text',
          text:
            `다음 이미지/문서에서 일정 표를 읽어 timeline 필드를 추출하라: announcement_date, application_start, application_end, winner_announce, contract_start, contract_end.\n` +
            `규칙:\n` +
            `- 날짜 형식은 반드시 YYYY-MM-DD.\n` +
            `- 불명확하면 null.\n` +
            `- 추측 금지.\n\n` +
            `[document_text]\n${extractedText}\n\n` +
            `[current_timeline]\n${JSON.stringify(extractionResult.timeline)}`,
        },
      ];
      for (const image of tableCandidateImages) {
        timelineSupplementContent.push({
          type: 'image',
          image: image.base64,
        });
      }

      try {
        const { object: timelineSupplement } = await generateObject({
          model: google('gemini-2.5-flash'),
          schema: timelineTableSupplementSchema,
          system: '너는 분양 공고문 일정 표 판독 전문가다. 지정된 timeline 필드만 YYYY-MM-DD로 반환하라.',
          messages: [{ role: 'user', content: timelineSupplementContent }],
        });
        extractionResult = applyTimelineTableSupplement(extractionResult, timelineSupplement);
      } catch (error) {
        console.warn('timeline 표 보강 추출 실패 - 기존 결과 유지:', error);
      }
    }

    // ── 표 전용 보강: validation 그룹 (Gemini Vision) ──
    if (hasMissingValidationTableFields(extractionResult) && tableCandidateImages.length > 0) {
      const validationSupplementContent: Array<
        | { type: 'text'; text: string }
        | { type: 'image'; image: string }
      > = [
        {
          type: 'text',
          text:
            `다음 이미지/문서에서 검증 관련 값을 추출하라: contract_ratio(0~1), transfer_restriction(boolean), transfer_restriction_period(string).\n` +
            `규칙:\n` +
            `- contract_ratio는 10%면 0.1로 반환.\n` +
            `- 전매제한이 없으면 transfer_restriction=false, period='없음'.\n` +
            `- 전매제한 기간이 확인되면 transfer_restriction=true.\n` +
            `- 불명확하면 null.\n\n` +
            `[document_text]\n${extractedText}\n\n` +
            `[current_validation]\n${JSON.stringify(extractionResult.validation)}`,
        },
      ];
      for (const image of tableCandidateImages) {
        validationSupplementContent.push({
          type: 'image',
          image: image.base64,
        });
      }

      try {
        const { object: validationSupplement } = await generateObject({
          model: google('gemini-2.5-flash'),
          schema: validationTableSupplementSchema,
          system: '너는 분양 공고문 표 판독 전문가다. 지정된 validation 필드만 정확히 반환하라.',
          messages: [{ role: 'user', content: validationSupplementContent }],
        });
        extractionResult = applyValidationTableSupplement(
          extractionResult,
          validationSupplement,
        );
      } catch (error) {
        console.warn('validation 표 보강 추출 실패 - 기존 결과 유지:', error);
      }
    }

    // ── 표 전용 보강: unit 그룹(방/욕실) (Gemini Vision) ──
    if (hasMissingUnitTableFields(extractionResult) && tableCandidateImages.length > 0) {
      const unitSupplementContent: Array<
        | { type: 'text'; text: string }
        | { type: 'image'; image: string }
      > = [
        {
          type: 'text',
          text:
            `다음 이미지/문서에서 주택형별 방/욕실 수를 추출하라.\n` +
            `반환 형식은 unit_types 배열이며 각 원소는 type_name, rooms, bathrooms만 포함하라.\n` +
            `규칙:\n` +
            `- type_name은 현재 타입명과 동일하게 맞춰라(예: 84A, 84B).\n` +
            `- 불명확하면 null.\n\n` +
            `[document_text]\n${extractedText}\n\n` +
            `[current_unit_types]\n${JSON.stringify(
              extractionResult.unit_types.map((unit) => ({
                type_name: unit.type_name,
                rooms: unit.rooms,
                bathrooms: unit.bathrooms,
              })),
            )}`,
        },
      ];
      for (const image of tableCandidateImages) {
        unitSupplementContent.push({
          type: 'image',
          image: image.base64,
        });
      }

      try {
        const { object: unitSupplement } = await generateObject({
          model: google('gemini-2.5-flash'),
          schema: unitTableSupplementSchema,
          system: '너는 분양 공고문 표 판독 전문가다. 타입별 방/욕실 수만 정확히 반환하라.',
          messages: [{ role: 'user', content: unitSupplementContent }],
        });
        extractionResult = applyUnitTableSupplement(extractionResult, unitSupplement);
      } catch (error) {
        console.warn('unit 표 보강 추출 실패 - 기존 결과 유지:', error);
      }
    }

    const missingFieldPaths = collectMissingFieldPaths(extractionResult);
    const preWebEnrichmentResult = cloneExtractionResult(extractionResult);
    const needsWebEnrichment = missingFieldPaths.length > 0;
    const webSearchEnabled = Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY);

    if (needsWebEnrichment && webSearchEnabled) {
      webEnrichmentAttempted = true;
      webQueriesUsed = buildWebQueries(extractionResult, missingFieldPaths);
      const webResults = await searchWebContext(webQueriesUsed);
      webSearchResultCount = webResults.length;
      const webContextText = buildWebContextText(webResults);
      const requiredEvidencePathsText = missingFieldPaths.join(', ');

      if (webContextText.length > 0) {
        const refinementContent: Array<
          | { type: 'text'; text: string }
          | { type: 'image'; image: string }
        > = [
          {
            type: 'text',
            text:
              `다음은 1차 문서 추출 결과다. 문서 근거를 우선 유지하고, 문서에 없거나 불명확한 값만 web_context로 보완하라.\n\n` +
              `[first_pass_json]\n${JSON.stringify(extractionResult)}\n\n` +
              `[required_web_evidence_field_paths]\n${requiredEvidencePathsText}\n\n` +
              `${webContextText}\n\n` +
              `반드시 지켜라:\n` +
              `1) required_web_evidence_field_paths에 포함된 필드를 web_context로 채웠다면, 같은 field_path로 web_evidence를 반드시 1건 이상 기록하라.\n` +
              `2) web_context를 사용하지 않은 필드는 web_evidence에 넣지 마라.\n` +
              `3) 근거 URL이 불명확하면 값을 채우지 말고 null을 유지하라.\n\n` +
              `[document_text]\n${extractedText}`,
          },
        ];

        for (const image of phase1Images) {
          refinementContent.push({
            type: 'image',
            image: image.base64,
          });
        }

        try {
          const { object: refinedResult } = await generateObject({
            model: google('gemini-2.5-flash'),
            schema: propertyExtractionSchema,
            system: systemPrompt,
            messages: [{ role: 'user', content: refinementContent }],
          });
          const normalizedRefinedResult: PropertyExtractionData = {
            ...refinedResult,
            web_evidence: normalizeWebEvidence(refinedResult.web_evidence),
          };
          extractionResult = mergeExtractionResultPreferBase(
            extractionResult,
            normalizedRefinedResult,
          );
          extractionResult = applyDeterministicTextEnrichment(extractionResult, rawText);
          if (extractionResult.web_evidence.length === 0) {
            extractionResult.web_evidence = buildFallbackWebEvidence({
              missingFieldPaths,
              extractionResult,
              webResults,
            });
          }
          extractionResult.web_evidence = filterAcceptedWebEvidence(extractionResult.web_evidence);

          const acceptedFieldPaths = new Set(
            extractionResult.web_evidence.map((item) => normalizeEvidenceFieldPath(item.field_path)),
          );
          for (const fieldPath of missingFieldPaths) {
            const beforeValue = getFieldValueByPath(preWebEnrichmentResult, fieldPath);
            const afterValue = getFieldValueByPath(extractionResult, fieldPath);
            if (hasMeaningfulValue(beforeValue)) continue;
            if (!hasMeaningfulValue(afterValue)) continue;
            if (acceptedFieldPaths.has(normalizeEvidenceFieldPath(fieldPath))) continue;
            restoreFieldValueByPath(extractionResult, preWebEnrichmentResult, fieldPath);
          }

          webEnrichmentApplied = extractionResult.web_evidence.length > 0;
        } catch (error) {
          console.warn('웹 보완 재추출 실패 - 1차 결과를 사용합니다:', error);
        }
      }
    }

    // ── Phase 2: 이미지 분류 (이미지만, 간단한 스키마) ──
    let classificationResult: { classifications: Array<{ imageIndex: number; type: 'building' | 'floor_plan' | 'other' }> } | null = null;
    let phase2ImageLimit = 0;
    let classificationFailed = false;

    if (allImages.length > 0) {
      // 더 많은 이미지를 분류해야 건물/평면도를 찾을 확률이 높음
      phase2ImageLimit = Math.min(allImages.length, MAX_PHASE2_CLASSIFICATION_IMAGES);

      const phase2Content: Array<
        | { type: 'text'; text: string }
        | { type: 'image'; image: string }
      > = [
        {
          type: 'text',
          text: `총 ${phase2ImageLimit}개의 이미지가 첨부되어 있다. imageIndex는 0부터 ${phase2ImageLimit - 1}까지만 분류하라. 그 외 인덱스는 절대 포함하지 마라.`,
        },
      ];

      for (let i = 0; i < phase2ImageLimit; i++) {
        phase2Content.push({
          type: 'image',
          image: allImages[i].base64,
        });
      }

      try {
        const { object: classResult } = await generateObject({
          model: google('gemini-2.5-flash'),
          schema: imageClassificationResultSchema,
          system: '첨부된 이미지를 분류하라. building: 건물 외관 렌더링, 조감도, 실사 사진, 투시도, 야경. floor_plan: 평면도, 단위세대 도면, 층별 배치도. other: 로고, 지도, 위치도, 표, 다이어그램, 장식 이미지.',
          messages: [{ role: 'user', content: phase2Content }],
        });
        classificationResult = classResult;
      } catch (error) {
        classificationFailed = true;
        console.warn('이미지 분류(Phase2) 실패 - 텍스트 추출 결과만 반환합니다:', error);
      }
    }

    // ── 카카오 주소 보완 ──
    const geoResult = await resolveLocationAddresses({
      road_address: extractionResult.location?.road_address,
      jibun_address: extractionResult.location?.jibun_address,
    });

    const location = {
      ...extractionResult.location,
      road_address: extractionResult.location?.road_address || geoResult?.road_address || null,
      jibun_address: extractionResult.location?.jibun_address || geoResult?.jibun_address || null,
      lat: geoResult?.lat ?? null,
      lng: geoResult?.lng ?? null,
      region_1depth: extractionResult.location?.region_1depth || geoResult?.region_1depth || null,
      region_2depth: extractionResult.location?.region_2depth || geoResult?.region_2depth || null,
      region_3depth: extractionResult.location?.region_3depth || geoResult?.region_3depth || null,
    };

    // 시설 주소 지오코딩
    const facilitiesWithGeo = await Promise.all(
      (extractionResult.facilities || []).map(async (facility) => {
        if (!facility.road_address) return facility;
        const splitAddress = splitRoadAddressAndDetail(facility.road_address);
        const geocodeQuery = splitAddress.roadAddress ?? facility.road_address;
        const facilityGeo = await geocodeAddress(geocodeQuery);
        return {
          ...facility,
          address_detail: facility.address_detail ?? splitAddress.addressDetail,
          road_address: splitAddress.roadAddress ?? facility.road_address,
          lat: facilityGeo?.lat ?? null,
          lng: facilityGeo?.lng ?? null,
        };
      })
    );

    const classifications = classificationResult?.classifications || [];
    extractionResult.web_evidence = normalizeWebEvidence(
      extractionResult.web_evidence.filter(
        (item) => normalizeEvidenceFieldPath(item.field_path) !== 'specs.land_use_zone',
      ),
    );

    // non-other 이미지 → 메인 표시용
    const classifiedImages = classifications
      .filter(c => c.type !== 'other' && c.imageIndex >= 0 && c.imageIndex < phase2ImageLimit)
      .map((c, i) => ({
        id: `img-${i}`,
        base64: allImages[c.imageIndex].base64,
        source: allImages[c.imageIndex].fileName,
        aiType: c.type as 'building' | 'floor_plan',
      }));

    // 분류 실패/누락 시 UI가 빈 상태가 되지 않도록 fallback 이미지 노출
    const fallbackLimit = Math.min(
      allImages.length,
      phase2ImageLimit || allImages.length,
      MAX_CLASSIFICATION_FALLBACK_IMAGES
    );
    const fallbackImages = Array.from({ length: fallbackLimit }, (_, i) => ({
      id: `fallback-img-${i}`,
      base64: allImages[i].base64,
      source: allImages[i].fileName,
      aiType: 'building' as const,
    }));
    const usedClassificationFallback = classifiedImages.length === 0 && fallbackImages.length > 0;
    const extractedImages = usedClassificationFallback ? fallbackImages : classifiedImages;

    return Response.json({
      responseVersion: 1,
      ...extractionResult,
      location,
      facilities: facilitiesWithGeo,
      _meta: {
        fileCount: inputFiles.length,
        textLength: rawText.length,
        imageCount: allImages.length,
        imageStats: combinedStats,
        filesMeta,
        classificationFailed,
        classificationFallbackUsed: usedClassificationFallback,
        webEnrichmentAttempted,
        webEnrichmentApplied,
        webSearchEnabled,
        webQueriesUsed,
        webSearchResultCount,
        textOnlyRequested: textOnly,
        truncated,
        extractionMode,
        mixedDocumentMode: true,
        documentProfiles,
        geocoded: geoResult !== null,
      },
      extractedImages,
    });
  } catch (error: unknown) {
    const resolved = toApiError(error);
    const code = extractErrorCode(error);
    console.error('AI Extraction Error:', {
      code: code || null,
      message: error instanceof Error ? error.message : String(error),
      error,
    });
    return Response.json({ error: resolved.error }, { status: resolved.status });
  } finally {
    if (cleanupTempKeys && tempKeysToCleanup.length > 0) {
      await Promise.allSettled(
        tempKeysToCleanup.map(async (key) => {
          try {
            await r2.send(
              new DeleteObjectCommand({
                Bucket: R2_BUCKET_NAME,
                Key: key,
              }),
            );
          } catch (error) {
            console.warn(`임시 PDF 삭제 실패: ${key}`, error);
          }
        }),
      );
    }
  }
}

export async function GET() {
  return Response.json({ status: 'extract-pdf API 정상 동작 중' });
}
