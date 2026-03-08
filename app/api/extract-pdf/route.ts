import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
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

const MAX_TEXT_LENGTH = 30000;
const MAX_TOTAL_SIZE = 150 * 1024 * 1024; // 150MB
const MAX_MULTIPART_OVERHEAD = 5 * 1024 * 1024; // 5MB
const MAX_PHASE2_CLASSIFICATION_IMAGES = 100;
const MAX_CLASSIFICATION_FALLBACK_IMAGES = 20;
const MAX_WEB_QUERIES = 4;
const MAX_WEB_RESULTS_PER_QUERY = 3;
const MAX_WEB_CONTEXT_CHARS = 6000;
const R2_BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME!;

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  },
});

const systemPrompt = `너는 대한민국 아파트/오피스텔 분양 사업개요(모집공고문) PDF에서 정형 데이터를 추출하는 전문가다.

## 규칙
1. PDF 텍스트와 **이미지 모두**에서 정보를 추출하라.
2. **이미지에서 해석 가능한 정보는 값으로 취급**한다.
   - 평면도 이미지 → 방 개수(rooms), 화장실 개수(bathrooms) 추출
   - 조감도 이미지 → 건물 외관, 층수 참고
   - 위치도/배치도 이미지 → 주변 시설, 동 배치 참고
3. 텍스트에 명시되지 않았더라도 이미지에서 명확히 확인 가능하면 추출하라.

4. 텍스트/이미지에 없거나 불명확한 값은 제공된 web_context(외부 검색 결과)가 있으면 참고해 보완할 수 있다.
5. web_context로 보완한 필드는 web_evidence에 field_path, source_url, source_snippet, confidence(0~1)를 기록하라.
6. 문서 근거와 web_context가 충돌하면 모집공고문(문서) 근거를 우선한다.
7. web_context 근거가 없거나 상충하면 추측하지 말고 null로 반환하라.
8. 숫자는 반드시 숫자 타입으로 반환하라 (문자열 금지).
9. 면적은 m2(제곱미터) 단위 숫자로 통일하라.
10. 분양가는 만원 단위 숫자로 반환하라. (예: 5억 3천만원 → 53000)
11. 날짜는 YYYY-MM-DD 형식으로 반환하라. (예: 2025.03.15 → 2025-03-15)
12. 입주 예정일(move_in_date)은 정확한 날짜가 없으면 텍스트 그대로 반환하라. (예: "2027년 3월 예정")

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
- facilities: 모델하우스/홍보관/견본주택 정보 (유형, 명칭, 주소, 운영시간)
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

function collectMissingFieldHints(result: PropertyExtractionData): string[] {
  const hints: string[] = [];

  if (isBlank(result.specs.developer)) hints.push('시행사');
  if (isBlank(result.specs.builder)) hints.push('시공사');
  if (isBlank(result.specs.trust_company)) hints.push('신탁사');
  if (isBlank(result.specs.land_use_zone)) hints.push('용도지역');
  if (isBlank(result.timeline.announcement_date)) hints.push('모집공고일');
  if (isBlank(result.timeline.application_start) || isBlank(result.timeline.application_end)) hints.push('청약접수 일정');
  if (isBlank(result.timeline.contract_start) || isBlank(result.timeline.contract_end)) hints.push('계약 일정');
  if (result.facilities.length === 0) hints.push('모델하우스 정보');
  if (!result.unit_types.some((unit) => unit.rooms !== null || unit.bathrooms !== null)) hints.push('방수/욕실수');

  return Array.from(new Set(hints));
}

function buildWebQueries(result: PropertyExtractionData): string[] {
  const name = result.properties.name?.trim() || '';
  const road = result.location.road_address?.trim() || '';
  const area = [result.location.region_1depth, result.location.region_2depth].filter(Boolean).join(' ');
  const anchor = [name, area || road].filter(Boolean).join(' ');
  const base = anchor || name;
  if (!base) return [];

  const hints = collectMissingFieldHints(result).join(', ');

  const candidates = [
    `${base} 모집공고문`,
    `${base} 분양 시행사 시공사 신탁사`,
    `${base} 청약 일정 계약 일정`,
    `${base} 모델하우스 주소 운영시간`,
    `${base} 평면도 방 욕실`,
    hints ? `${base} ${hints}` : '',
  ];

  return Array.from(new Set(candidates.map((q) => q.trim()).filter((q) => q.length > 0))).slice(0, MAX_WEB_QUERIES);
}

async function searchWithSerper(query: string): Promise<WebSearchResultItem[]> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) return [];

  try {
    const res = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify({
        q: query,
        gl: 'kr',
        hl: 'ko',
        num: MAX_WEB_RESULTS_PER_QUERY,
      }),
    });

    if (!res.ok) return [];

    const json = await res.json() as {
      organic?: Array<{ title?: unknown; link?: unknown; snippet?: unknown; date?: unknown }>;
    };
    const organic = Array.isArray(json.organic) ? json.organic : [];

    return organic
      .map((item) => ({
        query,
        title: typeof item.title === 'string' ? item.title.trim() : '',
        url: typeof item.link === 'string' ? item.link.trim() : '',
        snippet: typeof item.snippet === 'string' ? item.snippet.trim() : '',
        date: typeof item.date === 'string' ? item.date.trim() : null,
      }))
      .filter((item) => item.url.length > 0 && item.title.length > 0)
      .slice(0, MAX_WEB_RESULTS_PER_QUERY);
  } catch (error) {
    console.warn('SERPER 검색 실패:', error);
    return [];
  }
}

async function searchWebContext(queries: string[]): Promise<WebSearchResultItem[]> {
  if (queries.length === 0) return [];
  const results = await Promise.all(queries.map((query) => searchWithSerper(query)));
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
      field_path: typeof item.field_path === 'string' ? item.field_path.trim() : '',
      source_url: typeof item.source_url === 'string' ? item.source_url.trim() : null,
      source_snippet: typeof item.source_snippet === 'string' ? item.source_snippet.trim() : null,
      confidence:
        typeof item.confidence === 'number' && Number.isFinite(item.confidence)
          ? Math.max(0, Math.min(1, item.confidence))
          : null,
    }))
    .filter((item) => item.field_path.length > 0);
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
    const allImages: Array<{ base64: string; fileName: string; index: number; source: 'extract' | 'render' }> = [];
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
            });
            fileMeta.extractedImageCount += 1;
          }
        } catch (error) {
          console.warn(`${file.fileName}에서 이미지 추출 실패:`, error);
        }

        // 페이지 렌더링 (벡터 평면도 캡처용)
        try {
          const renderedDataUrls = await renderPagesAsImages(buffer);
          for (const dataUrl of renderedDataUrls) {
            allImages.push({
              base64: dataUrl,
              fileName: file.fileName,
              index: allImages.length,
              source: 'render',
            });
            fileMeta.renderedImageCount += 1;
          }
        } catch (error) {
          console.warn(`${file.fileName}에서 페이지 렌더링 실패:`, error);
        }
      }

      filesMeta.push(fileMeta);
    }

    if (textParts.length === 0) {
      return Response.json(
        { error: 'PDF에서 텍스트를 추출하지 못했습니다. 스캔된 이미지 PDF는 지원하지 않습니다.' },
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
    const truncated = rawText.length > MAX_TEXT_LENGTH;
    const extractedText = truncated
      ? rawText.slice(0, MAX_TEXT_LENGTH) + '\n\n[... 텍스트가 길어서 일부만 분석합니다]'
      : rawText;

    // ── Phase 1: 텍스트 + 이미지 3장으로 속성 데이터 추출 (분류 없음) ──
    const phase1Content: Array<
      | { type: 'text'; text: string }
      | { type: 'image'; image: string }
    > = [
      {
        type: 'text',
        text: `다음은 동일 분양 현장의 PDF ${inputFiles.length}개에서 추출한 정보다. 텍스트와 이미지를 모두 분석하여 하나의 정형 데이터로 변환하라.\n\n${extractedText}`,
      },
    ];

    // 데이터 추출 참고용 이미지 3장만 첨부 (평면도에서 방/화장실 수 등)
    const phase1ImageLimit = Math.min(allImages.length, 3);
    for (let i = 0; i < phase1ImageLimit; i++) {
      phase1Content.push({
        type: 'image',
        image: allImages[i].base64,
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
    let webEnrichmentAttempted = false;
    let webEnrichmentApplied = false;
    let webSearchResultCount = 0;
    let webQueriesUsed: string[] = [];

    const needsWebEnrichment = collectMissingFieldHints(extractionResult).length > 0;
    const serperEnabled = Boolean(process.env.SERPER_API_KEY);

    if (needsWebEnrichment && serperEnabled) {
      webEnrichmentAttempted = true;
      webQueriesUsed = buildWebQueries(extractionResult);
      const webResults = await searchWebContext(webQueriesUsed);
      webSearchResultCount = webResults.length;
      const webContextText = buildWebContextText(webResults);

      if (webContextText.length > 0) {
        const refinementContent: Array<
          | { type: 'text'; text: string }
          | { type: 'image'; image: string }
        > = [
          {
            type: 'text',
            text:
              `다음은 1차 문서 추출 결과다. 문서 근거를 우선 유지하고, 문서에 없거나 불명확한 값만 web_context로 보완하라.\n\n` +
              `[first_pass_json]\n${JSON.stringify(firstPassResult)}\n\n` +
              `${webContextText}\n\n` +
              `보완 시 반드시 web_evidence에 근거를 기록하고, 근거가 불충분하면 null을 유지하라.\n\n` +
              `[document_text]\n${extractedText}`,
          },
        ];

        for (let i = 0; i < phase1ImageLimit; i++) {
          refinementContent.push({
            type: 'image',
            image: allImages[i].base64,
          });
        }

        try {
          const { object: refinedResult } = await generateObject({
            model: google('gemini-2.5-flash'),
            schema: propertyExtractionSchema,
            system: systemPrompt,
            messages: [{ role: 'user', content: refinementContent }],
          });
          extractionResult = {
            ...refinedResult,
            web_evidence: normalizeWebEvidence(refinedResult.web_evidence),
          };
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
        const facilityGeo = await geocodeAddress(facility.road_address);
        return {
          ...facility,
          lat: facilityGeo?.lat ?? null,
          lng: facilityGeo?.lng ?? null,
        };
      })
    );

    const classifications = classificationResult?.classifications || [];

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
        webSearchEnabled: serperEnabled,
        webQueriesUsed,
        webSearchResultCount,
        truncated,
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
