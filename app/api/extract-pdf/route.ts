import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { propertyExtractionSchema } from '@/lib/schema/property-schema';

export const runtime = 'nodejs';
export const maxDuration = 60;

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse');

const MAX_TEXT_LENGTH = 30000;

const systemPrompt = `너는 대한민국 아파트/오피스텔 분양 사업개요(모집공고문) PDF에서 정형 데이터를 추출하는 전문가다.

## 규칙
1. PDF 텍스트에 명시된 값만 추출하라. 추측 금지.
2. 찾을 수 없는 값은 반드시 null로 반환하라.
3. 숫자는 반드시 숫자 타입으로 반환하라 (문자열 금지).
4. 면적은 m2(제곱미터) 단위 숫자로 통일하라.
5. 분양가는 만원 단위 숫자로 반환하라. (예: 5억 3천만원 → 53000)
6. 날짜는 YYYY-MM-DD 형식으로 반환하라. (예: 2025.03.15 → 2025-03-15)
7. 입주 예정일(move_in_date)은 정확한 날짜가 없으면 텍스트 그대로 반환하라. (예: "2027년 3월 예정")

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
- specs.land_use_zone: 용도지역 (예: 제3종일반주거지역)
- timeline: 모집공고일, 청약접수 시작/마감, 당첨자발표, 계약 시작/종료, 입주 예정
- unit_types: 주택형(타입)별 면적, 세대수, 분양가 (최소~최대를 만원 단위로)
- facilities: 모델하우스/홍보관/견본주택 정보 (유형, 명칭, 주소, 운영시간)`;

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

type GeoAddressResult = {
  lat: number;
  lng: number;
  road_address: string | null;
  jibun_address: string | null;
  region_1depth: string | null;
  region_2depth: string | null;
  region_3depth: string | null;
};

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
    return {
      lat: parseFloat(doc.y),
      lng: parseFloat(doc.x),
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

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const files = formData.getAll('files') as File[];

    if (files.length === 0) {
      return Response.json({ error: '파일이 없습니다.' }, { status: 400 });
    }

    const nonPdf = files.find((f) => f.type !== 'application/pdf');
    if (nonPdf) {
      return Response.json({ error: `PDF 파일만 업로드 가능합니다: ${nonPdf.name}` }, { status: 400 });
    }

    const textParts: string[] = [];
    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const parsed = await pdfParse(buffer);
      if (parsed.text?.trim()) {
        textParts.push(`=== [${file.name}] ===\n${parsed.text}`);
      }
    }

    if (textParts.length === 0) {
      return Response.json(
        { error: 'PDF에서 텍스트를 추출하지 못했습니다. 스캔된 이미지 PDF는 지원하지 않습니다.' },
        { status: 400 }
      );
    }

    const rawText = textParts.join('\n\n');
    const truncated = rawText.length > MAX_TEXT_LENGTH;
    const extractedText = truncated
      ? rawText.slice(0, MAX_TEXT_LENGTH) + '\n\n[... 텍스트가 길어서 일부만 분석합니다]'
      : rawText;

    const { object } = await generateObject({
      model: google('gemini-2.5-flash-lite'),
      schema: propertyExtractionSchema,
      system: systemPrompt,
      prompt: `다음은 동일 분양 현장의 PDF ${files.length}개에서 추출한 텍스트다. 모든 문서의 정보를 종합하여 하나의 정형 데이터로 변환하라.\n\n${extractedText}`,
    });

    // 카카오 주소 보완:
    // - 도로명만 있으면 지번 보완
    // - 지번만 있으면 도로명 보완
    const geoResult = await resolveLocationAddresses({
      road_address: object.location?.road_address,
      jibun_address: object.location?.jibun_address,
    });

    const location = {
      ...object.location,
      road_address: object.location?.road_address || geoResult?.road_address || null,
      jibun_address: object.location?.jibun_address || geoResult?.jibun_address || null,
      lat: geoResult?.lat ?? null,
      lng: geoResult?.lng ?? null,
      // 지오코딩 결과로 region 정보 보완 (AI가 못 찾은 경우)
      region_1depth: object.location?.region_1depth || geoResult?.region_1depth || null,
      region_2depth: object.location?.region_2depth || geoResult?.region_2depth || null,
      region_3depth: object.location?.region_3depth || geoResult?.region_3depth || null,
    };

    return Response.json({
      ...object,
      location,
      _meta: {
        fileCount: files.length,
        textLength: rawText.length,
        truncated,
        geocoded: geoResult !== null,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '분석 중 오류 발생';
    const koreanMessage = toKoreanErrorMessage(message);
    const status = toHttpStatus(message);
    console.error('AI Extraction Error:', error);
    return Response.json({ error: koreanMessage }, { status });
  }
}

export async function GET() {
  return Response.json({ status: 'extract-pdf API 정상 동작 중' });
}
