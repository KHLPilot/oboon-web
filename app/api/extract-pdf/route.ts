import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { propertyExtractionSchema, imageClassificationResultSchema } from '@/lib/schema/property-schema';
import { extractImagesFromPDF, renderPagesAsImages, convertImageToBase64 } from '@/lib/pdf-utils';

export const runtime = 'nodejs';
export const maxDuration = 120;

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse');

const MAX_TEXT_LENGTH = 30000;
const MAX_TOTAL_SIZE = 150 * 1024 * 1024; // 150MB
const MAX_MULTIPART_OVERHEAD = 5 * 1024 * 1024; // 5MB
const MAX_PHASE2_CLASSIFICATION_IMAGES = 100;
const MAX_CLASSIFICATION_FALLBACK_IMAGES = 20;

const systemPrompt = `너는 대한민국 아파트/오피스텔 분양 사업개요(모집공고문) PDF에서 정형 데이터를 추출하는 전문가다.

## 규칙
1. PDF 텍스트와 **이미지 모두**에서 정보를 추출하라.
2. **이미지에서 해석 가능한 정보는 값으로 취급**한다.
   - 평면도 이미지 → 방 개수(rooms), 화장실 개수(bathrooms) 추출
   - 조감도 이미지 → 건물 외관, 층수 참고
   - 위치도/배치도 이미지 → 주변 시설, 동 배치 참고
3. 텍스트에 명시되지 않았더라도 이미지에서 명확히 확인 가능하면 추출하라.

4. 추측은 금지. 이미지/텍스트 모두에 없으면 null.
5. 숫자는 반드시 숫자 타입으로 반환하라 (문자열 금지).
6. 면적은 m2(제곱미터) 단위 숫자로 통일하라.
7. 분양가는 만원 단위 숫자로 반환하라. (예: 5억 3천만원 → 53000)
8. 날짜는 YYYY-MM-DD 형식으로 반환하라. (예: 2025.03.15 → 2025-03-15)
9. 입주 예정일(move_in_date)은 정확한 날짜가 없으면 텍스트 그대로 반환하라. (예: "2027년 3월 예정")

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

export async function POST(req: Request) {
  try {
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
    const files = formData.getAll('files') as File[];
    const textOnly = formData.get('textOnly') === 'true';

    if (files.length === 0) {
      return Response.json({ error: '파일이 없습니다.' }, { status: 400 });
    }

    const nonPdf = files.find((f) => f.type !== 'application/pdf');
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

    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const fileMeta: FileProcessMeta = {
        fileName: file.name,
        sizeBytes: file.size,
        pages: null,
        textLength: 0,
        textExtracted: false,
        extractedImageCount: 0,
        renderedImageCount: 0,
      };

      if (buffer.length < 5 || buffer.subarray(0, 5).toString('ascii') !== '%PDF-') {
        return Response.json(
          { error: `유효한 PDF 파일이 아닙니다: ${file.name}` },
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
        textParts.push(`=== [${file.name}] ===\n${parsedText}`);
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
              fileName: file.name,
              index: i,
              source: 'extract',
            });
            fileMeta.extractedImageCount += 1;
          }
        } catch (error) {
          console.warn(`${file.name}에서 이미지 추출 실패:`, error);
        }

        // 페이지 렌더링 (벡터 평면도 캡처용)
        try {
          const renderedDataUrls = await renderPagesAsImages(buffer);
          for (const dataUrl of renderedDataUrls) {
            allImages.push({
              base64: dataUrl,
              fileName: file.name,
              index: allImages.length,
              source: 'render',
            });
            fileMeta.renderedImageCount += 1;
          }
        } catch (error) {
          console.warn(`${file.name}에서 페이지 렌더링 실패:`, error);
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
        text: `다음은 동일 분양 현장의 PDF ${files.length}개에서 추출한 정보다. 텍스트와 이미지를 모두 분석하여 하나의 정형 데이터로 변환하라.\n\n${extractedText}`,
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

    const { object: extractionResult } = await generateObject({
      model: google('gemini-2.5-flash-lite'),
      schema: propertyExtractionSchema,
      system: systemPrompt,
      messages: [{ role: 'user', content: phase1Content }],
    });

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
        fileCount: files.length,
        textLength: rawText.length,
        imageCount: allImages.length,
        imageStats: combinedStats,
        filesMeta,
        classificationFailed,
        classificationFallbackUsed: usedClassificationFallback,
        truncated,
        geocoded: geoResult !== null,
      },
      extractedImages,
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
